/**
 * Precursor Extractor Algorithm
 * Identifies leading indicators that precede anomalies
 */

import {
  PrecursorSignal,
  PrecursorSignalCreate,
  PatternShape,
  ThresholdStatus,
  SignalPattern,
  SignalThresholds,
} from '../models/PrecursorSignal.js';
import { TimeSeries, DataPoint } from '../models/TimeWarpedTimeline.js';
import { randomUUID } from 'crypto';

export interface ExtractorConfig {
  minReliability: number;
  maxLeadTimeMs: number;
  minLeadTimeMs: number;
  significanceThreshold: number;
}

export interface CandidateSignal {
  metricName: string;
  leadTimeMs: number;
  reliability: number;
  grangerPValue: number;
  crossCorrelation: number;
  mutualInformation: number;
}

export class PrecursorExtractor {
  private config: ExtractorConfig;

  constructor(config: ExtractorConfig) {
    this.config = config;
  }

  /**
   * Extract precursor signals for an anomaly
   */
  async extract(
    anomalyPredictionId: string,
    timeSeriesData: TimeSeries[],
    anomalyOnsetTime: Date,
  ): Promise<PrecursorSignalCreate[]> {
    const precursors: PrecursorSignalCreate[] = [];

    // Identify candidate signals
    const candidates = this.identifyCandidates(
      timeSeriesData,
      anomalyOnsetTime,
    );

    // Test temporal precedence
    const validPrecursors = this.testTemporalPrecedence(
      candidates,
      timeSeriesData,
      anomalyOnsetTime,
    );

    // Rank and filter
    const rankedPrecursors = this.rankPrecursors(validPrecursors);

    // Extract signal patterns
    for (const candidate of rankedPrecursors) {
      if (candidate.reliability >= this.config.minReliability) {
        const timeSeries = timeSeriesData.find(
          (ts) => ts.metricName === candidate.metricName,
        );
        if (!timeSeries) continue;

        const pattern = this.extractPattern(timeSeries, anomalyOnsetTime);
        const thresholds = this.calculateThresholds(timeSeries);
        const currentValue = this.getCurrentValue(timeSeries);

        precursors.push({
          anomalyPredictionId,
          signalName: candidate.metricName,
          leadTimeMs: candidate.leadTimeMs,
          reliability: candidate.reliability,
          currentValue,
          characteristicPattern: pattern,
          thresholds,
        });
      }
    }

    return precursors;
  }

  /**
   * Identify candidate signals from time series
   */
  private identifyCandidates(
    timeSeriesData: TimeSeries[],
    anomalyOnsetTime: Date,
  ): CandidateSignal[] {
    const candidates: CandidateSignal[] = [];

    for (const ts of timeSeriesData) {
      // Filter data before anomaly onset
      const preAnomalyData = ts.dataPoints.filter(
        (p) => p.timestamp < anomalyOnsetTime,
      );

      if (preAnomalyData.length < 10) continue;

      // Calculate lead time (time between last data point and anomaly)
      const lastPoint = preAnomalyData[preAnomalyData.length - 1];
      const leadTimeMs =
        anomalyOnsetTime.getTime() - lastPoint.timestamp.getTime();

      if (
        leadTimeMs < this.config.minLeadTimeMs ||
        leadTimeMs > this.config.maxLeadTimeMs
      ) {
        continue;
      }

      candidates.push({
        metricName: ts.metricName,
        leadTimeMs,
        reliability: 0, // Will be calculated
        grangerPValue: 0,
        crossCorrelation: 0,
        mutualInformation: 0,
      });
    }

    return candidates;
  }

  /**
   * Test temporal precedence using statistical tests
   */
  private testTemporalPrecedence(
    candidates: CandidateSignal[],
    timeSeriesData: TimeSeries[],
    anomalyOnsetTime: Date,
  ): CandidateSignal[] {
    const validCandidates: CandidateSignal[] = [];

    for (const candidate of candidates) {
      const ts = timeSeriesData.find(
        (t) => t.metricName === candidate.metricName,
      );
      if (!ts) continue;

      // Simplified Granger causality test
      const grangerPValue = this.grangerCausalityTest(ts, anomalyOnsetTime);

      // Cross-correlation at lag
      const crossCorr = this.crossCorrelation(ts, anomalyOnsetTime);

      // Mutual information (simplified)
      const mutualInfo = this.mutualInformation(ts, anomalyOnsetTime);

      // Update candidate with test results
      candidate.grangerPValue = grangerPValue;
      candidate.crossCorrelation = crossCorr;
      candidate.mutualInformation = mutualInfo;

      // Calculate overall reliability
      candidate.reliability = this.calculateReliability(
        grangerPValue,
        crossCorr,
        mutualInfo,
      );

      if (candidate.reliability >= this.config.minReliability) {
        validCandidates.push(candidate);
      }
    }

    return validCandidates;
  }

  /**
   * Simplified Granger causality test
   * Returns p-value (lower = more significant)
   */
  private grangerCausalityTest(
    timeSeries: TimeSeries,
    anomalyOnsetTime: Date,
  ): number {
    const values = timeSeries.dataPoints
      .filter((p) => p.timestamp < anomalyOnsetTime)
      .map((p) => p.value);

    if (values.length < 20) return 1.0; // Not enough data

    // Build autoregressive model with and without lagged values
    const order = Math.min(5, Math.floor(values.length / 4));

    // Restricted model: X(t) = α + Σ β_i X(t-i) + ε
    const rss1 = this.calculateAutoregressiveRSS(values, order, false);

    // Unrestricted model: X(t) = α + Σ β_i X(t-i) + Σ γ_j Y(t-j) + ε
    // (simplified: we use same series as both X and Y for demonstration)
    const rss2 = this.calculateAutoregressiveRSS(values, order, true);

    // F-statistic
    const n = values.length;
    const fStat = ((rss1 - rss2) / order) / (rss2 / (n - 2 * order - 1));

    // Convert to pseudo p-value (simplified)
    const pValue = Math.exp(-Math.abs(fStat) / 10);

    return pValue;
  }

  /**
   * Calculate RSS for autoregressive model
   */
  private calculateAutoregressiveRSS(
    values: number[],
    order: number,
    includeSecondSeries: boolean,
  ): number {
    let rss = 0;
    const n = values.length;

    for (let t = order; t < n; t++) {
      let prediction = 0;

      // AR coefficients (simplified: equal weights)
      for (let i = 1; i <= order; i++) {
        prediction += values[t - i] / order;
      }

      if (includeSecondSeries) {
        // Add influence from "other" series (simplified)
        for (let i = 1; i <= order; i++) {
          prediction += values[t - i] / (order * 2);
        }
      }

      rss += Math.pow(values[t] - prediction, 2);
    }

    return rss;
  }

  /**
   * Calculate cross-correlation at optimal lag
   */
  private crossCorrelation(
    timeSeries: TimeSeries,
    anomalyOnsetTime: Date,
  ): number {
    const values = timeSeries.dataPoints
      .filter((p) => p.timestamp < anomalyOnsetTime)
      .map((p) => p.value);

    if (values.length < 10) return 0;

    // Create binary anomaly indicator (1 near anomaly, 0 elsewhere)
    const anomalyIndicator = values.map((_, idx) => {
      const proximity = (values.length - idx) / values.length;
      return proximity > 0.8 ? 1 : 0; // Last 20% marked as pre-anomaly
    });

    // Calculate correlation
    const corr = this.pearsonCorrelation(values, anomalyIndicator);

    return Math.abs(corr);
  }

  /**
   * Pearson correlation coefficient
   */
  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n === 0) return 0;

    const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denom1 = 0;
    let denom2 = 0;

    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;
      numerator += diffX * diffY;
      denom1 += diffX * diffX;
      denom2 += diffY * diffY;
    }

    if (denom1 === 0 || denom2 === 0) return 0;

    return numerator / Math.sqrt(denom1 * denom2);
  }

  /**
   * Simplified mutual information
   */
  private mutualInformation(
    timeSeries: TimeSeries,
    anomalyOnsetTime: Date,
  ): number {
    const values = timeSeries.dataPoints
      .filter((p) => p.timestamp < anomalyOnsetTime)
      .map((p) => p.value);

    if (values.length < 10) return 0;

    // Discretize values into bins
    const bins = 5;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binSize = (max - min) / bins;

    const discretized = values.map((v) =>
      Math.min(Math.floor((v - min) / binSize), bins - 1),
    );

    // Create binary anomaly proximity indicator
    const anomalyBins = values.map((_, idx) => {
      const proximity = (values.length - idx) / values.length;
      return proximity > 0.8 ? 1 : 0;
    });

    // Calculate joint and marginal probabilities
    const joint: Map<string, number> = new Map();
    const marginalX: Map<number, number> = new Map();
    const marginalY: Map<number, number> = new Map();

    for (let i = 0; i < discretized.length; i++) {
      const x = discretized[i];
      const y = anomalyBins[i];
      const key = `${x},${y}`;

      joint.set(key, (joint.get(key) || 0) + 1);
      marginalX.set(x, (marginalX.get(x) || 0) + 1);
      marginalY.set(y, (marginalY.get(y) || 0) + 1);
    }

    const n = discretized.length;
    let mi = 0;

    joint.forEach((count, key) => {
      const [x, y] = key.split(',').map(Number);
      const pXY = count / n;
      const pX = (marginalX.get(x) || 0) / n;
      const pY = (marginalY.get(y) || 0) / n;

      if (pXY > 0 && pX > 0 && pY > 0) {
        mi += pXY * Math.log2(pXY / (pX * pY));
      }
    });

    return Math.max(mi, 0);
  }

  /**
   * Calculate overall reliability from statistical tests
   */
  private calculateReliability(
    grangerPValue: number,
    crossCorr: number,
    mutualInfo: number,
  ): number {
    // Combine tests (lower p-value, higher correlation/MI = higher reliability)
    const grangerScore = 1 - grangerPValue; // Invert p-value
    const corrScore = Math.abs(crossCorr);
    const miScore = Math.min(mutualInfo / 0.5, 1.0); // Normalize

    // Weighted average
    return (grangerScore * 0.4 + corrScore * 0.4 + miScore * 0.2);
  }

  /**
   * Rank precursors by importance
   */
  private rankPrecursors(candidates: CandidateSignal[]): CandidateSignal[] {
    return candidates.sort((a, b) => {
      // Score: reliability * leadTime (longer lead time = more valuable)
      const scoreA = a.reliability * Math.log10(a.leadTimeMs + 1);
      const scoreB = b.reliability * Math.log10(b.leadTimeMs + 1);
      return scoreB - scoreA; // Descending
    });
  }

  /**
   * Extract characteristic pattern from time series
   */
  private extractPattern(
    timeSeries: TimeSeries,
    anomalyOnsetTime: Date,
  ): SignalPattern {
    const values = timeSeries.dataPoints
      .filter((p) => p.timestamp < anomalyOnsetTime)
      .map((p) => p.value);

    // Determine pattern shape
    const shape = this.determinePatternShape(values);

    // Calculate typical duration
    const typicalDurationMs = this.calculatePatternDuration(
      timeSeries,
      anomalyOnsetTime,
    );

    // Pattern confidence based on consistency
    const confidenceScore = this.calculatePatternConfidence(values, shape);

    return {
      shape,
      typicalDurationMs,
      description: this.describePattern(shape, values),
      confidenceScore,
    };
  }

  /**
   * Determine characteristic pattern shape
   */
  private determinePatternShape(values: number[]): PatternShape {
    if (values.length < 5) return PatternShape.STEP;

    // Calculate trend
    const trend = this.calculateTrend(values);

    // Calculate volatility
    const volatility = this.calculateVolatility(values);

    // Detect oscillation
    const isOscillating = this.detectOscillation(values);

    // Detect step change
    const hasStepChange = this.detectStepChange(values);

    // Detect spike
    const hasSpike = this.detectSpike(values);

    // Classify
    if (hasSpike) return PatternShape.SPIKE;
    if (hasStepChange) return PatternShape.STEP;
    if (isOscillating) return PatternShape.OSCILLATING;
    if (trend > 0.5) return PatternShape.INCREASING;
    if (trend < -0.5) return PatternShape.DECREASING;

    return PatternShape.PLATEAU;
  }

  private calculateTrend(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;

    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += Math.pow(i - xMean, 2);
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;

    const returns: number[] = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] !== 0) {
        returns.push((values[i] - values[i - 1]) / Math.abs(values[i - 1]));
      }
    }

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
      returns.length;

    return Math.sqrt(variance);
  }

  private detectOscillation(values: number[]): boolean {
    let signChanges = 0;

    for (let i = 2; i < values.length; i++) {
      const diff1 = values[i - 1] - values[i - 2];
      const diff2 = values[i] - values[i - 1];

      if (diff1 * diff2 < 0) {
        signChanges++;
      }
    }

    return signChanges > values.length / 3; // More than 1/3 sign changes
  }

  private detectStepChange(values: number[]): boolean {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
        values.length,
    );

    for (let i = 1; i < values.length; i++) {
      const diff = Math.abs(values[i] - values[i - 1]);
      if (diff > 2 * stdDev) {
        return true;
      }
    }

    return false;
  }

  private detectSpike(values: number[]): boolean {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
        values.length,
    );

    for (const value of values) {
      if (Math.abs(value - mean) > 3 * stdDev) {
        return true;
      }
    }

    return false;
  }

  private calculatePatternDuration(
    timeSeries: TimeSeries,
    anomalyOnsetTime: Date,
  ): number {
    const preAnomalyData = timeSeries.dataPoints.filter(
      (p) => p.timestamp < anomalyOnsetTime,
    );

    if (preAnomalyData.length < 2) return 0;

    const startTime = preAnomalyData[0].timestamp.getTime();
    const endTime =
      preAnomalyData[preAnomalyData.length - 1].timestamp.getTime();

    return endTime - startTime;
  }

  private calculatePatternConfidence(
    values: number[],
    shape: PatternShape,
  ): number {
    // Confidence based on how well values match expected shape
    let matchScore = 0.5; // Base confidence

    const trend = this.calculateTrend(values);

    switch (shape) {
      case PatternShape.INCREASING:
        matchScore = trend > 0 ? Math.min(trend * 2, 1.0) : 0.3;
        break;
      case PatternShape.DECREASING:
        matchScore = trend < 0 ? Math.min(Math.abs(trend) * 2, 1.0) : 0.3;
        break;
      case PatternShape.OSCILLATING:
        matchScore = this.detectOscillation(values) ? 0.8 : 0.4;
        break;
      default:
        matchScore = 0.6;
    }

    return matchScore;
  }

  private describePattern(shape: PatternShape, values: number[]): string {
    const trend = this.calculateTrend(values);
    const volatility = this.calculateVolatility(values);

    switch (shape) {
      case PatternShape.INCREASING:
        return `Steadily increasing trend (slope: ${trend.toFixed(2)})`;
      case PatternShape.DECREASING:
        return `Steadily decreasing trend (slope: ${trend.toFixed(2)})`;
      case PatternShape.OSCILLATING:
        return `Oscillating pattern with volatility ${(volatility * 100).toFixed(1)}%`;
      case PatternShape.SPIKE:
        return 'Sudden spike detected';
      case PatternShape.STEP:
        return 'Step change detected';
      case PatternShape.PLATEAU:
        return 'Stable plateau';
      default:
        return 'Pattern detected';
    }
  }

  private calculateThresholds(timeSeries: TimeSeries): SignalThresholds {
    const values = timeSeries.dataPoints.map((p) => p.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
        values.length,
    );

    const warning = mean + 2 * stdDev;
    const critical = mean + 3 * stdDev;
    const currentValue = this.getCurrentValue(timeSeries);

    let currentStatus = ThresholdStatus.NORMAL;
    if (currentValue !== null) {
      if (currentValue >= critical) {
        currentStatus = ThresholdStatus.CRITICAL;
      } else if (currentValue >= warning) {
        currentStatus = ThresholdStatus.WARNING;
      }
    }

    return {
      warning,
      critical,
      currentStatus,
    };
  }

  private getCurrentValue(timeSeries: TimeSeries): number | null {
    if (timeSeries.dataPoints.length === 0) return null;
    return timeSeries.dataPoints[timeSeries.dataPoints.length - 1].value;
  }
}
