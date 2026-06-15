// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { parse, ParseError, type Expression } from './parse.js';

function ok(input: string): Expression {
  const r = parse(input);
  if (!r.ok) {
    throw new Error(`expected parse success for "${input}", got: ${r.error}`);
  }
  return r.expression;
}

function err(input: string): string {
  const r = parse(input);
  if (r.ok) {
    throw new Error(`expected parse failure for "${input}"`);
  }
  return r.error;
}

describe('parse — dice terms', () => {
  it('parses NdM', () => {
    const e = ok('2d6');
    expect(e.terms).toHaveLength(1);
    expect(e.terms[0]).toMatchObject({
      kind: 'dice',
      sign: 1,
      count: 2,
      sides: 6,
    });
  });

  it('defaults count to 1 when omitted (d20)', () => {
    expect(ok('d20').terms[0]).toMatchObject({ kind: 'dice', count: 1, sides: 20 });
  });

  it('parses a bare constant', () => {
    expect(ok('5').terms[0]).toMatchObject({ kind: 'const', sign: 1, value: 5 });
  });
});

describe('parse — multi-term additive', () => {
  it('parses 2d6+1d4+3-1 with signs', () => {
    const e = ok('2d6+1d4+3-1');
    expect(e.terms).toHaveLength(4);
    expect(e.terms[0]).toMatchObject({ kind: 'dice', sign: 1, count: 2, sides: 6 });
    expect(e.terms[1]).toMatchObject({ kind: 'dice', sign: 1, count: 1, sides: 4 });
    expect(e.terms[2]).toMatchObject({ kind: 'const', sign: 1, value: 3 });
    expect(e.terms[3]).toMatchObject({ kind: 'const', sign: -1, value: 1 });
  });

  it('tolerates whitespace around terms and operators', () => {
    const e = ok('  2d6 + 1d4 - 1 ');
    expect(e.terms).toHaveLength(3);
  });
});

describe('parse — keep/drop', () => {
  it('parses 4d6kh3', () => {
    expect(ok('4d6kh3').terms[0]).toMatchObject({
      kind: 'dice',
      count: 4,
      sides: 6,
      modifier: { type: 'keepdrop', op: 'kh', n: 3 },
    });
  });

  it('parses kl / dh / dl', () => {
    expect(ok('4d6kl1').terms[0]).toMatchObject({ modifier: { op: 'kl', n: 1 } });
    expect(ok('4d6dh1').terms[0]).toMatchObject({ modifier: { op: 'dh', n: 1 } });
    expect(ok('4d6dl2').terms[0]).toMatchObject({ modifier: { op: 'dl', n: 2 } });
  });

  it('rejects keep/drop n greater than dice count', () => {
    expect(err('2d6kh3')).toMatch(/keep|drop|more dice/i);
  });

  it('rejects keep/drop with zero n', () => {
    expect(err('4d6kh0')).toMatch(/at least 1/i);
  });
});

describe('parse — exploding', () => {
  it('parses 3d6!', () => {
    expect(ok('3d6!').terms[0]).toMatchObject({
      kind: 'dice',
      count: 3,
      sides: 6,
      modifier: { type: 'explode' },
    });
  });

  it('rejects exploding on a one-sided die (would never terminate)', () => {
    expect(err('3d1!')).toMatch(/explod/i);
  });
});

describe('parse — advantage / disadvantage', () => {
  it('parses 1d20 adv as a single dice term with advantage', () => {
    expect(ok('1d20 adv').terms[0]).toMatchObject({
      kind: 'dice',
      count: 1,
      sides: 20,
      modifier: { type: 'advantage', mode: 'adv' },
    });
  });

  it('parses d20 dis (implicit count 1)', () => {
    expect(ok('d20 dis').terms[0]).toMatchObject({ modifier: { type: 'advantage', mode: 'dis' } });
  });

  it('rejects adv on a multi-die roll', () => {
    expect(err('2d20 adv')).toMatch(/advantage|single|1d/i);
  });

  it('rejects adv combined with other terms', () => {
    expect(err('1d20+5 adv')).toMatch(/advantage|single|1d/i);
  });

  it('rejects adv combined with keep/drop or explode', () => {
    expect(err('4d6kh3 adv')).toMatch(/advantage|single|1d/i);
    expect(err('3d6! adv')).toMatch(/advantage|single|1d/i);
  });
});

describe('parse — invalid notation (typed ParseError, never throws to caller)', () => {
  it('rejects gibberish', () => {
    expect(err('abc')).toMatch(/./);
  });

  it('rejects 2x6', () => {
    expect(err('2x6')).toMatch(/./);
  });

  it('rejects empty input', () => {
    expect(err('')).toMatch(/empty|notation/i);
  });

  it('rejects a lone d', () => {
    expect(err('d')).toMatch(/./);
  });

  it('rejects 2d with no sides', () => {
    expect(err('2d')).toMatch(/./);
  });

  it('rejects a dangling operator', () => {
    expect(err('2d6+')).toMatch(/./);
  });

  it('rejects double operators', () => {
    expect(err('2d6++1')).toMatch(/./);
  });

  it('the parse function itself never throws on bad input', () => {
    expect(() => parse('@@@')).not.toThrow();
    expect(() => parse('')).not.toThrow();
    expect(() => parse('2d6 & 3')).not.toThrow();
  });
});

describe('ParseError', () => {
  it('is an Error subclass', () => {
    expect(new ParseError('x')).toBeInstanceOf(Error);
  });
});
