// SPDX-License-Identifier: MIT

/** Thrown by the lexer on an unrecognized character. The parser converts this to a friendly error. */
export class LexError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LexError';
  }
}

export type Token =
  | { type: 'number'; value: number }
  | { type: 'd' }
  | { type: 'plus' }
  | { type: 'minus' }
  | { type: 'bang' }
  | { type: 'keepdrop'; value: 'kh' | 'kl' | 'dh' | 'dl' }
  | { type: 'keyword'; value: 'adv' | 'dis' };

const KEEPDROP = new Set(['kh', 'kl', 'dh', 'dl']);
const KEYWORDS = new Set(['adv', 'dis']);

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function isLetter(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
}

/**
 * Lex a dice-notation string into tokens. Case-insensitive for letters; whitespace is a separator
 * and is otherwise ignored. Throws {@link LexError} on any unrecognized character.
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  const src = input;
  let i = 0;

  while (i < src.length) {
    const ch = src[i] as string;

    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i += 1;
      continue;
    }

    if (ch === '+') {
      tokens.push({ type: 'plus' });
      i += 1;
      continue;
    }

    if (ch === '-') {
      tokens.push({ type: 'minus' });
      i += 1;
      continue;
    }

    if (ch === '!') {
      tokens.push({ type: 'bang' });
      i += 1;
      continue;
    }

    if (isDigit(ch)) {
      let j = i;
      while (j < src.length && isDigit(src[j] as string)) {
        j += 1;
      }
      const text = src.slice(i, j);
      tokens.push({ type: 'number', value: Number.parseInt(text, 10) });
      i = j;
      continue;
    }

    if (isLetter(ch)) {
      let j = i;
      while (j < src.length && isLetter(src[j] as string)) {
        j += 1;
      }
      const word = src.slice(i, j).toLowerCase();

      // A lone 'd' is the dice operator; a 'd' immediately followed by a non-letter
      // (digit) is also the operator. 'dh'/'dl' are keep/drop suffixes — handled below.
      if (word === 'd') {
        tokens.push({ type: 'd' });
        i = j;
        continue;
      }

      if (KEEPDROP.has(word)) {
        tokens.push({ type: 'keepdrop', value: word as 'kh' | 'kl' | 'dh' | 'dl' });
        i = j;
        continue;
      }

      if (KEYWORDS.has(word)) {
        tokens.push({ type: 'keyword', value: word as 'adv' | 'dis' });
        i = j;
        continue;
      }

      // A word that *starts* with 'd' but is longer (e.g. "d20" is split number-side
      // already; "dx" is unknown). Try to split a leading 'd' operator off so "d6"
      // would never reach here as a word — but a multi-letter unknown word is an error.
      if (word.length > 1 && word.startsWith('d')) {
        // Emit the 'd' operator, then re-lex the remainder as its own word/error.
        tokens.push({ type: 'd' });
        i += 1;
        continue;
      }

      throw new LexError(`unexpected token "${word}"`);
    }

    throw new LexError(`unexpected character "${ch}"`);
  }

  return tokens;
}
