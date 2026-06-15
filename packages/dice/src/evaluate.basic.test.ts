// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { evaluate } from './evaluate.js';
import { parse } from './parse.js';
import type { RandomInt } from './types.js';

/** Deterministic RNG that yields a fixed queue of values, asserting the requested range. */
function queue(values: number[]): RandomInt {
  let i = 0;
  return (min, max) => {
    const v = values[i] ?? values[values.length - 1] ?? min;
    i += 1;
    if (v < min || v > max) {
      throw new Error(`test rng value ${v} out of requested range [${min},${max}]`);
    }
    return v;
  };
}

function evalOk(input: string, rng: RandomInt) {
  const p = parse(input);
  if (!p.ok) throw new Error(`parse failed: ${p.error}`);
  const r = evaluate(p.expression, rng);
  if (!r.ok) throw new Error(`evaluate failed: ${r.error}`);
  return r;
}

describe('evaluate — basic single term', () => {
  it('rolls 2d6 with given dice and totals correctly', () => {
    const r = evalOk('2d6', queue([4, 2]));
    expect(r.total).toBe(6);
    expect(r.terms).toHaveLength(1);
    expect(r.terms[0]!.dice.map((d) => d.value)).toEqual([4, 2]);
    expect(r.terms[0]!.dice.every((d) => d.kept)).toBe(true);
    expect(r.terms[0]!.subtotal).toBe(6);
  });

  it('rolls a single d20', () => {
    const r = evalOk('1d20', queue([17]));
    expect(r.total).toBe(17);
  });
});

describe('evaluate — constants and modifiers', () => {
  it('2d6+3 adds the modifier', () => {
    const r = evalOk('2d6+3', queue([4, 2]));
    expect(r.total).toBe(9);
  });

  it('subtracts negative constant terms', () => {
    const r = evalOk('2d6-1', queue([4, 2]));
    expect(r.total).toBe(5);
  });
});

describe('evaluate — multi-term', () => {
  it('2d6+1d4+3-1 evaluates every term and sums', () => {
    // 2d6 -> [4,2]=6 ; 1d4 -> [3]=3 ; +3 ; -1  => 11
    const r = evalOk('2d6+1d4+3-1', queue([4, 2, 3]));
    expect(r.total).toBe(11);
    expect(r.terms).toHaveLength(4);
  });

  it('total equals sum of kept dice plus signed modifiers (invariant)', () => {
    const r = evalOk('2d6+1d4+3-1', queue([4, 2, 3]));
    let sum = 0;
    for (const term of r.terms) {
      // Each term's subtotal already carries its own sign.
      sum += term.subtotal;
    }
    expect(r.total).toBe(sum);
  });
});
