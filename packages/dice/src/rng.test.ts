// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { defaultRandomInt } from './rng.js';

describe('defaultRandomInt', () => {
  it('returns integers within [min, max] inclusive over many draws', () => {
    for (let i = 0; i < 5000; i += 1) {
      const v = defaultRandomInt(1, 6);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    }
  });

  it('can produce both endpoints of the range', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i += 1) {
      seen.add(defaultRandomInt(1, 2));
    }
    expect(seen.has(1)).toBe(true);
    expect(seen.has(2)).toBe(true);
  });

  it('returns the only value for a single-value range (d1)', () => {
    for (let i = 0; i < 100; i += 1) {
      expect(defaultRandomInt(1, 1)).toBe(1);
    }
  });

  it('covers the full face range of a d20', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 20000; i += 1) {
      seen.add(defaultRandomInt(1, 20));
    }
    for (let face = 1; face <= 20; face += 1) {
      expect(seen.has(face)).toBe(true);
    }
  });
});
