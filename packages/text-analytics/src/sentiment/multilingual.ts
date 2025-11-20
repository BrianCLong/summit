/**
 * Multilingual sentiment analysis
 */

import { SentimentAnalyzer } from './index';
import type { SentimentResult } from '../types';

export class MultilingualSentimentAnalyzer {
  private analyzers: Map<string, SentimentAnalyzer> = new Map();

  analyze(text: string, language: string): SentimentResult {
    let analyzer = this.analyzers.get(language);
    if (!analyzer) {
      analyzer = new SentimentAnalyzer();
      this.analyzers.set(language, analyzer);
    }
    return analyzer.analyze(text);
  }
}
