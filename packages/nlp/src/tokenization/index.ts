/**
 * Tokenization and sentence segmentation
 */

import type { Token, Sentence, TokenizationOptions } from '../types';

export class Tokenizer {
  private options: TokenizationOptions;

  constructor(options: TokenizationOptions = {}) {
    this.options = options;
  }

  /**
   * Tokenize text into words
   */
  tokenize(text: string): Token[] {
    const tokens: Token[] = [];

    // Word boundary tokenization with special handling
    const pattern = this.buildTokenPattern();
    const matches = text.matchAll(pattern);

    for (const match of matches) {
      if (match[0] && match.index !== undefined) {
        tokens.push({
          text: match[0],
          start: match.index,
          end: match.index + match[0].length,
        });
      }
    }

    return tokens;
  }

  /**
   * Tokenize into sentences
   */
  sentenceTokenize(text: string): Sentence[] {
    const sentences: Sentence[] = [];

    // Sentence boundary detection
    const sentencePattern = /[^.!?]+[.!?]+/g;
    const matches = text.matchAll(sentencePattern);

    for (const match of matches) {
      if (match[0] && match.index !== undefined) {
        const sentenceText = match[0].trim();
        const tokens = this.tokenize(sentenceText);

        sentences.push({
          text: sentenceText,
          start: match.index,
          end: match.index + match[0].length,
          tokens,
        });
      }
    }

    // Handle text without sentence terminators
    if (sentences.length === 0 && text.trim()) {
      const tokens = this.tokenize(text);
      sentences.push({
        text: text.trim(),
        start: 0,
        end: text.length,
        tokens,
      });
    }

    return sentences;
  }

  /**
   * Build tokenization pattern based on options
   */
  private buildTokenPattern(): RegExp {
    let pattern = '';

    if (this.options.preserveUrls) {
      pattern += '|https?://\\S+';
    }

    if (this.options.preserveEmails) {
      pattern += '|[\\w.-]+@[\\w.-]+\\.\\w+';
    }

    if (this.options.preserveMentions) {
      pattern += '|@\\w+';
    }

    if (this.options.preserveHashtags) {
      pattern += '|#\\w+';
    }

    // Default word tokenization
    pattern += '|\\w+';

    // Remove leading pipe
    pattern = pattern.substring(1);

    return new RegExp(pattern, 'gi');
  }

  /**
   * Tokenize and preserve positions
   */
  tokenizeWithPositions(text: string): Array<{ token: string; start: number; end: number }> {
    return this.tokenize(text).map((token) => ({
      token: token.text,
      start: token.start,
      end: token.end,
    }));
  }
}

/**
 * Quick tokenization utilities
 */
export const tokenization = {
  /**
   * Simple word tokenization
   */
  words(text: string): string[] {
    return text.match(/\w+/g) || [];
  },

  /**
   * Simple sentence tokenization
   */
  sentences(text: string): string[] {
    return text.match(/[^.!?]+[.!?]+/g) || [text];
  },

  /**
   * N-gram generation
   */
  ngrams(tokens: string[], n: number): string[][] {
    const ngrams: string[][] = [];
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n));
    }
    return ngrams;
  },

  /**
   * Character n-grams
   */
  charNgrams(text: string, n: number): string[] {
    const ngrams: string[] = [];
    for (let i = 0; i <= text.length - n; i++) {
      ngrams.push(text.substring(i, i + n));
    }
    return ngrams;
  },
};

export * from './advanced';
