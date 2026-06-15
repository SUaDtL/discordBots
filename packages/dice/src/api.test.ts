// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { roll, type RandomInt, type RollSuccess } from './index.js';

function det(values: number[]): RandomInt {
  let i = 0;
  return (min, max) => {
    const v = values[i] ?? min;
    i += 1;
    if (v < min || v > max) throw new Error(`rng ${v} out of [${min},${max}]`);
    return v;
  };
}

function success(input: string, rng?: RandomInt): RollSuccess {
  const r = roll(input, rng);
  if (!r.ok) throw new Error(`expected success for "${input}", got error: ${r.error}`);
  return r;
}

describe('roll — happy path', () => {
  it('rolls 2d6+3 with a deterministic rng', () => {
    const r = success('2d6+3', det([4, 2]));
    expect(r.ok).toBe(true);
    expect(r.notation).toBe('2d6+3');
    expect(r.total).toBe(9);
    expect(r.terms).toHaveLength(2);
    expect(r.render).toContain('= 9');
  });

  it('exposes the stable public shape', () => {
    const r = success('1d20', det([11]));
    expect(r).toHaveProperty('ok', true);
    expect(r).toHaveProperty('notation');
    expect(r).toHaveProperty('terms');
    expect(r).toHaveProperty('total');
    expect(r).toHaveProperty('render');
  });

  it('works with the default (crypto) rng when none injected', () => {
    const r = success('3d6');
    expect(r.total).toBeGreaterThanOrEqual(3);
    expect(r.total).toBeLessThanOrEqual(18);
  });

  it('handles every supported grammar form', () => {
    expect(success('2d6+1d4+3-1', det([4, 2, 3])).total).toBe(11);
    expect(success('4d6kh3', det([1, 5, 3, 6])).total).toBe(14);
    expect(success('1d6!', det([6, 4])).total).toBe(10);
    expect(success('1d20 adv', det([7, 15])).total).toBe(15);
    expect(success('1d20 dis', det([7, 15])).total).toBe(7);
  });
});

describe('roll — error path (returns failure, NEVER throws)', () => {
  const bad = ['abc', '2x6', '', '   ', 'd', '2d', '2d6+', '2d6++1', '2d6 & 3', '@@@', '2d20 adv'];

  for (const input of bad) {
    it(`returns { ok:false, error } for ${JSON.stringify(input)}`, () => {
      const r = roll(input);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(typeof r.error).toBe('string');
        expect(r.error.length).toBeGreaterThan(0);
      }
    });
  }

  it('returns a cap failure for 1000d1000 (does not compute)', () => {
    const r = roll('1000d1000');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/limit/i);
  });

  it('never throws for any of a wide range of junk inputs', () => {
    const junk = [
      '',
      ' ',
      'd',
      'dd',
      '2d',
      'd6d6',
      '++',
      '--',
      '2d6kh',
      '!',
      '2d6!!',
      'NaN',
      '99999999999999d6',
      '🎲',
      '1d',
      '1d-6',
      '2d6 adv dis',
    ];
    for (const j of junk) {
      expect(() => roll(j)).not.toThrow();
      expect(roll(j).ok === true || roll(j).ok === false).toBe(true);
    }
  });
});

describe('roll — property invariants across many random seeds', () => {
  it('total always equals sum of kept dice plus signed modifiers', () => {
    const exprs = ['2d6+3', '1d4+1d6+1d8', '4d6kh3', '5d10dl2', '2d6-1', '10d6'];
    for (let seed = 0; seed < 500; seed += 1) {
      const rng: RandomInt = (min, max) => min + ((seed * 2654435761) % (max - min + 1));
      for (const expr of exprs) {
        const r = roll(expr, rng);
        expect(r.ok).toBe(true);
        if (!r.ok) continue;
        let expected = 0;
        for (const term of r.terms) {
          const sign = term.notation.startsWith('-') ? -1 : 1;
          if (term.dice.length === 0) {
            expected += term.modifier ?? 0;
          } else {
            const keptSum = term.dice.filter((d) => d.kept).reduce((a, d) => a + d.value, 0);
            expected += sign * keptSum;
          }
        }
        expect(r.total).toBe(expected);
      }
    }
  });

  it('every kept/dropped die value is within [1, sides]', () => {
    for (let seed = 0; seed < 300; seed += 1) {
      const rng: RandomInt = (min, max) => min + ((seed * 40503) % (max - min + 1));
      const r = roll('3d20+2d6', rng);
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      for (const term of r.terms) {
        for (const d of term.dice) {
          expect(d.value).toBeGreaterThanOrEqual(1);
          expect(d.value).toBeLessThanOrEqual(d.sides);
        }
      }
    }
  });

  it('1d20 adv always keeps the max of the two physical dice', () => {
    for (let a = 1; a <= 20; a += 1) {
      for (let b = 1; b <= 20; b += 1) {
        const r = roll('1d20 adv', det([a, b]));
        expect(r.ok).toBe(true);
        if (!r.ok) continue;
        expect(r.total).toBe(Math.max(a, b));
      }
    }
  });

  it('1d20 dis always keeps the min of the two physical dice', () => {
    for (let a = 1; a <= 20; a += 1) {
      for (let b = 1; b <= 20; b += 1) {
        const r = roll('1d20 dis', det([a, b]));
        if (!r.ok) continue;
        expect(r.total).toBe(Math.min(a, b));
      }
    }
  });
});
