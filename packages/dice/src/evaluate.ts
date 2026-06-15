// SPDX-License-Identifier: MIT
import { CAPS, checkDiceTermCaps, checkTotalDiceCap } from './caps.js';
import type { DiceTerm, Expression, Term } from './parse.js';
import type { DieResult, RandomInt, TermResult } from './types.js';

export type EvaluateResult =
  | { ok: true; terms: TermResult[]; total: number }
  | { ok: false; error: string };

/**
 * Evaluate a parsed {@link Expression} with the given RNG. Enforces all safety caps BEFORE rolling
 * any dice (AC-07). Returns a result object; never throws on cap violations.
 */
export function evaluate(expr: Expression, rng: RandomInt): EvaluateResult {
  // 1) Per-term caps + total-dice cap, BEFORE any rolling.
  let totalDice = 0;
  if (expr.terms.length > CAPS.MAX_TERMS) {
    return {
      ok: false,
      error: `too many terms: ${expr.terms.length} exceeds the limit of ${CAPS.MAX_TERMS}.`,
    };
  }
  for (const term of expr.terms) {
    if (term.kind !== 'dice') continue;
    const violation = checkDiceTermCaps(term.count, term.sides);
    if (violation) return { ok: false, error: violation.message };
    const advantage = term.modifier?.type === 'advantage';
    // Advantage rolls 2 physical dice for a notional 1dM.
    totalDice += advantage ? 2 : term.count;
  }
  const totalViolation = checkTotalDiceCap(totalDice);
  if (totalViolation) return { ok: false, error: totalViolation.message };

  // 2) Roll.
  const terms: TermResult[] = [];
  let total = 0;
  for (const term of expr.terms) {
    const tr = evaluateTerm(term, rng);
    terms.push(tr);
    total += tr.subtotal;
  }
  return { ok: true, terms, total };
}

function evaluateTerm(term: Term, rng: RandomInt): TermResult {
  if (term.kind === 'const') {
    const subtotal = term.sign * term.value;
    return {
      notation: signedNotation(term.sign, term.notation),
      dice: [],
      modifier: subtotal,
      subtotal,
    };
  }
  return evaluateDiceTerm(term, rng);
}

function evaluateDiceTerm(term: DiceTerm, rng: RandomInt): TermResult {
  const mod = term.modifier;

  if (mod?.type === 'advantage') {
    return evaluateAdvantage(term, mod.mode, rng);
  }

  let dice: DieResult[];
  if (mod?.type === 'explode') {
    dice = rollExploding(term.count, term.sides, rng);
  } else {
    dice = rollPlain(term.count, term.sides, rng);
  }

  if (mod?.type === 'keepdrop') {
    applyKeepDrop(dice, mod.op, mod.n);
  }

  const subtotal = term.sign * sumKept(dice);
  return {
    notation: signedNotation(term.sign, term.notation),
    dice,
    subtotal,
  };
}

function evaluateAdvantage(term: DiceTerm, mode: 'adv' | 'dis', rng: RandomInt): TermResult {
  const a = roll1(term.sides, rng);
  const b = roll1(term.sides, rng);
  // adv keeps the higher; dis keeps the lower.
  const keepFirst = mode === 'adv' ? a.value >= b.value : a.value <= b.value;
  a.kept = keepFirst;
  b.kept = !keepFirst;
  const dice = [a, b];
  const subtotal = term.sign * sumKept(dice);
  return { notation: signedNotation(term.sign, term.notation), dice, subtotal };
}

function rollPlain(count: number, sides: number, rng: RandomInt): DieResult[] {
  const dice: DieResult[] = [];
  for (let i = 0; i < count; i += 1) {
    dice.push(roll1(sides, rng));
  }
  return dice;
}

/**
 * Roll exploding dice: each die rolling its max value triggers an additional die that is added to
 * the term. Bounded by {@link CAPS.EXPLODE_ITERATIONS_CAP} re-rolls per originating die so a
 * pathological streak always terminates (AC-04, AC-07).
 */
function rollExploding(count: number, sides: number, rng: RandomInt): DieResult[] {
  const dice: DieResult[] = [];
  for (let i = 0; i < count; i += 1) {
    let die = roll1(sides, rng);
    dice.push(die);
    let iterations = 0;
    while (die.value === sides && iterations < CAPS.EXPLODE_ITERATIONS_CAP) {
      die = roll1(sides, rng);
      die.exploded = true;
      dice.push(die);
      iterations += 1;
    }
  }
  return dice;
}

function applyKeepDrop(dice: DieResult[], op: 'kh' | 'kl' | 'dh' | 'dl', n: number): void {
  // Rank dice by value; ties broken by original index for determinism.
  const order = dice
    .map((d, idx) => ({ idx, value: d.value }))
    .sort((x, y) => y.value - x.value || x.idx - y.idx);
  // order: highest -> lowest.
  const keepIdx = new Set<number>();
  if (op === 'kh') {
    for (let i = 0; i < n; i += 1) keepIdx.add(order[i]!.idx);
  } else if (op === 'kl') {
    for (let i = 0; i < n; i += 1) keepIdx.add(order[order.length - 1 - i]!.idx);
  } else if (op === 'dh') {
    // Drop the n highest; keep the rest.
    const dropped = new Set<number>();
    for (let i = 0; i < n; i += 1) dropped.add(order[i]!.idx);
    dice.forEach((_, idx) => {
      if (!dropped.has(idx)) keepIdx.add(idx);
    });
  } else {
    // dl: drop the n lowest; keep the rest.
    const dropped = new Set<number>();
    for (let i = 0; i < n; i += 1) dropped.add(order[order.length - 1 - i]!.idx);
    dice.forEach((_, idx) => {
      if (!dropped.has(idx)) keepIdx.add(idx);
    });
  }
  dice.forEach((d, idx) => {
    d.kept = keepIdx.has(idx);
  });
}

function roll1(sides: number, rng: RandomInt): DieResult {
  return { sides, value: rng(1, sides), kept: true };
}

function sumKept(dice: DieResult[]): number {
  let s = 0;
  for (const d of dice) {
    if (d.kept) s += d.value;
  }
  return s;
}

function signedNotation(sign: 1 | -1, notation: string): string {
  return sign === -1 ? `-${notation}` : notation;
}
