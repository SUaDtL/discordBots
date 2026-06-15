// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { evaluate } from './evaluate.js';
import { parse } from './parse.js';
import type { RandomInt } from './types.js';

/** RNG that records how many times it was called, so we can prove caps reject BEFORE rolling. */
function counting(): { rng: RandomInt; calls: () => number } {
  let n = 0;
  return {
    rng: (min) => {
      n += 1;
      return min;
    },
    calls: () => n,
  };
}

function evalOf(input: string, rng: RandomInt) {
  const p = parse(input);
  if (!p.ok) throw new Error(`parse failed unexpectedly: ${p.error}`);
  return evaluate(p.expression, rng);
}

describe('evaluate — caps enforced before rolling', () => {
  it('1000d1000 returns a cap failure without rolling a single die', () => {
    const { rng, calls } = counting();
    const r = evalOf('1000d1000', rng);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/limit/i);
    expect(calls()).toBe(0);
  });

  it('over per-term dice cap returns failure with no rolls', () => {
    const { rng, calls } = counting();
    const r = evalOf('101d6', rng);
    expect(r.ok).toBe(false);
    expect(calls()).toBe(0);
  });

  it('over total-dice cap across many terms returns failure with no rolls', () => {
    const { rng, calls } = counting();
    // 6 terms of 100 dice = 600 > MAX_TOTAL_DICE (500).
    const r = evalOf('100d6+100d6+100d6+100d6+100d6+100d6', rng);
    expect(r.ok).toBe(false);
    expect(calls()).toBe(0);
  });

  it('a within-cap expression evaluates normally', () => {
    const { rng } = counting();
    const r = evalOf('100d6', rng);
    expect(r.ok).toBe(true);
  });
});
