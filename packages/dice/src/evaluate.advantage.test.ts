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

describe('evaluate — advantage / disadvantage', () => {
  it('1d20 adv rolls two d20 and keeps the higher', () => {
    const r = evalOk('1d20 adv', queue([7, 15]));
    expect(r.terms[0]!.dice).toHaveLength(2);
    expect(r.terms[0]!.dice.map((d) => d.value)).toEqual([7, 15]);
    expect(r.total).toBe(15);
    const kept = r.terms[0]!.dice.filter((d) => d.kept);
    expect(kept).toHaveLength(1);
    expect(kept[0]!.value).toBe(15);
  });

  it('1d20 adv keeps the higher when first is larger', () => {
    const r = evalOk('1d20 adv', queue([18, 3]));
    expect(r.total).toBe(18);
  });

  it('1d20 dis keeps the lower', () => {
    const r = evalOk('1d20 dis', queue([7, 15]));
    expect(r.total).toBe(7);
    const kept = r.terms[0]!.dice.filter((d) => d.kept);
    expect(kept).toHaveLength(1);
    expect(kept[0]!.value).toBe(7);
  });

  it('handles a tie (both kept-count stays exactly one)', () => {
    const r = evalOk('1d20 adv', queue([10, 10]));
    expect(r.total).toBe(10);
    expect(r.terms[0]!.dice.filter((d) => d.kept)).toHaveLength(1);
  });
});
