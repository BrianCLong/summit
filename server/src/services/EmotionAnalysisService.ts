import logger from '../utils/logger';

export interface EmotionState {
  fear: number; // 0-1
  hope: number; // 0-1
  anger: number; // 0-1
  pride: number; // 0-1
  dominant: 'FEAR' | 'HOPE' | 'ANGER' | 'PRIDE' | 'NEUTRAL';
}

export interface EngagementMetrics {
  views: number;
  likes: number;
  shares: number;
  comments: number;
  clickThroughRate?: number;
}

export interface EmotionalCorrelation {
  emotion: keyof EmotionState;
  metric: keyof EngagementMetrics;
  correlationCoefficient: number; // -1 to 1
  sampleSize: number;
}

interface DataPoint {
  emotionState: EmotionState;
  metrics: EngagementMetrics;
  timestamp: Date;
}

/**
 * Emotion-Driven Content Analysis Service
 *
 * Sprint 22:
 * - Detects emotional framing (Fear, Hope, Anger, Pride).
 * - Maps correlations between emotional triggers and engagement rates.
 * - Provides data for real-time emotional signal tracking.
 */
export class EmotionAnalysisService {
  private dataPoints: DataPoint[] = [];

  // Keyword dictionaries for heuristic detection
  private readonly KEYWORDS = {
    fear: [
      'afraid', 'scared', 'terrified', 'anxious', 'worried', 'nervous', 'panic',
      'threat', 'danger', 'risk', 'warning', 'emergency', 'collapse', 'crisis',
      'deadly', 'fatal', 'doom', 'nightmare'
    ],
    hope: [
      'hope', 'optimistic', 'future', 'better', 'bright', 'promise', 'believe',
      'faith', 'inspire', 'dream', 'victory', 'solution', 'progress', 'overcome',
      'rise', 'build', 'create', 'opportunity'
    ],
    anger: [
      'angry', 'rage', 'furious', 'mad', 'hostile', 'betrayal', 'injustice',
      'corrupt', 'lie', 'stolen', 'enemy', 'revenge', 'fight', 'destroy',
      'attack', 'outrage', 'violate', 'cheat'
    ],
    pride: [
      'proud', 'pride', 'honor', 'glory', 'patriot', 'loyalty', 'heritage',
      'achievement', 'victory', 'strength', 'superior', 'legacy', 'tradition',
      'united', 'stand', 'flag', 'hero', 'triumph'
    ]
  };

  constructor() {}

  /**
   * Detects emotional framing in content using keyword heuristics.
   */
  public detectEmotionalFraming(content: string): EmotionState {
    const text = content.toLowerCase();
    const tokens = text.split(/\W+/).filter(t => t.length > 0);
    const totalTokens = tokens.length || 1;

    const scores = {
      fear: this.countMatches(tokens, this.KEYWORDS.fear),
      hope: this.countMatches(tokens, this.KEYWORDS.hope),
      anger: this.countMatches(tokens, this.KEYWORDS.anger),
      pride: this.countMatches(tokens, this.KEYWORDS.pride),
    };

    // Normalize to 0-1 based on density (matches per token), scaled up for readability
    // A score of 1.0 would mean every word is a match (unlikely).
    // Let's perform a softmax-like normalization or just simple density relative to max expected density.
    // For prototype, we'll use simple density * multiplier clamped to 1.
    const multiplier = 5.0;

    const state: EmotionState = {
      fear: Math.min(1, (scores.fear / totalTokens) * multiplier),
      hope: Math.min(1, (scores.hope / totalTokens) * multiplier),
      anger: Math.min(1, (scores.anger / totalTokens) * multiplier),
      pride: Math.min(1, (scores.pride / totalTokens) * multiplier),
      dominant: 'NEUTRAL'
    };

    // Determine dominant emotion
    let maxScore = 0;
    let dominant: EmotionState['dominant'] = 'NEUTRAL';

    if (state.fear > maxScore) { maxScore = state.fear; dominant = 'FEAR'; }
    if (state.hope > maxScore) { maxScore = state.hope; dominant = 'HOPE'; }
    if (state.anger > maxScore) { maxScore = state.anger; dominant = 'ANGER'; }
    if (state.pride > maxScore) { maxScore = state.pride; dominant = 'PRIDE'; }

    // Threshold for neutrality
    if (maxScore < 0.1) {
      dominant = 'NEUTRAL';
    }

    state.dominant = dominant;
    return state;
  }

  /**
   * Records a data point for correlation analysis.
   */
  public trackEngagement(content: string, metrics: EngagementMetrics) {
    const emotionState = this.detectEmotionalFraming(content);
    this.dataPoints.push({
      emotionState,
      metrics,
      timestamp: new Date()
    });

    // Keep memory usage in check for prototype
    if (this.dataPoints.length > 5000) {
      this.dataPoints.shift();
    }
  }

  /**
   * Calculates correlation between a specific emotion and an engagement metric.
   * Uses Pearson correlation coefficient.
   */
  public getCorrelation(emotion: keyof Omit<EmotionState, 'dominant'>, metric: keyof EngagementMetrics): EmotionalCorrelation {
    const n = this.dataPoints.length;
    if (n < 2) {
      return { emotion, metric, correlationCoefficient: 0, sampleSize: n };
    }

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    for (const point of this.dataPoints) {
      const x = point.emotionState[emotion] as number;
      const y = point.metrics[metric] || 0;

      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    }

    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    const correlation = denominator === 0 ? 0 : numerator / denominator;

    return {
      emotion,
      metric,
      correlationCoefficient: correlation,
      sampleSize: n
    };
  }

  /**
   * Returns aggregated dashboard data.
   */
  public getDashboardData() {
    // In a real app, this would return time-series buckets.
    // Here we return global correlations for key pairs.
    return {
      correlations: {
        fear_shares: this.getCorrelation('fear', 'shares'),
        anger_comments: this.getCorrelation('anger', 'comments'),
        hope_likes: this.getCorrelation('hope', 'likes'),
        pride_shares: this.getCorrelation('pride', 'shares')
      },
      recentVolume: this.dataPoints.slice(-100).length
    };
  }

  public _resetForTesting() {
      this.dataPoints = [];
  }

  private countMatches(tokens: string[], keywords: string[]): number {
    return tokens.filter(t => keywords.includes(t)).length;
  }
}
