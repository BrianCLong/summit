/**
 * Signal Aggregator
 * Combines multiple signals into unified trading signals
 */

import { PriceData } from '@intelgraph/market-data';
import { AnalysisResult } from '@intelgraph/technical-analysis';
import { TradingSignal, SignalType, SignalSource, SentimentData, MLPrediction } from '../types';
import { v4 as uuidv4 } from 'crypto';

export interface AggregationConfig {
  weights?: {
    technical?: number;
    sentiment?: number;
    ml?: number;
    pattern?: number;
  };
  minConfidence?: number;
  minStrength?: number;
}

export class SignalAggregator {
  private config: AggregationConfig;

  constructor(config: AggregationConfig = {}) {
    this.config = {
      weights: {
        technical: 0.3,
        sentiment: 0.2,
        ml: 0.3,
        pattern: 0.2,
        ...config.weights,
      },
      minConfidence: config.minConfidence || 0.5,
      minStrength: config.minStrength || 0.3,
      ...config,
    };
  }

  /**
   * Aggregate multiple signals into a composite signal
   */
  aggregate(
    symbol: string,
    currentPrice: number,
    technicalAnalysis?: AnalysisResult,
    sentiment?: SentimentData,
    mlPrediction?: MLPrediction
  ): TradingSignal | null {
    const sources: SignalSource[] = [];
    let totalWeight = 0;
    let weightedScore = 0;
    let weightedConfidence = 0;

    // Technical analysis signals
    if (technicalAnalysis) {
      const techSignal = this.extractTechnicalSignal(technicalAnalysis);
      if (techSignal) {
        sources.push(techSignal);
        totalWeight += this.config.weights!.technical!;
        weightedScore += techSignal.value * this.config.weights!.technical!;
        weightedConfidence += techSignal.confidence * this.config.weights!.technical!;
      }
    }

    // Sentiment signal
    if (sentiment) {
      const sentimentSignal = this.extractSentimentSignal(sentiment);
      if (sentimentSignal) {
        sources.push(sentimentSignal);
        totalWeight += this.config.weights!.sentiment!;
        weightedScore += sentimentSignal.value * this.config.weights!.sentiment!;
        weightedConfidence += sentimentSignal.confidence * this.config.weights!.sentiment!;
      }
    }

    // ML prediction signal
    if (mlPrediction) {
      const mlSignal = this.extractMLSignal(mlPrediction);
      if (mlSignal) {
        sources.push(mlSignal);
        totalWeight += this.config.weights!.ml!;
        weightedScore += mlSignal.value * this.config.weights!.ml!;
        weightedConfidence += mlSignal.confidence * this.config.weights!.ml!;
      }
    }

    // Pattern signals
    if (technicalAnalysis?.patterns && technicalAnalysis.patterns.length > 0) {
      const patternSignal = this.extractPatternSignal(technicalAnalysis.patterns);
      if (patternSignal) {
        sources.push(patternSignal);
        totalWeight += this.config.weights!.pattern!;
        weightedScore += patternSignal.value * this.config.weights!.pattern!;
        weightedConfidence += patternSignal.confidence * this.config.weights!.pattern!;
      }
    }

    if (totalWeight === 0 || sources.length === 0) {
      return null;
    }

    // Calculate final score and confidence
    const finalScore = weightedScore / totalWeight;
    const finalConfidence = weightedConfidence / totalWeight;
    const strength = Math.abs(finalScore);

    // Check minimum thresholds
    if (finalConfidence < this.config.minConfidence! || strength < this.config.minStrength!) {
      return null;
    }

    // Determine direction
    const direction: 'BUY' | 'SELL' | 'HOLD' =
      finalScore > 0.3 ? 'BUY' :
      finalScore < -0.3 ? 'SELL' :
      'HOLD';

    // Calculate target price and stop loss
    const volatility = this.estimateVolatility(technicalAnalysis);
    const targetPrice = direction === 'BUY' ?
      currentPrice * (1 + volatility * 2 * strength) :
      direction === 'SELL' ?
      currentPrice * (1 - volatility * 2 * strength) :
      undefined;

    const stopLoss = direction === 'BUY' ?
      currentPrice * (1 - volatility * strength) :
      direction === 'SELL' ?
      currentPrice * (1 + volatility * strength) :
      undefined;

    return {
      id: uuidv4(),
      symbol,
      timestamp: new Date(),
      type: SignalType.COMPOSITE,
      direction,
      strength,
      confidence: finalConfidence,
      price: currentPrice,
      targetPrice,
      stopLoss,
      timeHorizon: this.determineTimeHorizon(sources),
      sources,
    };
  }

  /**
   * Extract signal from technical analysis
   */
  private extractTechnicalSignal(analysis: AnalysisResult): SignalSource | null {
    const indicators = analysis.indicators;

    // Get RSI
    const rsi = indicators.rsi?.data[indicators.rsi.data.length - 1]?.value;
    const macdHist = indicators.macd_histogram?.data[indicators.macd_histogram.data.length - 1]?.value;

    if (!rsi || macdHist === undefined) {
      return null;
    }

    // RSI: < 30 = oversold (buy), > 70 = overbought (sell)
    const rsiSignal = rsi < 30 ? 1 : rsi > 70 ? -1 : 0;

    // MACD: positive histogram = bullish, negative = bearish
    const macdSignal = macdHist > 0 ? 1 : macdHist < 0 ? -1 : 0;

    // Trend
    const trend = analysis.trendAnalysis;
    const trendSignal = trend?.trend === 'UPTREND' ? 1 :
                       trend?.trend === 'DOWNTREND' ? -1 : 0;

    // Combined technical signal
    const value = (rsiSignal * 0.3 + macdSignal * 0.4 + trendSignal * 0.3);
    const confidence = Math.min(1, (Math.abs(rsiSignal) + Math.abs(macdSignal) + (trend?.strength || 0)) / 3);

    return {
      type: SignalType.TECHNICAL,
      name: 'Technical Indicators',
      weight: this.config.weights!.technical!,
      value,
      confidence,
    };
  }

  /**
   * Extract signal from sentiment data
   */
  private extractSentimentSignal(sentiment: SentimentData): SignalSource | null {
    const { score, volume } = sentiment;

    // Normalize volume (assuming max volume of 10000)
    const volumeScore = Math.min(volume / 10000, 1);

    return {
      type: SignalType.SENTIMENT,
      name: 'Market Sentiment',
      weight: this.config.weights!.sentiment!,
      value: score,
      confidence: volumeScore,
    };
  }

  /**
   * Extract signal from ML prediction
   */
  private extractMLSignal(prediction: MLPrediction): SignalSource | null {
    const priceChange = (prediction.predictedPrice - prediction.currentPrice) / prediction.currentPrice;

    return {
      type: SignalType.ML_PREDICTION,
      name: 'ML Prediction',
      weight: this.config.weights!.ml!,
      value: Math.max(-1, Math.min(1, priceChange * 10)), // Normalize to -1 to 1
      confidence: prediction.confidence,
    };
  }

  /**
   * Extract signal from patterns
   */
  private extractPatternSignal(patterns: any[]): SignalSource | null {
    if (patterns.length === 0) return null;

    // Use the most confident pattern
    const bestPattern = patterns[0];

    const value = bestPattern.direction === 'BULLISH' ? 1 :
                 bestPattern.direction === 'BEARISH' ? -1 : 0;

    return {
      type: SignalType.PATTERN,
      name: `Pattern: ${bestPattern.type}`,
      weight: this.config.weights!.pattern!,
      value,
      confidence: bestPattern.confidence,
    };
  }

  /**
   * Estimate volatility from technical analysis
   */
  private estimateVolatility(analysis?: AnalysisResult): number {
    if (!analysis?.indicators.bb_upper || !analysis?.indicators.bb_lower) {
      return 0.02; // Default 2%
    }

    const bbUpper = analysis.indicators.bb_upper.data;
    const bbLower = analysis.indicators.bb_lower.data;
    const bbMiddle = analysis.indicators.bb_middle.data;

    if (bbUpper.length === 0 || bbMiddle.length === 0) {
      return 0.02;
    }

    const lastUpper = bbUpper[bbUpper.length - 1].value;
    const lastMiddle = bbMiddle[bbMiddle.length - 1].value;

    return (lastUpper - lastMiddle) / lastMiddle;
  }

  /**
   * Determine time horizon based on signal sources
   */
  private determineTimeHorizon(sources: SignalSource[]): 'SHORT' | 'MEDIUM' | 'LONG' {
    // If ML prediction is present, it determines horizon
    const hasMl = sources.some(s => s.type === SignalType.ML_PREDICTION);
    if (hasMl) return 'MEDIUM';

    // Pattern-based signals are usually medium-term
    const hasPattern = sources.some(s => s.type === SignalType.PATTERN);
    if (hasPattern) return 'MEDIUM';

    // Sentiment is short-term
    const hasSentiment = sources.some(s => s.type === SignalType.SENTIMENT);
    if (hasSentiment && sources.length === 1) return 'SHORT';

    return 'MEDIUM';
  }
}
