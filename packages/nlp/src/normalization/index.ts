/**
 * Text normalization utilities
 */

import type { NormalizationOptions } from '../types';

export class TextNormalizer {
  private options: Required<NormalizationOptions>;

  constructor(options: NormalizationOptions = {}) {
    this.options = {
      unicodeNormalization: options.unicodeNormalization ?? 'NFKC',
      caseFolding: options.caseFolding ?? true,
      accentRemoval: options.accentRemoval ?? false,
      numberNormalization: options.numberNormalization ?? false,
      whitespaceNormalization: options.whitespaceNormalization ?? true,
    };
  }

  /**
   * Normalize text according to configured options
   */
  normalize(text: string): string {
    let normalized = text;

    // Unicode normalization
    if (this.options.unicodeNormalization) {
      normalized = normalized.normalize(this.options.unicodeNormalization);
    }

    // Case folding
    if (this.options.caseFolding) {
      normalized = normalized.toLowerCase();
    }

    // Remove accents
    if (this.options.accentRemoval) {
      normalized = this.removeAccents(normalized);
    }

    // Normalize numbers
    if (this.options.numberNormalization) {
      normalized = this.normalizeNumbers(normalized);
    }

    // Normalize whitespace
    if (this.options.whitespaceNormalization) {
      normalized = this.normalizeWhitespace(normalized);
    }

    return normalized;
  }

  /**
   * Remove accent marks from characters
   */
  private removeAccents(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Normalize numbers to standard format
   */
  private normalizeNumbers(text: string): string {
    return text.replace(/\d+/g, (match) => {
      const num = parseInt(match, 10);
      return isNaN(num) ? match : num.toString();
    });
  }

  /**
   * Normalize whitespace
   */
  private normalizeWhitespace(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '');
  }
}

/**
 * Case folding utilities
 */
export const caseFolding = {
  /**
   * Convert to lowercase
   */
  toLowerCase(text: string): string {
    return text.toLowerCase();
  },

  /**
   * Convert to uppercase
   */
  toUpperCase(text: string): string {
    return text.toUpperCase();
  },

  /**
   * Title case conversion
   */
  toTitleCase(text: string): string {
    return text.replace(/\w\S*/g, (word) => {
      return word.charAt(0).toUpperCase() + word.substring(1).toLowerCase();
    });
  },

  /**
   * Sentence case conversion
   */
  toSentenceCase(text: string): string {
    return text.charAt(0).toUpperCase() + text.substring(1).toLowerCase();
  },
};

/**
 * Unicode normalization forms
 */
export const unicode = {
  /**
   * Canonical Decomposition
   */
  NFD(text: string): string {
    return text.normalize('NFD');
  },

  /**
   * Canonical Composition
   */
  NFC(text: string): string {
    return text.normalize('NFC');
  },

  /**
   * Compatibility Decomposition
   */
  NFKD(text: string): string {
    return text.normalize('NFKD');
  },

  /**
   * Compatibility Composition
   */
  NFKC(text: string): string {
    return text.normalize('NFKC');
  },
};

export * from './advanced';
