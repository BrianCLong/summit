/**
 * Advanced tokenization with linguistic features
 */

import type { Token, Sentence } from '../types';

export class AdvancedTokenizer {
  /**
   * Tokenize with part-of-speech tagging (simplified)
   */
  tokenizeWithPOS(text: string): Token[] {
    const tokens = this.basicTokenize(text);

    // Simplified POS tagging (in production, use a proper POS tagger)
    return tokens.map((token) => ({
      ...token,
      pos: this.guessPOS(token.text),
    }));
  }

  /**
   * Tokenize with lemmatization
   */
  tokenizeWithLemmas(text: string): Token[] {
    const tokens = this.basicTokenize(text);

    return tokens.map((token) => ({
      ...token,
      lemma: this.lemmatize(token.text),
    }));
  }

  /**
   * Subword tokenization (BPE-style)
   */
  subwordTokenize(text: string, vocabSize: number = 1000): string[] {
    // Simplified subword tokenization
    // In production, use a proper BPE/WordPiece implementation
    const words = text.toLowerCase().match(/\w+/g) || [];
    const subwords: string[] = [];

    for (const word of words) {
      if (word.length <= 4) {
        subwords.push(word);
      } else {
        // Split into subwords
        for (let i = 0; i < word.length; i += 3) {
          subwords.push(word.substring(i, i + 3));
        }
      }
    }

    return subwords;
  }

  /**
   * Morphological tokenization
   */
  morphologicalTokenize(text: string): Array<{
    word: string;
    root: string;
    prefix?: string;
    suffix?: string;
  }> {
    const words = text.match(/\w+/g) || [];

    return words.map((word) => ({
      word,
      root: this.extractRoot(word),
      prefix: this.extractPrefix(word),
      suffix: this.extractSuffix(word),
    }));
  }

  /**
   * Basic tokenization
   */
  private basicTokenize(text: string): Token[] {
    const tokens: Token[] = [];
    const pattern = /\w+/g;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      tokens.push({
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    return tokens;
  }

  /**
   * Simplified POS guessing
   */
  private guessPOS(word: string): string {
    const lower = word.toLowerCase();

    // Very simplified POS tagging
    if (['the', 'a', 'an'].includes(lower)) return 'DET';
    if (lower.endsWith('ing')) return 'VERB';
    if (lower.endsWith('ly')) return 'ADV';
    if (lower.endsWith('ed')) return 'VERB';
    if (/^[A-Z]/.test(word)) return 'PROPN';

    return 'NOUN'; // Default
  }

  /**
   * Simplified lemmatization
   */
  private lemmatize(word: string): string {
    const lower = word.toLowerCase();

    // Very simplified lemmatization
    if (lower.endsWith('ing')) return lower.replace(/ing$/, '');
    if (lower.endsWith('ed')) return lower.replace(/ed$/, '');
    if (lower.endsWith('s') && lower.length > 3) return lower.replace(/s$/, '');

    return lower;
  }

  /**
   * Extract root from word
   */
  private extractRoot(word: string): string {
    let root = word.toLowerCase();

    // Remove common suffixes
    root = root.replace(/(ing|ed|ly|ness|tion|ment|ity)$/, '');

    return root;
  }

  /**
   * Extract prefix from word
   */
  private extractPrefix(word: string): string | undefined {
    const prefixes = ['un', 're', 'pre', 'dis', 'mis', 'over', 'under', 'out'];

    for (const prefix of prefixes) {
      if (word.toLowerCase().startsWith(prefix)) {
        return prefix;
      }
    }

    return undefined;
  }

  /**
   * Extract suffix from word
   */
  private extractSuffix(word: string): string | undefined {
    const suffixes = ['ing', 'ed', 'ly', 'ness', 'tion', 'ment', 'ity', 'able', 'ible'];

    for (const suffix of suffixes) {
      if (word.toLowerCase().endsWith(suffix)) {
        return suffix;
      }
    }

    return undefined;
  }
}
