/**
 * Sentiment Analyzer
 * Analyzes market sentiment from social media and news
 */

import axios from 'axios';
import { SentimentData } from '../types';

export interface SentimentConfig {
  twitterApiKey?: string;
  redditApiKey?: string;
  newsApiKey?: string;
  updateInterval?: number;
}

export class SentimentAnalyzer {
  private config: SentimentConfig;
  private cache: Map<string, SentimentData> = new Map();

  constructor(config: SentimentConfig = {}) {
    this.config = {
      updateInterval: config.updateInterval || 300000, // 5 minutes
      ...config,
    };
  }

  /**
   * Analyze sentiment for a symbol
   */
  async analyzeSentiment(symbol: string): Promise<SentimentData> {
    // Check cache
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.timestamp.getTime() < this.config.updateInterval!) {
      return cached;
    }

    // Collect sentiment from all sources
    const sources: SentimentData['sources'] = {};
    let totalScore = 0;
    let totalVolume = 0;
    let sourceCount = 0;

    if (this.config.twitterApiKey) {
      const twitter = await this.getTwitterSentiment(symbol);
      sources.twitter = twitter.score;
      totalScore += twitter.score * twitter.volume;
      totalVolume += twitter.volume;
      sourceCount++;
    }

    if (this.config.redditApiKey) {
      const reddit = await this.getRedditSentiment(symbol);
      sources.reddit = reddit.score;
      totalScore += reddit.score * reddit.volume;
      totalVolume += reddit.volume;
      sourceCount++;
    }

    if (this.config.newsApiKey) {
      const news = await this.getNewsSentiment(symbol);
      sources.news = news.score;
      totalScore += news.score * news.volume;
      totalVolume += news.volume;
      sourceCount++;
    }

    const sentimentData: SentimentData = {
      symbol,
      timestamp: new Date(),
      score: totalVolume > 0 ? totalScore / totalVolume : 0,
      volume: totalVolume,
      sources,
      topics: [],
      entities: [],
    };

    this.cache.set(symbol, sentimentData);
    return sentimentData;
  }

  /**
   * Get Twitter sentiment (mock implementation)
   */
  private async getTwitterSentiment(
    symbol: string
  ): Promise<{ score: number; volume: number }> {
    // In production, integrate with Twitter API
    // This is a mock implementation
    try {
      // Simulate API call
      const response = await this.mockSentimentAPI('twitter', symbol);
      return {
        score: response.sentiment,
        volume: response.mention_count,
      };
    } catch (error) {
      console.error('Twitter sentiment error:', error);
      return { score: 0, volume: 0 };
    }
  }

  /**
   * Get Reddit sentiment (mock implementation)
   */
  private async getRedditSentiment(
    symbol: string
  ): Promise<{ score: number; volume: number }> {
    // In production, integrate with Reddit API (PRAW or pushshift)
    try {
      const response = await this.mockSentimentAPI('reddit', symbol);
      return {
        score: response.sentiment,
        volume: response.mention_count,
      };
    } catch (error) {
      console.error('Reddit sentiment error:', error);
      return { score: 0, volume: 0 };
    }
  }

  /**
   * Get news sentiment (mock implementation)
   */
  private async getNewsSentiment(
    symbol: string
  ): Promise<{ score: number; volume: number }> {
    // In production, integrate with news APIs (NewsAPI, Benzinga, etc.)
    try {
      const response = await this.mockSentimentAPI('news', symbol);
      return {
        score: response.sentiment,
        volume: response.article_count,
      };
    } catch (error) {
      console.error('News sentiment error:', error);
      return { score: 0, volume: 0 };
    }
  }

  /**
   * Mock sentiment API for demonstration
   */
  private async mockSentimentAPI(
    source: string,
    symbol: string
  ): Promise<{ sentiment: number; mention_count?: number; article_count?: number }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Generate mock sentiment data
    const sentiment = Math.random() * 2 - 1; // -1 to 1
    const volume = Math.floor(Math.random() * 1000);

    return {
      sentiment,
      mention_count: volume,
      article_count: volume,
    };
  }

  /**
   * Detect sentiment shifts
   */
  async detectSentimentShift(
    symbol: string,
    historicalData: SentimentData[]
  ): Promise<{
    shift: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    magnitude: number;
    significance: number;
  }> {
    if (historicalData.length < 2) {
      return { shift: 'NEUTRAL', magnitude: 0, significance: 0 };
    }

    const current = historicalData[historicalData.length - 1];
    const previous = historicalData.slice(0, -1);

    const avgPrevious = previous.reduce((sum, d) => sum + d.score, 0) / previous.length;
    const change = current.score - avgPrevious;
    const magnitude = Math.abs(change);

    // Calculate significance using volume
    const avgVolume = previous.reduce((sum, d) => sum + d.volume, 0) / previous.length;
    const volumeRatio = current.volume / (avgVolume || 1);
    const significance = magnitude * Math.min(volumeRatio, 2) / 2;

    return {
      shift: change > 0.1 ? 'POSITIVE' : change < -0.1 ? 'NEGATIVE' : 'NEUTRAL',
      magnitude,
      significance,
    };
  }

  /**
   * Calculate sentiment momentum
   */
  calculateSentimentMomentum(historicalData: SentimentData[], period: number = 10): number {
    if (historicalData.length < period) {
      return 0;
    }

    const recent = historicalData.slice(-period);
    let momentum = 0;

    for (let i = 1; i < recent.length; i++) {
      const change = recent[i].score - recent[i - 1].score;
      momentum += change;
    }

    return momentum / (period - 1);
  }

  /**
   * Get sentiment signal
   */
  getSentimentSignal(sentiment: SentimentData): {
    direction: 'BUY' | 'SELL' | 'HOLD';
    strength: number;
  } {
    const { score, volume } = sentiment;

    // Normalize volume (assuming max volume of 10000)
    const volumeScore = Math.min(volume / 10000, 1);

    // Strong positive sentiment
    if (score > 0.3 && volumeScore > 0.5) {
      return {
        direction: 'BUY',
        strength: Math.min(score * volumeScore, 1),
      };
    }

    // Strong negative sentiment
    if (score < -0.3 && volumeScore > 0.5) {
      return {
        direction: 'SELL',
        strength: Math.min(Math.abs(score) * volumeScore, 1),
      };
    }

    return {
      direction: 'HOLD',
      strength: 0,
    };
  }
}
