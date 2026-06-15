// SPDX-License-Identifier: MIT
//
// @discord-bots/dice — pure, dependency-free TTRPG dice parser + unbiased evaluator.
//
// Public API contract is STABLE: the dungeon-herald `/roll` handler depends on this exact shape.
// `roll` NEVER throws on bad input — malformed notation and over-cap input return
// `{ ok: false, error }`. Throwing would be a bug.

import { evaluate } from './evaluate.js';
import { parse } from './parse.js';
import { defaultRandomInt } from './rng.js';
import { renderRoll } from './format.js';
import type { RandomInt, RollResult } from './types.js';

export type {
  RandomInt,
  DieResult,
  TermResult,
  RollSuccess,
  RollFailure,
  RollResult,
} from './types.js';

export { CAPS } from './caps.js';

/**
 * Parse and evaluate a dice-notation string.
 *
 * @param input Untrusted dice notation, e.g. `2d6+3`, `4d6kh3`, `3d6!`, `1d20 adv`.
 * @param rng   Optional injectable RNG (deterministic tests); defaults to the unbiased
 *              `crypto.randomInt`-backed source.
 * @returns A discriminated result; `ok:false` carries a clear, friendly error message.
 */
export function roll(input: string, rng: RandomInt = defaultRandomInt): RollResult {
  try {
    const parsed = parse(input);
    if (!parsed.ok) {
      return { ok: false, error: parsed.error };
    }

    const evaluated = evaluate(parsed.expression, rng);
    if (!evaluated.ok) {
      return { ok: false, error: evaluated.error };
    }

    const notation = normalizeNotation(input);
    const render = renderRoll(notation, evaluated.terms, evaluated.total);

    return {
      ok: true,
      notation,
      terms: evaluated.terms,
      total: evaluated.total,
      render,
    };
  } catch {
    // Defensive backstop: the parser/evaluator are designed never to throw, but the public
    // contract guarantees no throw regardless. A surprise here becomes a friendly failure.
    return { ok: false, error: 'could not evaluate that roll.' };
  }
}

/** Trim and collapse internal whitespace so the echoed notation is tidy (e.g. for the render). */
function normalizeNotation(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}
