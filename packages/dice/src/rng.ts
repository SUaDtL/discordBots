// SPDX-License-Identifier: MIT
import { randomInt } from 'node:crypto';
import type { RandomInt } from './types.js';

/**
 * Default unbiased RNG. Uses Node's `crypto.randomInt` for a uniform integer in [min, max].
 *
 * `Math.random` is BANNED here per security-controls.md ("no `Math.random` for anything requiring
 * fairness"): it has modulo bias and players must trust the dice. `crypto.randomInt` takes a
 * half-open range `[min, max)`, so we pass `max + 1` for an inclusive upper bound.
 *
 * Tests inject a deterministic `RandomInt` instead; production code uses this default.
 */
export const defaultRandomInt: RandomInt = (minInclusive: number, maxInclusive: number): number => {
  return randomInt(minInclusive, maxInclusive + 1);
};
