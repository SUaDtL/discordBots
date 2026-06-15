// SPDX-License-Identifier: MIT

/** Injectable random integer source. Returns an integer in [minInclusive, maxInclusive]. */
export type RandomInt = (minInclusive: number, maxInclusive: number) => number;

/** One physical die result. */
export interface DieResult {
  sides: number;
  value: number;
  kept: boolean;
  exploded?: boolean;
}

/** Result of evaluating a single additive term (a dice group or a constant). */
export interface TermResult {
  notation: string;
  dice: DieResult[];
  modifier?: number;
  subtotal: number;
}

/** Successful roll. */
export interface RollSuccess {
  ok: true;
  notation: string;
  terms: TermResult[];
  total: number;
  render: string;
}

/** Failed roll — malformed input or a safety-cap violation. Never thrown. */
export interface RollFailure {
  ok: false;
  error: string;
}

export type RollResult = RollSuccess | RollFailure;
