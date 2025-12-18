/**
 * Sentiment Analyzer - Analyzes sentiment and emotions in social media content
 */

import Sentiment from 'sentiment';
import type { SentimentScore, Entity } from '../types/index.js';

export class SentimentAnalyzer {
  private sentiment: Sentiment;

  constructor() {
    this.sentiment = new Sentiment();
  }

  /**
   * Analyze sentiment of text
   */
  analyze(text: string): SentimentScore {
    const result = this.sentiment.analyze(text);

    // Normalize score to -1 to 1 range
    const polarity = Math.max(-1, Math.min(1, result.score / 10));

    // Simple emotion detection based on keywords
    const emotion = this.detectEmotion(text);

    return {
      polarity,
      subjectivity: this.calculateSubjectivity(text),
      emotion,
      label: polarity > 0.1 ? 'positive' : polarity < -0.1 ? 'negative' : 'neutral'
    };
  }

  /**
   * Analyze sentiment trends over time
   */
  analyzeTrends(
    posts: Array<{ content: string; timestamp: Date }>
  ): {
    overall: SentimentScore;
    trend: 'improving' | 'declining' | 'stable';
    timeline: Array<{ date: Date; sentiment: number }>;
  } {
    const sentiments = posts.map(post => ({
      date: post.timestamp,
      sentiment: this.analyze(post.content).polarity
    }));

    // Calculate overall sentiment
    const avgPolarity = sentiments.reduce((sum, s) => sum + s.sentiment, 0) / sentiments.length;

    // Calculate trend (simple linear regression)
    const trend = this.calculateTrend(sentiments.map(s => s.sentiment));

    return {
      overall: {
        polarity: avgPolarity,
        subjectivity: 0.5,
        label: avgPolarity > 0.1 ? 'positive' : avgPolarity < -0.1 ? 'negative' : 'neutral'
      },
      trend,
      timeline: sentiments
    };
  }

  /**
   * Extract entities from text (simple version)
   */
  extractEntities(text: string): Entity[] {
    const entities: Entity[] = [];

    // Extract mentions (@username)
    const mentions = text.match(/@(\w+)/g);
    if (mentions) {
      mentions.forEach(mention => {
        entities.push({
          type: 'person',
          text: mention.substring(1),
          confidence: 0.9
        });
      });
    }

    // Extract hashtags (#topic)
    const hashtags = text.match(/#(\w+)/g);
    if (hashtags) {
      hashtags.forEach(hashtag => {
        entities.push({
          type: 'event',
          text: hashtag.substring(1),
          confidence: 0.8
        });
      });
    }

    // Extract URLs
    const urls = text.match(/https?:\/\/[^\s]+/g);
    if (urls) {
      urls.forEach(url => {
        entities.push({
          type: 'organization',
          text: url,
          confidence: 0.7
        });
      });
    }

    return entities;
  }

  /**
   * Detect emotion from text (simplified)
   */
  private detectEmotion(text: string): {
    joy?: number;
    anger?: number;
    fear?: number;
    sadness?: number;
    surprise?: number;
  } {
    const lowerText = text.toLowerCase();
    const emotion: any = {};

    // Joy keywords
    const joyKeywords = ['happy', 'joy', 'excited', 'love', 'great', 'awesome', 'wonderful'];
    emotion.joy = this.countKeywords(lowerText, joyKeywords) / joyKeywords.length;

    // Anger keywords
    const angerKeywords = ['angry', 'mad', 'hate', 'furious', 'outraged'];
    emotion.anger = this.countKeywords(lowerText, angerKeywords) / angerKeywords.length;

    // Fear keywords
    const fearKeywords = ['scared', 'afraid', 'terrified', 'worried', 'anxious'];
    emotion.fear = this.countKeywords(lowerText, fearKeywords) / fearKeywords.length;

    // Sadness keywords
    const sadnessKeywords = ['sad', 'depressed', 'unhappy', 'miserable', 'disappointed'];
    emotion.sadness = this.countKeywords(lowerText, sadnessKeywords) / sadnessKeywords.length;

    // Surprise keywords
    const surpriseKeywords = ['surprised', 'shocked', 'amazed', 'unexpected'];
    emotion.surprise = this.countKeywords(lowerText, surpriseKeywords) / surpriseKeywords.length;

    return emotion;
  }

  /**
   * Count keyword occurrences
   */
  private countKeywords(text: string, keywords: string[]): number {
    let count = 0;
    keywords.forEach(keyword => {
      if (text.includes(keyword)) count++;
    });
    return count;
  }

  /**
   * Calculate subjectivity (0-1)
   */
  private calculateSubjectivity(text: string): number {
    const subjectiveIndicators = [
      'i think',
      'i feel',
      'i believe',
      'in my opinion',
      'seems',
      'probably',
      'maybe'
    ];

    let score = 0.5; // Base subjectivity
    const lowerText = text.toLowerCase();

    subjectiveIndicators.forEach(indicator => {
      if (lowerText.includes(indicator)) {
        score += 0.1;
      }
    });

    return Math.min(1, score);
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(values: number[]): 'improving' | 'declining' | 'stable' {
    if (values.length < 2) return 'stable';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const diff = avgSecond - avgFirst;

    if (Math.abs(diff) < 0.1) return 'stable';
    return diff > 0 ? 'improving' : 'declining';
  }
}
