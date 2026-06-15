// SPDX-License-Identifier: MIT
import { tokenize, LexError, type Token } from './tokenize.js';

/** Internal typed parse error. `parse` catches it and returns a failure result; it never escapes. */
export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

export type KeepDropOp = 'kh' | 'kl' | 'dh' | 'dl';

export type DiceModifier =
  | { type: 'keepdrop'; op: KeepDropOp; n: number }
  | { type: 'explode' }
  | { type: 'advantage'; mode: 'adv' | 'dis' };

export interface DiceTerm {
  kind: 'dice';
  sign: 1 | -1;
  count: number;
  sides: number;
  modifier?: DiceModifier;
  /** Source-like notation for this term (used by the formatter / render). */
  notation: string;
}

export interface ConstTerm {
  kind: 'const';
  sign: 1 | -1;
  value: number;
  notation: string;
}

export type Term = DiceTerm | ConstTerm;

export interface Expression {
  terms: Term[];
}

export type ParseResult = { ok: true; expression: Expression } | { ok: false; error: string };

/** Token cursor over the lexed stream. */
class Cursor {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  next(): Token | undefined {
    const t = this.tokens[this.pos];
    this.pos += 1;
    return t;
  }

  atEnd(): boolean {
    return this.pos >= this.tokens.length;
  }
}

function expectNumber(cur: Cursor, what: string): number {
  const t = cur.peek();
  if (!t || t.type !== 'number') {
    throw new ParseError(`expected ${what}.`);
  }
  cur.next();
  return t.value;
}

function parseDiceModifierSuffix(
  cur: Cursor,
  count: number,
  sides: number,
): DiceModifier | undefined {
  const t = cur.peek();
  if (!t) return undefined;

  if (t.type === 'keepdrop') {
    cur.next();
    const n = expectNumber(cur, `a count after "${t.value}"`);
    if (n < 1) {
      throw new ParseError(`keep/drop count must be at least 1.`);
    }
    if (n >= count) {
      throw new ParseError(
        `keep/drop count (${n}) must be fewer than the ${count} dice in the term.`,
      );
    }
    return { type: 'keepdrop', op: t.value, n };
  }

  if (t.type === 'bang') {
    cur.next();
    if (sides <= 1) {
      throw new ParseError('exploding dice need more than 1 side (a d1 would never stop).');
    }
    return { type: 'explode' };
  }

  return undefined;
}

function parseTerm(cur: Cursor, sign: 1 | -1): Term {
  const first = cur.peek();

  // A term begins with either a number (constant or NdM) or a bare 'd' (implicit count 1).
  if (first && first.type === 'd') {
    cur.next();
    const sides = expectNumber(cur, 'the number of sides after "d"');
    const modifier = parseDiceModifierSuffix(cur, 1, sides);
    return {
      kind: 'dice',
      sign,
      count: 1,
      sides,
      modifier,
      notation: `d${sides}`,
    };
  }

  if (!first || first.type !== 'number') {
    throw new ParseError('expected a number or dice term.');
  }
  const lead = first.value;
  cur.next();

  const afterNumber = cur.peek();
  if (afterNumber && afterNumber.type === 'd') {
    cur.next();
    const sides = expectNumber(cur, 'the number of sides after "d"');
    const modifier = parseDiceModifierSuffix(cur, lead, sides);
    const modText = renderModifier(modifier);
    return {
      kind: 'dice',
      sign,
      count: lead,
      sides,
      modifier,
      notation: `${lead}d${sides}${modText}`,
    };
  }

  // Bare integer constant.
  return { kind: 'const', sign, value: lead, notation: String(lead) };
}

function renderModifier(mod: DiceModifier | undefined): string {
  if (!mod) return '';
  if (mod.type === 'explode') return '!';
  if (mod.type === 'keepdrop') return `${mod.op}${mod.n}`;
  return '';
}

/**
 * Parse a dice-notation string into an {@link Expression}. Returns a result object and never throws
 * on malformed input — bad notation becomes `{ ok: false, error }` with a clear message.
 */
export function parse(input: string): ParseResult {
  try {
    let tokens: Token[];
    try {
      tokens = tokenize(input);
    } catch (e) {
      if (e instanceof LexError) {
        throw new ParseError(`invalid notation: ${e.message}.`);
      }
      throw e;
    }

    // Detect a trailing adv/dis keyword (applies to the whole expression, must be a lone 1dM).
    let advMode: 'adv' | 'dis' | undefined;
    const last = tokens[tokens.length - 1];
    if (last && last.type === 'keyword') {
      advMode = last.value;
      tokens = tokens.slice(0, -1);
    }
    // Any keyword not in trailing position is invalid.
    if (tokens.some((t) => t.type === 'keyword')) {
      throw new ParseError('advantage/disadvantage must be the only trailing keyword.');
    }

    if (tokens.length === 0) {
      throw new ParseError('empty notation: enter dice like "2d6+3".');
    }

    const cur = new Cursor(tokens);
    const terms: Term[] = [];

    // First term: an optional leading sign, then a term.
    let sign: 1 | -1 = 1;
    const lead = cur.peek();
    if (lead && (lead.type === 'plus' || lead.type === 'minus')) {
      sign = lead.type === 'minus' ? -1 : 1;
      cur.next();
    }
    terms.push(parseTerm(cur, sign));

    // Subsequent terms: each preceded by + or -.
    while (!cur.atEnd()) {
      const op = cur.next();
      if (!op || (op.type !== 'plus' && op.type !== 'minus')) {
        throw new ParseError('expected "+" or "-" between terms.');
      }
      const nextSign: 1 | -1 = op.type === 'minus' ? -1 : 1;
      if (cur.atEnd()) {
        throw new ParseError('dangling operator: a term must follow "+"/"-".');
      }
      terms.push(parseTerm(cur, nextSign));
    }

    if (advMode) {
      applyAdvantage(terms, advMode);
    }

    return { ok: true, expression: { terms } };
  } catch (e) {
    if (e instanceof ParseError) {
      return { ok: false, error: e.message };
    }
    // Defensive: never leak an unexpected throw to the caller.
    return { ok: false, error: 'invalid notation.' };
  }
}

/** adv/dis is valid ONLY on a single plain `1dM` roll (no other terms, no other modifier). */
function applyAdvantage(terms: Term[], mode: 'adv' | 'dis'): void {
  const single = terms[0];
  if (
    terms.length !== 1 ||
    !single ||
    single.kind !== 'dice' ||
    single.count !== 1 ||
    single.sign !== 1 ||
    single.modifier !== undefined
  ) {
    throw new ParseError(
      `advantage/disadvantage is only valid on a single "1dM" roll (e.g. "1d20 ${mode}").`,
    );
  }
  single.modifier = { type: 'advantage', mode };
  single.notation = `${single.notation} ${mode}`;
}
