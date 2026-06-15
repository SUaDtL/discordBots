// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { evaluate } from './evaluate.js';
import { parse } from './parse.js';
import type { RandomInt } from './types.js';

function queue(values: number[]): RandomInt {
  let i = 0;
  return (min, max) => {
    const v = values[i] ?? min;
    i += 1;
    if (v < min || v > max) throw new Error(`rng ${v} out of [${min},${max}]`);
    return v;
  };
}

function evalOk(input: string, rng: RandomInt) {
  const p = parse(input);
  if (!p.ok) throw new Error(p.error);
  const r = evaluate(p.expression, rng);
  if (!r.ok) throw new Error(r.error);
  return r;
}

function keptValues(input: string, rng: RandomInt): number[] {
  const r = evalOk(input, rng);
  return r.terms[0]!.dice.filter((d) => d.kept).map((d) => d.value);
}

describe('evaluate — keep highest / lowest', () => {
  it('4d6kh3 keeps the highest 3', () => {
    // dice [1,5,3,6] -> keep [5,3,6] (drop the 1)
    const r = evalOk('4d6kh3', queue([1, 5, 3, 6]));
    expect(r.terms[0]!.dice.filter((d) => d.kept)).toHaveLength(3);
    expect(r.total).toBe(14);
    expect(keptValues('4d6kh3', queue([1, 5, 3, 6])).sort()).toEqual([3, 5, 6]);
  });

  it('4d6kl2 keeps the lowest 2', () => {
    const r = evalOk('4d6kl2', queue([1, 5, 3, 6]));
    expect(r.terms[0]!.dice.filter((d) => d.kept)).toHaveLength(2);
    expect(r.total).toBe(4); // 1 + 3
  });
});

describe('evaluate — drop highest / lowest', () => {
  it('4d6dl1 drops the single lowest', () => {
    const r = evalOk('4d6dl1', queue([1, 5, 3, 6]));
    expect(r.terms[0]!.dice.filter((d) => d.kept)).toHaveLength(3);
    expect(r.total).toBe(14); // drop 1
  });

  it('4d6dh1 drops the single highest', () => {
    const r = evalOk('4d6dh1', queue([1, 5, 3, 6]));
    expect(r.terms[0]!.dice.filter((d) => d.kept)).toHaveLength(3);
    expect(r.total).toBe(9); // drop 6 -> 1+5+3
  });
});

describe('evaluate — keep/drop kept-counts (property-style across many seeds)', () => {
  it('kh<n> always keeps exactly n dice for many random rolls', () => {
    for (let seed = 0; seed < 300; seed += 1) {
      const rng: RandomInt = (min, max) => min + ((seed * 7 + 3) % (max - min + 1));
      const r = evalOk('5d8kh2', rng);
      expect(r.terms[0]!.dice.filter((d) => d.kept)).toHaveLength(2);
    }
  });

  it('dl<n> always keeps count - n dice', () => {
    for (let seed = 0; seed < 300; seed += 1) {
      const rng: RandomInt = (min, max) => min + ((seed * 13 + 5) % (max - min + 1));
      const r = evalOk('6d10dl2', rng);
      expect(r.terms[0]!.dice.filter((d) => d.kept)).toHaveLength(4);
    }
  });
});
