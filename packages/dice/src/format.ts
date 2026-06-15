// SPDX-License-Identifier: MIT
import type { DieResult, TermResult } from './types.js';

/**
 * Render a human-readable summary of a roll, e.g. `2d6+3: [4, 2] +3 = 9`. Dropped dice are
 * struck through (Discord `~~x~~`); exploded dice are suffixed with `!`.
 */
export function renderRoll(notation: string, terms: TermResult[], total: number): string {
  const parts: string[] = [];

  for (const term of terms) {
    if (term.dice.length === 0) {
      // Pure constant term — surface its signed value.
      parts.push(formatSignedConstant(term.modifier ?? term.subtotal));
      continue;
    }
    parts.push(formatDiceTerm(term));
  }

  const body = parts.join(' ').trim();
  return `${notation}: ${body} = ${total}`;
}

function formatDiceTerm(term: TermResult): string {
  const inner = term.dice.map(formatDie).join(', ');
  return `[${inner}]`;
}

function formatDie(die: DieResult): string {
  let text = String(die.value);
  if (die.exploded) {
    text = `${text}!`;
  }
  if (!die.kept) {
    text = `~~${text}~~`;
  }
  return text;
}

function formatSignedConstant(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}
