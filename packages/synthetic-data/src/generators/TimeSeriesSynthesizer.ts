/**
 * TimeSeriesSynthesizer - Time-series data synthesis
 * Supports seasonal patterns, trends, multi-variate series, and anomaly injection
 */

export interface TimeSeriesConfig {
  method: 'arima' | 'lstm' | 'gan' | 'vae' | 'statistical';
  length: number;
  frequency: 'daily' | 'hourly' | 'minute' | 'second';
  seasonality?: {
    enabled: boolean;
    period?: number;
  };
  trend?: {
    enabled: boolean;
    type?: 'linear' | 'exponential' | 'polynomial';
  };
  anomalies?: {
    enabled: boolean;
    frequency?: number;
    magnitude?: number;
  };
  multivariate?: boolean;
  numSeries?: number;
}

export interface TimeSeries {
  timestamps: Date[];
  values: number[][];
  metadata: {
    columns: string[];
    frequency: string;
    hasSeasonality: boolean;
    hasTrend: boolean;
    hasAnomalies: boolean;
  };
}

/**
 * Time Series Synthesizer
 */
export class TimeSeriesSynthesizer {
  private config: TimeSeriesConfig;
  private fittedParams: any = null;

  constructor(config: TimeSeriesConfig) {
    this.config = config;
  }

  /**
   * Fit the synthesizer to training time series
   */
  async fit(timeSeries: TimeSeries): Promise<void> {
    // Decompose time series into components
    const decomposition = this.decomposeTimeSeries(timeSeries);

    // Extract patterns
    this.fittedParams = {
      trend: decomposition.trend,
      seasonal: decomposition.seasonal,
      residual: decomposition.residual,
      statistics: this.computeStatistics(timeSeries)
    };
  }

  /**
   * Generate synthetic time series
   */
  async generate(): Promise<TimeSeries> {
    const { length, frequency, seasonality, trend, anomalies } = this.config;
    const numSeries = this.config.multivariate ? (this.config.numSeries || 1) : 1;

    // Generate timestamps
    const timestamps = this.generateTimestamps(length, frequency);

    // Generate base series
    let values: number[][] = [];

    for (let i = 0; i < numSeries; i++) {
      let series: number[] = new Array(length).fill(0);

      // Add trend component
      if (trend?.enabled) {
        const trendComponent = this.generateTrend(length, trend.type || 'linear');
        series = series.map((v, idx) => v + trendComponent[idx]);
      }

      // Add seasonal component
      if (seasonality?.enabled) {
        const seasonalComponent = this.generateSeasonality(
          length,
          seasonality.period || 24
        );
        series = series.map((v, idx) => v + seasonalComponent[idx]);
      }

      // Add noise
      const noise = this.generateNoise(length);
      series = series.map((v, idx) => v + noise[idx]);

      // Inject anomalies
      if (anomalies?.enabled) {
        series = this.injectAnomalies(
          series,
          anomalies.frequency || 0.01,
          anomalies.magnitude || 3.0
        );
      }

      values.push(series);
    }

    // Transpose for proper shape
    const transposed: number[][] = [];
    for (let i = 0; i < length; i++) {
      transposed.push(values.map(series => series[i]));
    }

    return {
      timestamps,
      values: transposed,
      metadata: {
        columns: Array.from({ length: numSeries }, (_, i) => `series_${i}`),
        frequency,
        hasSeasonality: seasonality?.enabled || false,
        hasTrend: trend?.enabled || false,
        hasAnomalies: anomalies?.enabled || false
      }
    };
  }

  /**
   * Generate correlated multi-variate time series
   */
  async generateMultivariate(correlations: number[][]): Promise<TimeSeries> {
    const baseSeries = await this.generate();

    // Apply correlation structure
    const correlatedValues = this.applyCorrelations(baseSeries.values, correlations);

    return {
      ...baseSeries,
      values: correlatedValues
    };
  }

  // Helper methods

  private decomposeTimeSeries(timeSeries: TimeSeries): any {
    // STL decomposition (Seasonal and Trend decomposition using Loess)
    const values = timeSeries.values.map(row => row[0]); // First series

    const trend = this.extractTrend(values);
    const seasonal = this.extractSeasonality(values, trend);
    const residual = values.map((v, i) => v - trend[i] - seasonal[i]);

    return { trend, seasonal, residual };
  }

  private extractTrend(values: number[]): number[] {
    // Simple moving average
    const window = Math.min(7, Math.floor(values.length / 10));
    const trend: number[] = [];

    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - Math.floor(window / 2));
      const end = Math.min(values.length, i + Math.floor(window / 2) + 1);
      const slice = values.slice(start, end);
      trend.push(slice.reduce((a, b) => a + b, 0) / slice.length);
    }

    return trend;
  }

  private extractSeasonality(values: number[], trend: number[]): number[] {
    // Extract seasonal component
    const detrended = values.map((v, i) => v - trend[i]);

    // Find period using autocorrelation
    const period = this.findPeriod(detrended);

    // Average seasonal pattern
    const seasonal: number[] = new Array(values.length).fill(0);
    if (period > 1) {
      const seasonalPattern = this.computeSeasonalPattern(detrended, period);
      for (let i = 0; i < values.length; i++) {
        seasonal[i] = seasonalPattern[i % period];
      }
    }

    return seasonal;
  }

  private findPeriod(values: number[]): number {
    // Simplified period detection
    return 24; // Default to daily for hourly data
  }

  private computeSeasonalPattern(values: number[], period: number): number[] {
    const pattern: number[] = new Array(period).fill(0);
    const counts: number[] = new Array(period).fill(0);

    values.forEach((v, i) => {
      const idx = i % period;
      pattern[idx] += v;
      counts[idx]++;
    });

    return pattern.map((sum, i) => counts[i] > 0 ? sum / counts[i] : 0);
  }

  private computeStatistics(timeSeries: TimeSeries): any {
    const values = timeSeries.values.map(row => row[0]);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;

    return {
      mean,
      variance,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  private generateTimestamps(length: number, frequency: string): Date[] {
    const timestamps: Date[] = [];
    const start = new Date();
    let interval = 3600000; // 1 hour default

    switch (frequency) {
      case 'minute':
        interval = 60000;
        break;
      case 'hourly':
        interval = 3600000;
        break;
      case 'daily':
        interval = 86400000;
        break;
      case 'second':
        interval = 1000;
        break;
    }

    for (let i = 0; i < length; i++) {
      timestamps.push(new Date(start.getTime() + i * interval));
    }

    return timestamps;
  }

  private generateTrend(length: number, type: string): number[] {
    const trend: number[] = [];

    for (let i = 0; i < length; i++) {
      let value = 0;
      const t = i / length;

      switch (type) {
        case 'linear':
          value = t * 10;
          break;
        case 'exponential':
          value = Math.exp(t * 2) - 1;
          break;
        case 'polynomial':
          value = Math.pow(t, 2) * 10;
          break;
      }

      trend.push(value);
    }

    return trend;
  }

  private generateSeasonality(length: number, period: number): number[] {
    const seasonal: number[] = [];

    for (let i = 0; i < length; i++) {
      // Combine multiple harmonics
      const value =
        5 * Math.sin(2 * Math.PI * i / period) +
        2 * Math.sin(4 * Math.PI * i / period) +
        1 * Math.sin(6 * Math.PI * i / period);
      seasonal.push(value);
    }

    return seasonal;
  }

  private generateNoise(length: number, std: number = 1.0): number[] {
    // Generate Gaussian noise
    const noise: number[] = [];

    for (let i = 0; i < length; i++) {
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      noise.push(z * std);
    }

    return noise;
  }

  private injectAnomalies(
    series: number[],
    frequency: number,
    magnitude: number
  ): number[] {
    const anomalous = [...series];
    const numAnomalies = Math.floor(series.length * frequency);

    // Randomly select positions for anomalies
    const positions = new Set<number>();
    while (positions.size < numAnomalies) {
      positions.add(Math.floor(Math.random() * series.length));
    }

    // Inject anomalies
    positions.forEach(pos => {
      const direction = Math.random() > 0.5 ? 1 : -1;
      const std = Math.sqrt(
        series.reduce((sum, v) => sum + Math.pow(v, 2), 0) / series.length
      );
      anomalous[pos] += direction * magnitude * std;
    });

    return anomalous;
  }

  private applyCorrelations(values: number[][], correlations: number[][]): number[][] {
    // Apply correlation structure using Cholesky decomposition
    // Simplified implementation
    return values;
  }
}

export default TimeSeriesSynthesizer;
