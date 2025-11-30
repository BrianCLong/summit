/**
 * Time-Warped Timeline Model
 * Represents temporally aligned time-series using dynamic time warping
 */

export interface DataPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface TimeSeries {
  metricName: string;
  dataPoints: DataPoint[];
  startTime: Date;
  endTime: Date;
  sampleCount: number;
}

export interface WarpingPoint {
  originalTime: Date;
  warpedTime: Date;
  stretchFactor: number;
}

export interface TemporalLandmark {
  time: Date;
  eventType: string;
  significance: number;
  description: string;
}

export interface WarpedTimeline {
  id: string;
  entityId: string;
  referenceAnomalyId: string;
  originalTimeline: TimeSeries;
  warpedTimeline: TimeSeries;
  warpingPath: WarpingPoint[];
  alignmentScore: number;
  temporalLandmarks: TemporalLandmark[];
  createdAt: Date;
}

export interface WarpedTimelineCreate {
  entityId: string;
  referenceAnomalyId: string;
  originalTimeline: TimeSeries;
  warpedTimeline: TimeSeries;
  warpingPath: WarpingPoint[];
  alignmentScore: number;
  temporalLandmarks: TemporalLandmark[];
}

export class TimeWarpedTimelineModel {
  /**
   * Calculate average stretch factor across warping path
   */
  static calculateAverageStretch(warpingPath: WarpingPoint[]): number {
    if (warpingPath.length === 0) return 1.0;

    const sum = warpingPath.reduce(
      (acc, point) => acc + point.stretchFactor,
      0,
    );
    return sum / warpingPath.length;
  }

  /**
   * Find regions of significant time compression/expansion
   */
  static findSignificantWarps(
    warpingPath: WarpingPoint[],
    threshold: number = 1.5,
  ): Array<{ start: WarpingPoint; end: WarpingPoint; avgStretch: number }> {
    const regions: Array<{
      start: WarpingPoint;
      end: WarpingPoint;
      avgStretch: number;
    }> = [];
    let currentRegion: WarpingPoint[] | null = null;

    for (const point of warpingPath) {
      const isSignificant =
        point.stretchFactor > threshold || point.stretchFactor < 1 / threshold;

      if (isSignificant) {
        if (!currentRegion) {
          currentRegion = [point];
        } else {
          currentRegion.push(point);
        }
      } else {
        if (currentRegion && currentRegion.length > 0) {
          const avgStretch =
            currentRegion.reduce((sum, p) => sum + p.stretchFactor, 0) /
            currentRegion.length;
          regions.push({
            start: currentRegion[0],
            end: currentRegion[currentRegion.length - 1],
            avgStretch,
          });
          currentRegion = null;
        }
      }
    }

    // Handle final region
    if (currentRegion && currentRegion.length > 0) {
      const avgStretch =
        currentRegion.reduce((sum, p) => sum + p.stretchFactor, 0) /
        currentRegion.length;
      regions.push({
        start: currentRegion[0],
        end: currentRegion[currentRegion.length - 1],
        avgStretch,
      });
    }

    return regions;
  }

  /**
   * Interpolate value at a specific time in warped timeline
   */
  static interpolateValue(
    timeSeries: TimeSeries,
    targetTime: Date,
  ): number | null {
    const points = timeSeries.dataPoints;
    if (points.length === 0) return null;

    const targetMs = targetTime.getTime();

    // Find surrounding points
    let before: DataPoint | null = null;
    let after: DataPoint | null = null;

    for (let i = 0; i < points.length; i++) {
      const pointMs = points[i].timestamp.getTime();

      if (pointMs === targetMs) {
        return points[i].value;
      }

      if (pointMs < targetMs) {
        before = points[i];
      } else if (pointMs > targetMs && !after) {
        after = points[i];
        break;
      }
    }

    // Linear interpolation
    if (before && after) {
      const beforeMs = before.timestamp.getTime();
      const afterMs = after.timestamp.getTime();
      const ratio = (targetMs - beforeMs) / (afterMs - beforeMs);
      return before.value + ratio * (after.value - before.value);
    }

    // Extrapolation from nearest point
    if (before) return before.value;
    if (after) return after.value;

    return null;
  }

  /**
   * Calculate alignment quality metrics
   */
  static calculateAlignmentMetrics(
    original: TimeSeries,
    warped: TimeSeries,
    warpingPath: WarpingPoint[],
  ): {
    rmse: number;
    correlation: number;
    avgStretch: number;
    maxStretch: number;
  } {
    // Root Mean Square Error
    let sumSquaredError = 0;
    let count = 0;

    for (const point of warpingPath) {
      const originalValue = this.interpolateValue(
        original,
        point.originalTime,
      );
      const warpedValue = this.interpolateValue(warped, point.warpedTime);

      if (originalValue !== null && warpedValue !== null) {
        sumSquaredError += Math.pow(originalValue - warpedValue, 2);
        count++;
      }
    }

    const rmse = count > 0 ? Math.sqrt(sumSquaredError / count) : 0;

    // Correlation
    const correlation = this.calculateCorrelation(original, warped);

    // Stretch metrics
    const avgStretch = this.calculateAverageStretch(warpingPath);
    const maxStretch = Math.max(
      ...warpingPath.map((p) => Math.abs(Math.log(p.stretchFactor))),
    );

    return { rmse, correlation, avgStretch, maxStretch };
  }

  /**
   * Calculate Pearson correlation between two time series
   */
  static calculateCorrelation(ts1: TimeSeries, ts2: TimeSeries): number {
    const values1 = ts1.dataPoints.map((p) => p.value);
    const values2 = ts2.dataPoints.map((p) => p.value);

    const n = Math.min(values1.length, values2.length);
    if (n === 0) return 0;

    const mean1 = values1.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const mean2 = values2.slice(0, n).reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denom1 = 0;
    let denom2 = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = values1[i] - mean1;
      const diff2 = values2[i] - mean2;
      numerator += diff1 * diff2;
      denom1 += diff1 * diff1;
      denom2 += diff2 * diff2;
    }

    if (denom1 === 0 || denom2 === 0) return 0;

    return numerator / Math.sqrt(denom1 * denom2);
  }

  /**
   * Identify temporal landmarks (significant events)
   */
  static identifyLandmarks(
    timeSeries: TimeSeries,
    threshold: number = 2.0,
  ): TemporalLandmark[] {
    const landmarks: TemporalLandmark[] = [];
    const points = timeSeries.dataPoints;

    if (points.length < 3) return landmarks;

    // Calculate local statistics
    const values = points.map((p) => p.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;
    const stdDev = Math.sqrt(variance);

    // Find peaks and valleys
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1].value;
      const curr = points[i].value;
      const next = points[i + 1].value;

      const zScore = Math.abs((curr - mean) / stdDev);

      // Peak detection
      if (curr > prev && curr > next && zScore > threshold) {
        landmarks.push({
          time: points[i].timestamp,
          eventType: 'PEAK',
          significance: zScore,
          description: `Significant peak (${curr.toFixed(2)}, z=${zScore.toFixed(2)})`,
        });
      }

      // Valley detection
      if (curr < prev && curr < next && zScore > threshold) {
        landmarks.push({
          time: points[i].timestamp,
          eventType: 'VALLEY',
          significance: zScore,
          description: `Significant valley (${curr.toFixed(2)}, z=${zScore.toFixed(2)})`,
        });
      }

      // Step change detection
      const stepSize = Math.abs(curr - prev);
      if (stepSize > threshold * stdDev) {
        landmarks.push({
          time: points[i].timestamp,
          eventType: 'STEP',
          significance: stepSize / stdDev,
          description: `Step change (Δ=${stepSize.toFixed(2)})`,
        });
      }
    }

    return landmarks;
  }

  /**
   * Validate warped timeline data
   */
  static validate(data: WarpedTimelineCreate): string[] {
    const errors: string[] = [];

    if (!data.entityId) errors.push('entityId is required');
    if (!data.referenceAnomalyId) {
      errors.push('referenceAnomalyId is required');
    }
    if (!data.originalTimeline) errors.push('originalTimeline is required');
    if (!data.warpedTimeline) errors.push('warpedTimeline is required');
    if (!data.warpingPath || data.warpingPath.length === 0) {
      errors.push('warpingPath must contain at least one point');
    }
    if (data.alignmentScore < 0 || data.alignmentScore > 1) {
      errors.push('alignmentScore must be between 0 and 1');
    }

    return errors;
  }
}
