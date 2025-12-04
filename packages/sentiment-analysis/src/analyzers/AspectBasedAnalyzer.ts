/**
 * Aspect-based sentiment analysis
 * Extracts specific aspects and their associated sentiments
 */

import type { AspectSentiment, SentimentScore } from '../core/types.js';
import { BertSentimentModel } from '../models/BertSentimentModel.js';

export class AspectBasedAnalyzer {
  private sentimentModel: BertSentimentModel;

  constructor(sentimentModel: BertSentimentModel) {
    this.sentimentModel = sentimentModel;
  }

  async analyzeAspects(text: string): Promise<AspectSentiment[]> {
    // Extract aspects (nouns and noun phrases)
    const aspects = this.extractAspects(text);

    if (aspects.length === 0) {
      return [];
    }

    const aspectSentiments: AspectSentiment[] = [];

    // Analyze sentiment for each aspect
    for (const aspect of aspects) {
      const aspectContext = this.getAspectContext(text, aspect);
      const sentiment = await this.sentimentModel.analyzeSentiment(aspectContext);

      aspectSentiments.push({
        aspect,
        sentiment,
        confidence: this.calculateConfidence(sentiment),
        mentions: this.countMentions(text, aspect),
      });
    }

    return aspectSentiments;
  }

  private extractAspects(text: string): string[] {
    // Simple noun extraction (in production, use NLP library like compromise)
    const words = text.toLowerCase().split(/\s+/);
    const aspects = new Set<string>();

    // Common domain-specific aspects for intelligence analysis
    const domainAspects = [
      'threat',
      'risk',
      'security',
      'intelligence',
      'operation',
      'attack',
      'defense',
      'vulnerability',
      'target',
      'source',
      'credibility',
      'reliability',
      'accuracy',
      'timeliness',
    ];

    for (const word of words) {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (domainAspects.includes(cleanWord)) {
        aspects.add(cleanWord);
      }
    }

    return Array.from(aspects);
  }

  private getAspectContext(text: string, aspect: string, windowSize = 50): string {
    const lowerText = text.toLowerCase();
    const aspectIndex = lowerText.indexOf(aspect);

    if (aspectIndex === -1) {
      return text;
    }

    const start = Math.max(0, aspectIndex - windowSize);
    const end = Math.min(text.length, aspectIndex + aspect.length + windowSize);

    return text.substring(start, end);
  }

  private countMentions(text: string, aspect: string): number {
    const lowerText = text.toLowerCase();
    const regex = new RegExp(aspect, 'gi');
    const matches = lowerText.match(regex);
    return matches ? matches.length : 0;
  }

  private calculateConfidence(sentiment: SentimentScore): number {
    // Confidence based on how decisive the sentiment is
    const maxScore = Math.max(sentiment.positive, sentiment.negative, sentiment.neutral);
    return maxScore;
  }
}
