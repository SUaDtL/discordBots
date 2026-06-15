// SPDX-License-Identifier: MIT

/**
 * Hard safety caps. Untrusted `/roll` input must be bounded BEFORE any dice are rolled, so a string
 * like `1000d1000` returns a friendly cap message instead of attempting unbounded work (AC-07).
 */
export const CAPS = {
  /** Max dice in a single `NdM` term. */
  MAX_DICE_PER_TERM: 100,
  /** Max sides on any die. */
  MAX_SIDES: 1000,
  /** Max dice summed across every term in one expression. */
  MAX_TOTAL_DICE: 500,
  /** Max additive terms in one expression. */
  MAX_TERMS: 50,
  /** Max explosion re-rolls attributed to a single originating die. */
  EXPLODE_ITERATIONS_CAP: 100,
} as const;

/** A rejected input, with a friendly message naming the limit that was exceeded. */
export interface CapViolation {
  message: string;
}

/** Validate one dice term's count and sides. Returns null when within all caps. */
export function checkDiceTermCaps(count: number, sides: number): CapViolation | null {
  if (!Number.isInteger(count) || count < 1) {
    return { message: `each dice term needs at least 1 die (got ${count}).` };
  }
  if (!Number.isInteger(sides) || sides < 1) {
    return { message: `dice need at least 1 side (got ${sides}).` };
  }
  if (count > CAPS.MAX_DICE_PER_TERM) {
    return {
      message: `too many dice in one term: ${count} exceeds the limit of ${CAPS.MAX_DICE_PER_TERM} dice.`,
    };
  }
  if (sides > CAPS.MAX_SIDES) {
    return {
      message: `too many sides: ${sides} exceeds the limit of ${CAPS.MAX_SIDES} sides.`,
    };
  }
  return null;
}

/** Validate the total dice count across all terms. Returns null when within the cap. */
export function checkTotalDiceCap(totalDice: number): CapViolation | null {
  if (totalDice > CAPS.MAX_TOTAL_DICE) {
    return {
      message: `too many dice overall: ${totalDice} exceeds the limit of ${CAPS.MAX_TOTAL_DICE} dice.`,
    };
  }
  return null;
}
