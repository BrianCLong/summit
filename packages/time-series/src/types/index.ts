/**
 * Time Series Types
 */

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
}

export interface SeasonalDecomposition {
  trend: number[];
  seasonal: number[];
  residual: number[];
  timestamps: Date[];
}

export interface StationarityTest {
  isStationary: boolean;
  pValue: number;
  testStatistic: number;
  criticalValues: Record<string, number>;
}

export interface AutocorrelationResult {
  lags: number[];
  acf: number[];
  pacf: number[];
  confidenceInterval: number;
}
