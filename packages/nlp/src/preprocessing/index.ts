/**
 * Text preprocessing pipeline
 * Handles text cleaning, normalization, and preparation for NLP tasks
 */

import type { PreprocessingOptions, Document } from '../types';

export class TextPreprocessor {
  private options: Required<PreprocessingOptions>;

  constructor(options: PreprocessingOptions = {}) {
    this.options = {
      lowercase: options.lowercase ?? true,
      removeStopwords: options.removeStopwords ?? false,
      removePunctuation: options.removePunctuation ?? false,
      removeNumbers: options.removeNumbers ?? false,
      removeUrls: options.removeUrls ?? true,
      removeEmails: options.removeEmails ?? true,
      removeHtml: options.removeHtml ?? true,
      normalizeUnicode: options.normalizeUnicode ?? true,
      spellCheck: options.spellCheck ?? false,
      lemmatize: options.lemmatize ?? false,
      stem: options.stem ?? false,
      minTokenLength: options.minTokenLength ?? 2,
      maxTokenLength: options.maxTokenLength ?? 50,
      customStopwords: options.customStopwords ?? [],
      customPreprocessors: options.customPreprocessors ?? [],
    };
  }

  /**
   * Preprocess text according to configured options
   */
  preprocess(text: string): string {
    let processed = text;

    // Apply custom preprocessors first
    for (const preprocessor of this.options.customPreprocessors) {
      processed = preprocessor(processed);
    }

    // Remove HTML tags
    if (this.options.removeHtml) {
      processed = this.removeHtml(processed);
    }

    // Remove URLs
    if (this.options.removeUrls) {
      processed = this.removeUrls(processed);
    }

    // Remove emails
    if (this.options.removeEmails) {
      processed = this.removeEmails(processed);
    }

    // Normalize unicode
    if (this.options.normalizeUnicode) {
      processed = this.normalizeUnicode(processed);
    }

    // Lowercase
    if (this.options.lowercase) {
      processed = processed.toLowerCase();
    }

    // Remove numbers
    if (this.options.removeNumbers) {
      processed = processed.replace(/\d+/g, '');
    }

    // Remove punctuation
    if (this.options.removePunctuation) {
      processed = processed.replace(/[^\w\s]|_/g, '');
    }

    // Normalize whitespace
    processed = processed.replace(/\s+/g, ' ').trim();

    return processed;
  }

  /**
   * Remove HTML tags and entities
   */
  private removeHtml(text: string): string {
    return text
      .replace(/<[^>]*>/g, '') // Remove tags
      .replace(/&nbsp;/g, ' ') // Replace nbsp
      .replace(/&[a-z]+;/gi, ''); // Remove entities
  }

  /**
   * Remove URLs
   */
  private removeUrls(text: string): string {
    return text.replace(
      /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi,
      ''
    );
  }

  /**
   * Remove email addresses
   */
  private removeEmails(text: string): string {
    return text.replace(/[\w.-]+@[\w.-]+\.\w+/gi, '');
  }

  /**
   * Normalize unicode characters
   */
  private normalizeUnicode(text: string): string {
    return text.normalize('NFKC');
  }

  /**
   * Clean and prepare text with noise removal
   */
  clean(text: string): string {
    let cleaned = text;

    // Remove control characters
    cleaned = cleaned.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

    // Remove excessive whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');

    // Remove leading/trailing whitespace
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * Create preprocessing pipeline for batch processing
   */
  pipeline(): (text: string) => string {
    return (text: string) => this.preprocess(text);
  }
}

/**
 * Quick preprocessing utilities
 */
export const preprocessing = {
  /**
   * Remove stopwords from text
   */
  removeStopwords(text: string, language: string = 'en'): string {
    // This is a simplified implementation
    // In production, use a library like 'stopword'
    const stopwords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'will', 'with', 'this', 'but', 'they', 'have', 'had',
    ]);

    return text
      .split(/\s+/)
      .filter((word) => !stopwords.has(word.toLowerCase()))
      .join(' ');
  },

  /**
   * Remove punctuation
   */
  removePunctuation(text: string): string {
    return text.replace(/[^\w\s]|_/g, '');
  },

  /**
   * Normalize whitespace
   */
  normalizeWhitespace(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  },
};

export * from './pipeline';
