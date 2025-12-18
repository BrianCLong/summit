/**
 * Temporal sentiment tracking and trend analysis
 * Tracks sentiment over time and detects significant shifts
 */

import type { SentimentScore, SentimentTimeSeries, TimeSeriesEvent } from '../core/types.js';

export class TemporalSentimentTracker {
  private sentimentHistory: Map<string, SentimentTimeSeries> = new Map();
  private anomalyThreshold = 0.3; // Threshold for detecting significant shifts

  trackSentiment(
    entityId: string,
    sentiment: SentimentScore,
    timestamp: Date = new Date()
  ): void {
    let timeSeries = this.sentimentHistory.get(entityId);

    if (!timeSeries) {
      timeSeries = {
        timestamps: [],
        sentiments: [],
        events: [],
        trend: 'neutral',
        momentum: 0,
      };
      this.sentimentHistory.set(entityId, timeSeries);
    }

    timeSeries.timestamps.push(timestamp);
    timeSeries.sentiments.push(sentiment);

    // Detect events if we have enough data
    if (timeSeries.sentiments.length >= 2) {
      const event = this.detectEvent(timeSeries, sentiment, timestamp);
      if (event) {
        timeSeries.events.push(event);
      }
    }

    // Update trend and momentum
    this.updateTrendAnalysis(timeSeries);
  }

  getTimeSeries(entityId: string): SentimentTimeSeries | undefined {
    return this.sentimentHistory.get(entityId);
  }

  analyzeShifts(
    entityId: string,
    timeWindow?: { start: Date; end: Date }
  ): TimeSeriesEvent[] {
    const timeSeries = this.sentimentHistory.get(entityId);
    if (!timeSeries) {
      return [];
    }

    if (timeWindow) {
      return timeSeries.events.filter(
        event =>
          event.timestamp >= timeWindow.start && event.timestamp <= timeWindow.end
      );
    }

    return timeSeries.events;
  }

  calculateMomentum(sentiments: SentimentScore[]): number {
    if (sentiments.length < 2) {
      return 0;
    }

    let momentum = 0;
    for (let i = 1; i < sentiments.length; i++) {
      const diff = sentiments[i].compound - sentiments[i - 1].compound;
      momentum += diff;
    }

    return momentum / (sentiments.length - 1);
  }

  detectLeadingIndicators(entityId: string): string[] {
    const timeSeries = this.sentimentHistory.get(entityId);
    if (!timeSeries || timeSeries.sentiments.length < 5) {
      return [];
    }

    const indicators: string[] = [];
    const recentSentiments = timeSeries.sentiments.slice(-5);
    const momentum = this.calculateMomentum(recentSentiments);

    if (momentum > 0.1) {
      indicators.push('Increasing positive sentiment momentum');
    } else if (momentum < -0.1) {
      indicators.push('Increasing negative sentiment momentum');
    }

    // Check for volatility
    const volatility = this.calculateVolatility(recentSentiments);
    if (volatility > 0.2) {
      indicators.push('High sentiment volatility detected');
    }

    // Check for sustained trends
    if (this.hasSustainedTrend(recentSentiments, 'positive')) {
      indicators.push('Sustained positive trend');
    } else if (this.hasSustainedTrend(recentSentiments, 'negative')) {
      indicators.push('Sustained negative trend');
    }

    return indicators;
  }

  private detectEvent(
    timeSeries: SentimentTimeSeries,
    currentSentiment: SentimentScore,
    timestamp: Date
  ): TimeSeriesEvent | null {
    const previousSentiment = timeSeries.sentiments[timeSeries.sentiments.length - 2];
    const compoundDiff = Math.abs(currentSentiment.compound - previousSentiment.compound);

    if (compoundDiff > this.anomalyThreshold) {
      return {
        timestamp,
        type: 'shift',
        magnitude: compoundDiff,
        description: `Significant sentiment shift detected: ${previousSentiment.compound.toFixed(2)} → ${currentSentiment.compound.toFixed(2)}`,
      };
    }

    // Check for spikes (sudden extreme sentiment)
    if (Math.abs(currentSentiment.compound) > 0.8) {
      return {
        timestamp,
        type: 'spike',
        magnitude: Math.abs(currentSentiment.compound),
        description: `Sentiment spike detected: ${currentSentiment.compound.toFixed(2)}`,
      };
    }

    return null;
  }

  private updateTrendAnalysis(timeSeries: SentimentTimeSeries): void {
    if (timeSeries.sentiments.length < 3) {
      return;
    }

    const recentSentiments = timeSeries.sentiments.slice(-5);
    const momentum = this.calculateMomentum(recentSentiments);
    timeSeries.momentum = momentum;

    // Determine trend
    const volatility = this.calculateVolatility(recentSentiments);
    if (volatility > 0.25) {
      timeSeries.trend = 'volatile';
    } else if (momentum > 0.05) {
      timeSeries.trend = 'positive';
    } else if (momentum < -0.05) {
      timeSeries.trend = 'negative';
    } else {
      timeSeries.trend = 'neutral';
    }
  }

  private calculateVolatility(sentiments: SentimentScore[]): number {
    if (sentiments.length < 2) {
      return 0;
    }

    let sumSquaredDiffs = 0;
    for (let i = 1; i < sentiments.length; i++) {
      const diff = sentiments[i].compound - sentiments[i - 1].compound;
      sumSquaredDiffs += diff * diff;
    }

    return Math.sqrt(sumSquaredDiffs / (sentiments.length - 1));
  }

  private hasSustainedTrend(
    sentiments: SentimentScore[],
    direction: 'positive' | 'negative'
  ): boolean {
    if (sentiments.length < 3) {
      return false;
    }

    let consecutiveCount = 0;
    const threshold = direction === 'positive' ? 0 : 0;

    for (let i = 1; i < sentiments.length; i++) {
      const diff = sentiments[i].compound - sentiments[i - 1].compound;

      if (direction === 'positive' && diff > threshold) {
        consecutiveCount++;
      } else if (direction === 'negative' && diff < threshold) {
        consecutiveCount++;
      } else {
        consecutiveCount = 0;
      }

      if (consecutiveCount >= 3) {
        return true;
      }
    }

    return false;
  }

  clear(entityId?: string): void {
    if (entityId) {
      this.sentimentHistory.delete(entityId);
    } else {
      this.sentimentHistory.clear();
    }
  }
}
