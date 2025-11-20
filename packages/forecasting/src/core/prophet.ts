/**
 * Prophet-style Forecasting with Trend, Seasonality, and Holidays
 */

import type {
  TimeSeriesData,
  ForecastResult,
  ForecastConfig,
  SeasonalityConfig,
  HolidayConfig,
  TrendDecomposition,
  ChangePoint
} from '../types/index.js';

export class ProphetForecaster {
  private config: ForecastConfig;
  private data: TimeSeriesData[] = [];
  private trendComponent: number[] = [];
  private seasonalComponents: Map<string, number[]> = new Map();
  private changepoints: ChangePoint[] = [];
  private fitted: boolean = false;

  constructor(config: ForecastConfig) {
    this.config = config;
  }

  /**
   * Fit the Prophet model
   */
  fit(data: TimeSeriesData[]): void {
    this.data = [...data];

    // Detect changepoints in trend
    this.detectChangepoints();

    // Fit trend component
    this.fitTrend();

    // Fit seasonal components
    if (this.config.seasonality) {
      this.fitSeasonality();
    }

    // Fit holiday effects
    if (this.config.holidays && this.config.holidays.length > 0) {
      this.fitHolidays();
    }

    this.fitted = true;
  }

  /**
   * Generate forecasts with confidence intervals
   */
  forecast(horizon?: number, confidenceLevel?: number): ForecastResult[] {
    if (!this.fitted) {
      throw new Error('Model must be fitted before forecasting');
    }

    const h = horizon || this.config.horizon;
    const confidence = confidenceLevel || this.config.confidenceLevel;
    const results: ForecastResult[] = [];

    const lastTimestamp = this.data[this.data.length - 1].timestamp;

    for (let i = 1; i <= h; i++) {
      const timestamp = this.addDays(lastTimestamp, i);
      const trend = this.forecastTrend(i);
      const seasonal = this.forecastSeasonality(timestamp);
      const holiday = this.forecastHoliday(timestamp);

      const forecast = trend + seasonal + holiday;
      const uncertainty = this.calculateUncertainty(i);
      const zScore = this.getZScore(confidence);

      results.push({
        timestamp,
        forecast,
        lowerBound: forecast - zScore * uncertainty,
        upperBound: forecast + zScore * uncertainty,
        confidence,
      });
    }

    return results;
  }

  /**
   * Decompose time series into components
   */
  decompose(): TrendDecomposition {
    const trend: number[] = [];
    const seasonal: number[] = [];
    const residual: number[] = [];
    const timestamps: Date[] = [];

    for (let i = 0; i < this.data.length; i++) {
      const t = this.trendComponent[i] || 0;
      const s = this.getSeasonalValue(this.data[i].timestamp);
      const actual = this.data[i].value;

      trend.push(t);
      seasonal.push(s);
      residual.push(actual - t - s);
      timestamps.push(this.data[i].timestamp);
    }

    return { trend, seasonal, residual, timestamps };
  }

  /**
   * Detect changepoints in trend
   */
  private detectChangepoints(): void {
    const n = this.data.length;
    const values = this.data.map(d => d.value);
    const windowSize = Math.max(10, Math.floor(n * 0.1));

    for (let i = windowSize; i < n - windowSize; i++) {
      const before = values.slice(i - windowSize, i);
      const after = values.slice(i, i + windowSize);

      const meanBefore = this.mean(before);
      const meanAfter = this.mean(after);
      const stdBefore = this.std(before);
      const stdAfter = this.std(after);

      // Detect significant change
      const magnitude = Math.abs(meanAfter - meanBefore);
      const pooledStd = Math.sqrt((stdBefore ** 2 + stdAfter ** 2) / 2);
      const tStat = magnitude / (pooledStd * Math.sqrt(2 / windowSize));

      // Threshold for significance (approximate t-test)
      if (tStat > 2.0) {
        this.changepoints.push({
          timestamp: this.data[i].timestamp,
          index: i,
          magnitude,
          confidence: Math.min(0.99, 1 - 1 / tStat),
        });
      }
    }
  }

  /**
   * Fit piecewise linear trend with changepoints
   */
  private fitTrend(): void {
    const n = this.data.length;
    const values = this.data.map(d => d.value);

    if (this.changepoints.length === 0) {
      // Simple linear trend
      const { slope, intercept } = this.linearRegression(values);
      this.trendComponent = values.map((_, i) => intercept + slope * i);
    } else {
      // Piecewise linear trend
      this.trendComponent = new Array(n);
      let startIdx = 0;

      for (const cp of this.changepoints) {
        const segment = values.slice(startIdx, cp.index);
        const { slope, intercept } = this.linearRegression(segment);

        for (let i = startIdx; i < cp.index; i++) {
          this.trendComponent[i] = intercept + slope * (i - startIdx);
        }

        startIdx = cp.index;
      }

      // Fit remaining segment
      const lastSegment = values.slice(startIdx);
      const { slope, intercept } = this.linearRegression(lastSegment);
      for (let i = startIdx; i < n; i++) {
        this.trendComponent[i] = intercept + slope * (i - startIdx);
      }
    }
  }

  /**
   * Fit Fourier series for seasonality
   */
  private fitSeasonality(): void {
    if (!this.config.seasonality) return;

    const seasonality = this.config.seasonality;
    const period = seasonality.period;
    const fourierOrder = seasonality.fourierOrder || 10;

    const detrended = this.data.map((d, i) =>
      d.value - (this.trendComponent[i] || 0)
    );

    const seasonalFit: number[] = new Array(this.data.length).fill(0);

    for (let k = 1; k <= fourierOrder; k++) {
      const sinCoeffs: number[] = [];
      const cosCoeffs: number[] = [];

      for (let i = 0; i < this.data.length; i++) {
        const t = i % period;
        const angle = 2 * Math.PI * k * t / period;
        sinCoeffs.push(Math.sin(angle));
        cosCoeffs.push(Math.cos(angle));
      }

      const sinCoeff = this.dotProduct(detrended, sinCoeffs) / this.dotProduct(sinCoeffs, sinCoeffs);
      const cosCoeff = this.dotProduct(detrended, cosCoeffs) / this.dotProduct(cosCoeffs, cosCoeffs);

      for (let i = 0; i < this.data.length; i++) {
        const t = i % period;
        const angle = 2 * Math.PI * k * t / period;
        seasonalFit[i] += sinCoeff * Math.sin(angle) + cosCoeff * Math.cos(angle);
      }
    }

    this.seasonalComponents.set('main', seasonalFit);
  }

  /**
   * Fit holiday effects
   */
  private fitHolidays(): void {
    if (!this.config.holidays) return;

    const holidayEffects = new Map<string, number>();

    for (const holiday of this.config.holidays) {
      const holidayIndices = this.findHolidayIndices(holiday);
      const effects: number[] = [];

      for (const idx of holidayIndices) {
        const detrended = this.data[idx].value -
                         (this.trendComponent[idx] || 0) -
                         this.getSeasonalValue(this.data[idx].timestamp);
        effects.push(detrended);
      }

      holidayEffects.set(holiday.name, this.mean(effects));
    }

    // Store as seasonal component
    const holidayFit = new Array(this.data.length).fill(0);
    for (let i = 0; i < this.data.length; i++) {
      for (const holiday of this.config.holidays) {
        if (this.isHoliday(this.data[i].timestamp, holiday)) {
          holidayFit[i] = holidayEffects.get(holiday.name) || 0;
        }
      }
    }

    this.seasonalComponents.set('holidays', holidayFit);
  }

  /**
   * Forecast trend component
   */
  private forecastTrend(horizon: number): number {
    const lastTrend = this.trendComponent[this.trendComponent.length - 1];

    // Use last segment slope if available
    if (this.changepoints.length > 0) {
      const lastCp = this.changepoints[this.changepoints.length - 1];
      const segment = this.trendComponent.slice(lastCp.index);
      const { slope } = this.linearRegression(segment);
      return lastTrend + slope * horizon;
    }

    // Simple linear extrapolation
    const { slope } = this.linearRegression(this.trendComponent);
    return lastTrend + slope * horizon;
  }

  /**
   * Forecast seasonality
   */
  private forecastSeasonality(timestamp: Date): number {
    return this.getSeasonalValue(timestamp);
  }

  /**
   * Forecast holiday effects
   */
  private forecastHoliday(timestamp: Date): number {
    if (!this.config.holidays) return 0;

    const holidayComponent = this.seasonalComponents.get('holidays');
    if (!holidayComponent) return 0;

    for (const holiday of this.config.holidays) {
      if (this.isHoliday(timestamp, holiday)) {
        const holidayIndices = this.findHolidayIndices(holiday);
        const effects = holidayIndices.map(idx => holidayComponent[idx]);
        return this.mean(effects);
      }
    }

    return 0;
  }

  /**
   * Get seasonal value for timestamp
   */
  private getSeasonalValue(timestamp: Date): number {
    if (!this.config.seasonality) return 0;

    const period = this.config.seasonality.period;
    const dayOfYear = this.getDayOfYear(timestamp);
    const t = dayOfYear % period;

    const mainSeasonal = this.seasonalComponents.get('main');
    if (!mainSeasonal) return 0;

    // Interpolate seasonal value
    const idx = Math.floor(t * mainSeasonal.length / period);
    return mainSeasonal[idx] || 0;
  }

  /**
   * Calculate forecast uncertainty
   */
  private calculateUncertainty(horizon: number): number {
    const residuals = this.data.map((d, i) => {
      const fitted = (this.trendComponent[i] || 0) + this.getSeasonalValue(d.timestamp);
      return d.value - fitted;
    });

    const variance = this.variance(residuals);

    // Uncertainty grows with horizon
    return Math.sqrt(variance * (1 + 0.05 * horizon));
  }

  // Utility functions
  private mean(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  private std(arr: number[]): number {
    const avg = this.mean(arr);
    const squareDiffs = arr.map(x => Math.pow(x - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }

  private variance(arr: number[]): number {
    return Math.pow(this.std(arr), 2);
  }

  private dotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }

  private linearRegression(values: number[]): { slope: number; intercept: number } {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  private getZScore(confidenceLevel: number): number {
    const zScores: Record<number, number> = {
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576,
    };
    return zScores[confidenceLevel] || 1.96;
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  private isHoliday(timestamp: Date, holiday: HolidayConfig): boolean {
    return holiday.dates.some(d =>
      d.getFullYear() === timestamp.getFullYear() &&
      d.getMonth() === timestamp.getMonth() &&
      d.getDate() === timestamp.getDate()
    );
  }

  private findHolidayIndices(holiday: HolidayConfig): number[] {
    const indices: number[] = [];
    for (let i = 0; i < this.data.length; i++) {
      if (this.isHoliday(this.data[i].timestamp, holiday)) {
        indices.push(i);
      }
    }
    return indices;
  }
}
