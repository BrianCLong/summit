/**
 * Text summarization
 */

import type { SummaryResult } from '../types';

export class Summarizer {
  /**
   * Extractive summarization
   */
  async extractive(text: string, maxSentences: number = 3): Promise<SummaryResult> {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const summary = sentences.slice(0, maxSentences).join(' ');

    return {
      summary,
      type: 'extractive',
      compressionRatio: summary.length / text.length,
    };
  }

  /**
   * Abstractive summarization
   */
  async abstractive(text: string, maxLength: number = 150): Promise<SummaryResult> {
    // Simplified abstractive summarization
    // In production, use transformer-based models
    const extractiveResult = await this.extractive(text, 2);

    return {
      ...extractiveResult,
      type: 'abstractive',
    };
  }

  /**
   * Bullet point summarization
   */
  async bulletPoints(text: string, maxPoints: number = 5): Promise<string[]> {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return sentences.slice(0, maxPoints).map((s) => s.trim());
  }

  /**
   * Multi-document summarization
   */
  async multiDocument(documents: string[], maxLength: number = 300): Promise<SummaryResult> {
    const combined = documents.join(' ');
    return this.abstractive(combined, maxLength);
  }
}
