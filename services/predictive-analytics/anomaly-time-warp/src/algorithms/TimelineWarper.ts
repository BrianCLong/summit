/**
 * Timeline Warper Algorithm
 * Applies dynamic time warping to align temporal patterns
 */

import {
  TimeSeries,
  DataPoint,
  WarpedTimeline,
  WarpedTimelineCreate,
  WarpingPoint,
  TemporalLandmark,
} from '../models/TimeWarpedTimeline.js';
import { randomUUID } from 'crypto';

export interface WarpConfig {
  windowSize: number; // Constraint window for DTW
  distanceMetric: 'euclidean' | 'manhattan' | 'cosine';
  normalization: 'zscore' | 'minmax' | 'none';
}

export class TimelineWarper {
  private config: WarpConfig;

  constructor(config: WarpConfig) {
    this.config = config;
  }

  /**
   * Generate time-warped timeline aligning current pattern with reference
   */
  async warp(
    entityId: string,
    referenceAnomalyId: string,
    currentTimeline: TimeSeries,
    referenceTimeline: TimeSeries,
  ): Promise<WarpedTimelineCreate> {
    // Normalize timelines
    const normalizedCurrent = this.normalize(currentTimeline);
    const normalizedReference = this.normalize(referenceTimeline);

    // Apply dynamic time warping
    const warpingPath = this.dynamicTimeWarping(
      normalizedCurrent,
      normalizedReference,
    );

    // Generate warped timeline
    const warpedTimeline = this.applyWarping(
      normalizedCurrent,
      warpingPath,
    );

    // Calculate alignment score
    const alignmentScore = this.calculateAlignmentScore(
      normalizedCurrent,
      warpedTimeline,
      warpingPath,
    );

    // Identify temporal landmarks
    const temporalLandmarks = this.identifyLandmarks(
      warpedTimeline,
      referenceTimeline,
    );

    return {
      entityId,
      referenceAnomalyId,
      originalTimeline: currentTimeline,
      warpedTimeline,
      warpingPath,
      alignmentScore,
      temporalLandmarks,
    };
  }

  /**
   * Normalize time series values
   */
  private normalize(timeSeries: TimeSeries): TimeSeries {
    const values = timeSeries.dataPoints.map((p) => p.value);

    let normalizedValues: number[];

    switch (this.config.normalization) {
      case 'zscore':
        normalizedValues = this.zScoreNormalization(values);
        break;
      case 'minmax':
        normalizedValues = this.minMaxNormalization(values);
        break;
      case 'none':
      default:
        normalizedValues = values;
    }

    return {
      ...timeSeries,
      dataPoints: timeSeries.dataPoints.map((p, i) => ({
        ...p,
        value: normalizedValues[i],
      })),
    };
  }

  private zScoreNormalization(values: number[]): number[] {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
      values.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return values.map(() => 0);

    return values.map((v) => (v - mean) / stdDev);
  }

  private minMaxNormalization(values: number[]): number[] {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    if (range === 0) return values.map(() => 0.5);

    return values.map((v) => (v - min) / range);
  }

  /**
   * Dynamic Time Warping algorithm
   */
  private dynamicTimeWarping(
    ts1: TimeSeries,
    ts2: TimeSeries,
  ): WarpingPoint[] {
    const values1 = ts1.dataPoints.map((p) => p.value);
    const values2 = ts2.dataPoints.map((p) => p.value);

    const n = values1.length;
    const m = values2.length;

    // Initialize DTW matrix
    const dtw: number[][] = Array(n + 1)
      .fill(null)
      .map(() => Array(m + 1).fill(Infinity));
    dtw[0][0] = 0;

    // Fill DTW matrix with window constraint
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        // Apply Sakoe-Chiba band constraint
        if (Math.abs(i - j) > this.config.windowSize) continue;

        const cost = this.calculateDistance(values1[i - 1], values2[j - 1]);

        dtw[i][j] = cost + Math.min(
          dtw[i - 1][j],     // Insertion
          dtw[i][j - 1],     // Deletion
          dtw[i - 1][j - 1], // Match
        );
      }
    }

    // Backtrack to find optimal warping path
    const path: Array<{ i: number; j: number }> = [];
    let i = n;
    let j = m;

    while (i > 0 && j > 0) {
      path.unshift({ i: i - 1, j: j - 1 });

      // Find minimum of three neighbors
      const options = [
        { i: i - 1, j: j, val: dtw[i - 1][j] },
        { i: i, j: j - 1, val: dtw[i][j - 1] },
        { i: i - 1, j: j - 1, val: dtw[i - 1][j - 1] },
      ];

      const minOption = options.reduce((min, opt) =>
        opt.val < min.val ? opt : min,
      );

      i = minOption.i;
      j = minOption.j;
    }

    // Convert to warping points
    return path.map((p) => {
      const originalTime = ts1.dataPoints[p.i].timestamp;
      const warpedTime = ts2.dataPoints[p.j].timestamp;

      // Calculate local stretch factor
      const stretchFactor = this.calculateStretchFactor(path, p.i, ts1, ts2);

      return {
        originalTime,
        warpedTime,
        stretchFactor,
      };
    });
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(value1: number, value2: number): number {
    switch (this.config.distanceMetric) {
      case 'manhattan':
        return Math.abs(value1 - value2);
      case 'cosine':
        // For single values, cosine similarity not directly applicable
        // Fall back to euclidean
        return Math.pow(value1 - value2, 2);
      case 'euclidean':
      default:
        return Math.pow(value1 - value2, 2);
    }
  }

  /**
   * Calculate local stretch factor at a point
   */
  private calculateStretchFactor(
    path: Array<{ i: number; j: number }>,
    currentIndex: number,
    ts1: TimeSeries,
    ts2: TimeSeries,
  ): number {
    // Look at local neighborhood to estimate stretch
    const windowSize = 5;
    const start = Math.max(0, currentIndex - windowSize);
    const end = Math.min(path.length - 1, currentIndex + windowSize);

    if (start >= end) return 1.0;

    const localPath = path.slice(start, end + 1);

    // Calculate time span in both series
    const i1 = localPath[0].i;
    const i2 = localPath[localPath.length - 1].i;
    const j1 = localPath[0].j;
    const j2 = localPath[localPath.length - 1].j;

    const span1 =
      ts1.dataPoints[i2].timestamp.getTime() -
      ts1.dataPoints[i1].timestamp.getTime();
    const span2 =
      ts2.dataPoints[j2].timestamp.getTime() -
      ts2.dataPoints[j1].timestamp.getTime();

    if (span1 === 0) return 1.0;

    return span2 / span1;
  }

  /**
   * Apply warping path to generate warped timeline
   */
  private applyWarping(
    original: TimeSeries,
    warpingPath: WarpingPoint[],
  ): TimeSeries {
    const warpedPoints: DataPoint[] = warpingPath.map((wp) => {
      // Find original data point
      const originalPoint = original.dataPoints.find(
        (p) => p.timestamp.getTime() === wp.originalTime.getTime(),
      );

      if (!originalPoint) {
        return {
          timestamp: wp.warpedTime,
          value: 0,
        };
      }

      return {
        timestamp: wp.warpedTime,
        value: originalPoint.value,
        metadata: {
          ...originalPoint.metadata,
          originalTime: wp.originalTime.toISOString(),
          stretchFactor: wp.stretchFactor,
        },
      };
    });

    return {
      metricName: `${original.metricName}_warped`,
      dataPoints: warpedPoints,
      startTime: warpedPoints[0]?.timestamp || original.startTime,
      endTime: warpedPoints[warpedPoints.length - 1]?.timestamp || original.endTime,
      sampleCount: warpedPoints.length,
    };
  }

  /**
   * Calculate alignment quality score
   */
  private calculateAlignmentScore(
    original: TimeSeries,
    warped: TimeSeries,
    warpingPath: WarpingPoint[],
  ): number {
    // Calculate correlation between aligned sequences
    const originalValues: number[] = [];
    const warpedValues: number[] = [];

    for (const wp of warpingPath) {
      const origPoint = original.dataPoints.find(
        (p) => p.timestamp.getTime() === wp.originalTime.getTime(),
      );
      const warpPoint = warped.dataPoints.find(
        (p) => p.timestamp.getTime() === wp.warpedTime.getTime(),
      );

      if (origPoint && warpPoint) {
        originalValues.push(origPoint.value);
        warpedValues.push(warpPoint.value);
      }
    }

    if (originalValues.length === 0) return 0;

    // Pearson correlation
    const correlation = this.pearsonCorrelation(originalValues, warpedValues);

    // Normalize to 0-1 range
    return (correlation + 1) / 2;
  }

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
   * Identify temporal landmarks in aligned timelines
   */
  private identifyLandmarks(
    warpedTimeline: TimeSeries,
    referenceTimeline: TimeSeries,
  ): TemporalLandmark[] {
    const landmarks: TemporalLandmark[] = [];

    // Find peaks in both timelines
    const warpedPeaks = this.findPeaks(warpedTimeline);
    const referencePeaks = this.findPeaks(referenceTimeline);

    // Match peaks between timelines
    for (const warpedPeak of warpedPeaks) {
      // Find closest reference peak
      let closestPeak: DataPoint | null = null;
      let minDistance = Infinity;

      for (const refPeak of referencePeaks) {
        const distance = Math.abs(
          warpedPeak.timestamp.getTime() - refPeak.timestamp.getTime(),
        );
        if (distance < minDistance) {
          minDistance = distance;
          closestPeak = refPeak;
        }
      }

      if (closestPeak && minDistance < 30 * 60 * 1000) {
        // Within 30 min
        landmarks.push({
          time: warpedPeak.timestamp,
          eventType: 'ALIGNED_PEAK',
          significance: Math.abs(warpedPeak.value),
          description: `Peak aligned with reference anomaly pattern (value: ${warpedPeak.value.toFixed(2)})`,
        });
      }
    }

    // Find valleys
    const warpedValleys = this.findValleys(warpedTimeline);
    for (const valley of warpedValleys) {
      landmarks.push({
        time: valley.timestamp,
        eventType: 'VALLEY',
        significance: Math.abs(valley.value),
        description: `Significant valley (value: ${valley.value.toFixed(2)})`,
      });
    }

    // Find inflection points (where trend changes)
    const inflectionPoints = this.findInflectionPoints(warpedTimeline);
    for (const point of inflectionPoints) {
      landmarks.push({
        time: point.timestamp,
        eventType: 'INFLECTION',
        significance: Math.abs(point.value),
        description: 'Trend inflection point',
      });
    }

    return landmarks;
  }

  private findPeaks(timeSeries: TimeSeries): DataPoint[] {
    const peaks: DataPoint[] = [];
    const points = timeSeries.dataPoints;

    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1].value;
      const curr = points[i].value;
      const next = points[i + 1].value;

      if (curr > prev && curr > next) {
        peaks.push(points[i]);
      }
    }

    return peaks;
  }

  private findValleys(timeSeries: TimeSeries): DataPoint[] {
    const valleys: DataPoint[] = [];
    const points = timeSeries.dataPoints;

    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1].value;
      const curr = points[i].value;
      const next = points[i + 1].value;

      if (curr < prev && curr < next) {
        valleys.push(points[i]);
      }
    }

    return valleys;
  }

  private findInflectionPoints(timeSeries: TimeSeries): DataPoint[] {
    const inflections: DataPoint[] = [];
    const points = timeSeries.dataPoints;

    if (points.length < 3) return inflections;

    for (let i = 2; i < points.length; i++) {
      const slope1 = points[i - 1].value - points[i - 2].value;
      const slope2 = points[i].value - points[i - 1].value;

      // Sign change in slope = inflection point
      if (slope1 * slope2 < 0) {
        inflections.push(points[i - 1]);
      }
    }

    return inflections;
  }

  /**
   * Multi-scale decomposition (trend, seasonal, residual)
   */
  async decomposeMultiScale(
    timeSeries: TimeSeries,
  ): Promise<{
    trend: TimeSeries;
    seasonal: TimeSeries;
    residual: TimeSeries;
  }> {
    const values = timeSeries.dataPoints.map((p) => p.value);
    const n = values.length;

    // Simple moving average for trend
    const windowSize = Math.max(Math.floor(n / 10), 5);
    const trendValues: number[] = [];

    for (let i = 0; i < n; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(n, i + Math.ceil(windowSize / 2));
      const window = values.slice(start, end);
      trendValues.push(window.reduce((a, b) => a + b, 0) / window.length);
    }

    // Detrended series
    const detrended = values.map((v, i) => v - trendValues[i]);

    // Simple seasonal extraction (assume daily seasonality if enough data)
    const seasonalPeriod = Math.min(24, Math.floor(n / 4)); // Hourly data
    const seasonalValues: number[] = Array(n).fill(0);

    if (n >= seasonalPeriod * 2) {
      for (let phase = 0; phase < seasonalPeriod; phase++) {
        const phaseValues: number[] = [];
        for (let i = phase; i < n; i += seasonalPeriod) {
          phaseValues.push(detrended[i]);
        }
        const phaseAvg =
          phaseValues.reduce((a, b) => a + b, 0) / phaseValues.length;

        for (let i = phase; i < n; i += seasonalPeriod) {
          seasonalValues[i] = phaseAvg;
        }
      }
    }

    // Residual = original - trend - seasonal
    const residualValues = values.map(
      (v, i) => v - trendValues[i] - seasonalValues[i],
    );

    // Create time series objects
    const createSeries = (
      name: string,
      vals: number[],
    ): TimeSeries => ({
      metricName: `${timeSeries.metricName}_${name}`,
      dataPoints: timeSeries.dataPoints.map((p, i) => ({
        timestamp: p.timestamp,
        value: vals[i],
        metadata: p.metadata,
      })),
      startTime: timeSeries.startTime,
      endTime: timeSeries.endTime,
      sampleCount: vals.length,
    });

    return {
      trend: createSeries('trend', trendValues),
      seasonal: createSeries('seasonal', seasonalValues),
      residual: createSeries('residual', residualValues),
    };
  }
}
