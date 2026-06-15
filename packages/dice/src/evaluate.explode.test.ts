// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { evaluate } from './evaluate.js';
import { parse } from './parse.js';
import { CAPS } from './caps.js';
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

describe('evaluate — exploding', () => {
  it('a max die re-rolls and adds, stopping on a non-max', () => {
    // 1d6!: roll 6 (max -> explode), then 4 (stop). dice = [6,4], total 10.
    const r = evalOk('1d6!', queue([6, 4]));
    expect(r.terms[0]!.dice.map((d) => d.value)).toEqual([6, 4]);
    expect(r.terms[0]!.dice[1]!.exploded).toBe(true);
    expect(r.total).toBe(10);
  });

  it('chains multiple explosions', () => {
    // 1d6!: 6 -> 6 -> 2. total 14.
    const r = evalOk('1d6!', queue([6, 6, 2]));
    expect(r.terms[0]!.dice.map((d) => d.value)).toEqual([6, 6, 2]);
    expect(r.total).toBe(14);
  });

  it('does not explode a non-max die', () => {
    const r = evalOk('1d6!', queue([3]));
    expect(r.terms[0]!.dice).toHaveLength(1);
    expect(r.total).toBe(3);
  });

  it('explodes each die in a multi-die term independently', () => {
    // 2d6!: first die 6->2 (chain), second die 5 (no chain). dice=[6,2,5] total 13.
    const r = evalOk('2d6!', queue([6, 2, 5]));
    expect(r.terms[0]!.dice.map((d) => d.value)).toEqual([6, 2, 5]);
    expect(r.total).toBe(13);
  });

  it('ALWAYS terminates under the iteration cap even on an all-max streak', () => {
    // Pathological RNG that always returns the max => every die would explode forever.
    const alwaysMax: RandomInt = (_min, max) => max;
    const r = evalOk('1d6!', alwaysMax);
    // 1 original + EXPLODE_ITERATIONS_CAP re-rolls, then forced stop.
    expect(r.terms[0]!.dice.length).toBe(1 + CAPS.EXPLODE_ITERATIONS_CAP);
    expect(r.terms[0]!.dice.length).toBeLessThanOrEqual(1 + CAPS.EXPLODE_ITERATIONS_CAP);
  });

  it('termination holds for many seeds (property-style)', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const rng: RandomInt = (min, max) => min + ((seed * 31 + 17) % (max - min + 1));
      const r = evalOk('3d6!', rng);
      // bounded: at most count * (1 + cap) dice.
      expect(r.terms[0]!.dice.length).toBeLessThanOrEqual(3 * (1 + CAPS.EXPLODE_ITERATIONS_CAP));
      // total equals sum of all (all explosion dice are kept).
      const sum = r.terms[0]!.dice.reduce((a, d) => a + d.value, 0);
      expect(r.total).toBe(sum);
    }
  });
});
