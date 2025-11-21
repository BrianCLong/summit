/**
 * Forecasting Package - Time Series Forecasting and Prediction
 * @module @summit/forecasting
 */

// Types
export * from './types/index.js';

// Core models
export { ARIMAForecaster, AutoARIMA } from './core/arima.js';
export { ExponentialSmoothingForecaster, SimpleExponentialSmoothing } from './core/exponential-smoothing.js';
export { ProphetForecaster } from './core/prophet.js';

// Ensemble methods
export { EnsembleForecaster, OptimalEnsemble } from './models/ensemble.js';

// Anomaly forecasting
export { AnomalyForecaster } from './models/anomaly-forecast.js';

// Scenario analysis and simulation
export {
  MonteCarloSimulator,
  ScenarioAnalyzer,
  Backtester,
  type ScenarioConfig,
  type SimulationResult,
} from './utils/scenario-simulation.js';
