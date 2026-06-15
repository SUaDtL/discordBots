// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { renderRoll } from './format.js';
import type { TermResult } from './types.js';

describe('renderRoll', () => {
  it('renders dice list, modifier and total: 2d6+3', () => {
    const terms: TermResult[] = [
      {
        notation: '2d6',
        dice: [
          { sides: 6, value: 4, kept: true },
          { sides: 6, value: 2, kept: true },
        ],
        subtotal: 6,
      },
      { notation: '+3', dice: [], modifier: 3, subtotal: 3 },
    ];
    const out = renderRoll('2d6+3', terms, 9);
    expect(out).toContain('2d6+3');
    expect(out).toContain('[4, 2]');
    expect(out).toContain('+3');
    expect(out).toContain('= 9');
  });

  it('marks dropped dice distinctly from kept ones', () => {
    const terms: TermResult[] = [
      {
        notation: '4d6kh3',
        dice: [
          { sides: 6, value: 1, kept: false },
          { sides: 6, value: 5, kept: true },
          { sides: 6, value: 3, kept: true },
          { sides: 6, value: 6, kept: true },
        ],
        subtotal: 14,
      },
    ];
    const out = renderRoll('4d6kh3', terms, 14);
    // dropped die value should still appear but be visually distinguished (struck/parenthesized).
    expect(out).toContain('14');
    expect(out).toMatch(/~~1~~|\(1\)|1̶/);
  });

  it('shows exploded dice', () => {
    const terms: TermResult[] = [
      {
        notation: '1d6!',
        dice: [
          { sides: 6, value: 6, kept: true },
          { sides: 6, value: 4, kept: true, exploded: true },
        ],
        subtotal: 10,
      },
    ];
    const out = renderRoll('1d6!', terms, 10);
    expect(out).toContain('= 10');
    expect(out).toMatch(/!/); // exploded marker
  });

  it('renders a negative total correctly', () => {
    const terms: TermResult[] = [
      { notation: '1d4', dice: [{ sides: 4, value: 1, kept: true }], subtotal: 1 },
      { notation: '-5', dice: [], modifier: -5, subtotal: -5 },
    ];
    const out = renderRoll('1d4-5', terms, -4);
    expect(out).toContain('= -4');
  });
});
