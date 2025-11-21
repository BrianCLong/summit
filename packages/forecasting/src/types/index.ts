/**
 * Forecasting Types and Interfaces
 */

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface ForecastResult {
  timestamp: Date;
  forecast: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export interface ForecastConfig {
  horizon: number;
  confidenceLevel: number;
  seasonality?: SeasonalityConfig;
  holidays?: HolidayConfig[];
  externalRegressors?: ExternalRegressor[];
}

export interface SeasonalityConfig {
  period: number;
  fourierOrder?: number;
  priorScale?: number;
  mode?: 'additive' | 'multiplicative';
}

export interface HolidayConfig {
  name: string;
  dates: Date[];
  lowerWindow?: number;
  upperWindow?: number;
  priorScale?: number;
}

export interface ExternalRegressor {
  name: string;
  data: number[];
  priorScale?: number;
}

export interface ARIMAParams {
  p: number; // AR order
  d: number; // Differencing order
  q: number; // MA order
  P?: number; // Seasonal AR order
  D?: number; // Seasonal differencing
  Q?: number; // Seasonal MA order
  s?: number; // Seasonal period
}

export interface ExponentialSmoothingParams {
  alpha?: number; // Level smoothing
  beta?: number; // Trend smoothing
  gamma?: number; // Seasonal smoothing
  seasonalPeriods?: number;
  trendType?: 'additive' | 'multiplicative' | 'none';
  seasonalType?: 'additive' | 'multiplicative' | 'none';
  dampedTrend?: boolean;
}

export interface LSTMConfig {
  layers: number[];
  lookbackWindow: number;
  epochs: number;
  batchSize: number;
  dropout?: number;
  learningRate?: number;
}

export interface EnsembleConfig {
  models: ForecastModel[];
  weights?: number[];
  method: 'average' | 'weighted' | 'stacking';
}

export interface ForecastModel {
  type: 'arima' | 'sarima' | 'exponential' | 'prophet' | 'lstm' | 'gru' | 'tft';
  params: ARIMAParams | ExponentialSmoothingParams | LSTMConfig | Record<string, unknown>;
  name?: string;
}

export interface ModelPerformance {
  mae: number;
  rmse: number;
  mape: number;
  mase: number;
  smape: number;
  r2: number;
}

export interface TrendDecomposition {
  trend: number[];
  seasonal: number[];
  residual: number[];
  timestamps: Date[];
}

export interface ChangePoint {
  timestamp: Date;
  index: number;
  magnitude: number;
  confidence: number;
}
