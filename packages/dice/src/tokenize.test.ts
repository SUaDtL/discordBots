// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { tokenize, type Token } from './tokenize.js';

function types(tokens: Token[]): string[] {
  return tokens.map((t) => t.type);
}

describe('tokenize', () => {
  it('tokenizes a simple dice term', () => {
    const toks = tokenize('2d6');
    expect(types(toks)).toEqual(['number', 'd', 'number']);
    expect(toks[0]).toMatchObject({ type: 'number', value: 2 });
    expect(toks[2]).toMatchObject({ type: 'number', value: 6 });
  });

  it('tokenizes additive multi-term notation', () => {
    const toks = tokenize('2d6+1d4-1');
    expect(types(toks)).toEqual([
      'number',
      'd',
      'number',
      'plus',
      'number',
      'd',
      'number',
      'minus',
      'number',
    ]);
  });

  it('tokenizes keep/drop suffixes (kh, kl, dh, dl)', () => {
    expect(types(tokenize('4d6kh3'))).toEqual(['number', 'd', 'number', 'keepdrop', 'number']);
    expect(tokenize('4d6kl1')[3]).toMatchObject({ type: 'keepdrop', value: 'kl' });
    expect(tokenize('4d6dh1')[3]).toMatchObject({ type: 'keepdrop', value: 'dh' });
    expect(tokenize('4d6dl1')[3]).toMatchObject({ type: 'keepdrop', value: 'dl' });
  });

  it('tokenizes the explode bang', () => {
    expect(types(tokenize('3d6!'))).toEqual(['number', 'd', 'number', 'bang']);
  });

  it('tokenizes adv / dis keywords', () => {
    expect(tokenize('1d20 adv').at(-1)).toMatchObject({ type: 'keyword', value: 'adv' });
    expect(tokenize('1d20 dis').at(-1)).toMatchObject({ type: 'keyword', value: 'dis' });
  });

  it('is case-insensitive for letters and tolerates surrounding/internal whitespace', () => {
    expect(types(tokenize('  2D6 + 1D4  '))).toEqual([
      'number',
      'd',
      'number',
      'plus',
      'number',
      'd',
      'number',
    ]);
    expect(tokenize('1D20 ADV').at(-1)).toMatchObject({ type: 'keyword', value: 'adv' });
  });

  it('rejects unknown characters with a typed lexer error', () => {
    expect(() => tokenize('2x6')).toThrowError(/unexpected/i);
    expect(() => tokenize('2d6 & 1')).toThrowError(/unexpected/i);
  });

  it('produces no tokens for empty / whitespace-only input', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize('   ')).toEqual([]);
  });
});
