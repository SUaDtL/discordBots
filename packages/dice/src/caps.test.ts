// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { CAPS, checkDiceTermCaps, checkTotalDiceCap, type CapViolation } from './caps.js';

describe('caps constants', () => {
  it('documents sane hard limits', () => {
    expect(CAPS.MAX_DICE_PER_TERM).toBe(100);
    expect(CAPS.MAX_SIDES).toBe(1000);
    expect(CAPS.MAX_TOTAL_DICE).toBe(500);
    expect(CAPS.MAX_TERMS).toBe(50);
    expect(CAPS.EXPLODE_ITERATIONS_CAP).toBe(100);
  });
});

describe('checkDiceTermCaps', () => {
  it('passes a normal term', () => {
    expect(checkDiceTermCaps(4, 6)).toBeNull();
  });

  it('passes at the exact boundary', () => {
    expect(checkDiceTermCaps(CAPS.MAX_DICE_PER_TERM, CAPS.MAX_SIDES)).toBeNull();
  });

  it('rejects too many dice in one term, naming the limit', () => {
    const v = checkDiceTermCaps(CAPS.MAX_DICE_PER_TERM + 1, 6) as CapViolation;
    expect(v).not.toBeNull();
    expect(v.message).toMatch(/100/);
    expect(v.message).toMatch(/dice/i);
  });

  it('rejects too many sides, naming the limit', () => {
    const v = checkDiceTermCaps(1, CAPS.MAX_SIDES + 1) as CapViolation;
    expect(v).not.toBeNull();
    expect(v.message).toMatch(/1000/);
    expect(v.message).toMatch(/side/i);
  });

  it('rejects 1000d1000 (dice count over cap) before any rolling', () => {
    expect(checkDiceTermCaps(1000, 1000)).not.toBeNull();
  });

  it('rejects fewer than 1 side', () => {
    expect(checkDiceTermCaps(1, 0)).not.toBeNull();
  });

  it('rejects negative dice count', () => {
    expect(checkDiceTermCaps(-1, 6)).not.toBeNull();
  });
});

describe('checkTotalDiceCap', () => {
  it('passes under the total-dice cap', () => {
    expect(checkTotalDiceCap(CAPS.MAX_TOTAL_DICE)).toBeNull();
  });

  it('rejects over the total-dice cap, naming the limit', () => {
    const v = checkTotalDiceCap(CAPS.MAX_TOTAL_DICE + 1) as CapViolation;
    expect(v).not.toBeNull();
    expect(v.message).toMatch(/500/);
  });
});
