/**
 * IntelGraph Forecasting Models
 * Data models for forecasting predictions and configurations
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

export interface ForecastPoint {
  timestamp: Date;
  predicted_value: number;
  lower_bound?: number;
  upper_bound?: number;
  confidence?: number;
  prediction_interval?: number; // e.g., 0.95 for 95% confidence
}

export interface Forecast {
  model_name: string;
  model_version?: string;
  series_id: string;
  forecast_points: ForecastPoint[];
  training_end: Date;
  forecast_start: Date;
  forecast_end: Date;
  horizon: number; // Number of steps ahead
  metadata?: Record<string, any>;
  performance_metrics?: ForecastMetrics;
  created_at: Date;
}

export interface ForecastMetrics {
  mae?: number; // Mean Absolute Error
  rmse?: number; // Root Mean Square Error
  mape?: number; // Mean Absolute Percentage Error
  mase?: number; // Mean Absolute Scaled Error
  aic?: number; // Akaike Information Criterion
  bic?: number; // Bayesian Information Criterion
  r_squared?: number;
  training_time_ms?: number;
  prediction_time_ms?: number;
}

export interface ForecastConfig {
  model_type: 'arima' | 'sarima' | 'prophet' | 'lstm' | 'exponential_smoothing' | 'ensemble';
  horizon: number;
  frequency?: string; // e.g., 'D' for daily, 'H' for hourly
  seasonality?: SeasonalityConfig;
  confidence_interval?: number; // e.g., 0.95
  hyperparameters?: Record<string, any>;
}

export interface SeasonalityConfig {
  enabled: boolean;
  period?: number; // e.g., 7 for weekly, 12 for monthly
  mode?: 'additive' | 'multiplicative';
  fourier_order?: number;
}

export interface ARIMAConfig {
  p: number; // Autoregressive order
  d: number; // Differencing order
  q: number; // Moving average order
  P?: number; // Seasonal AR order
  D?: number; // Seasonal differencing
  Q?: number; // Seasonal MA order
  s?: number; // Seasonal period
  include_constant?: boolean;
}

export interface ProphetConfig {
  growth?: 'linear' | 'logistic';
  changepoint_prior_scale?: number;
  seasonality_prior_scale?: number;
  seasonality_mode?: 'additive' | 'multiplicative';
  yearly_seasonality?: boolean | number;
  weekly_seasonality?: boolean | number;
  daily_seasonality?: boolean | number;
  holidays?: Holiday[];
}

export interface Holiday {
  name: string;
  date: Date;
  lower_window?: number;
  upper_window?: number;
}

export interface ExponentialSmoothingConfig {
  trend?: 'add' | 'mul' | null;
  seasonal?: 'add' | 'mul' | null;
  seasonal_periods?: number;
  damped_trend?: boolean;
  alpha?: number; // Level smoothing
  beta?: number; // Trend smoothing
  gamma?: number; // Seasonal smoothing
  phi?: number; // Damping parameter
}

export interface LSTMConfig {
  units: number[];
  dropout?: number;
  recurrent_dropout?: number;
  batch_size?: number;
  epochs?: number;
  learning_rate?: number;
  lookback_window?: number;
  loss_function?: string;
  optimizer?: string;
}

export interface EnsembleConfig {
  models: ForecastConfig[];
  weights?: number[];
  combination_method?: 'average' | 'weighted_average' | 'median' | 'stacking';
  meta_model?: ForecastConfig;
}

export interface ForecastRequest {
  series_id: string;
  metric_name: string;
  entity_id?: string;
  training_start?: Date;
  training_end?: Date;
  forecast_horizon: number;
  config: ForecastConfig;
  validate?: boolean;
  save_model?: boolean;
}

export interface ModelArtifact {
  model_id: string;
  model_type: string;
  series_id: string;
  trained_at: Date;
  parameters: Record<string, any>;
  performance_metrics: ForecastMetrics;
  serialized_model?: Buffer | string;
  metadata?: Record<string, any>;
}

export interface BacktestConfig {
  initial_training_size: number;
  horizon: number;
  step_size?: number;
  n_splits?: number;
  metric?: 'mae' | 'rmse' | 'mape' | 'mase';
}

export interface BacktestResult {
  config: BacktestConfig;
  splits: BacktestSplit[];
  average_metrics: ForecastMetrics;
  best_parameters?: Record<string, any>;
}

export interface BacktestSplit {
  split_number: number;
  training_end: Date;
  test_start: Date;
  test_end: Date;
  predictions: ForecastPoint[];
  actuals: number[];
  metrics: ForecastMetrics;
}
