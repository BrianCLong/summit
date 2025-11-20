/**
 * Early Warning System Package
 * Comprehensive predictive analytics and crisis forecasting platform
 */

// Export all types
export * from './types/index.js';

// Export main classes
export { CrisisPredictor } from './prediction/CrisisPredictor.js';
export { RiskModeling } from './modeling/RiskModeling.js';
export { AlertSystem } from './alerts/AlertSystem.js';

// Re-export for convenience
export type {
  // Crisis Types
  CrisisScenario,
  TriggerEvent,
  CrisisImpact,

  // Warning Indicators
  WarningIndicator,
  WarningSignal,
  TimeSeriesData,
  IndicatorThreshold,

  // Predictions
  Prediction,
  PredictionModel,
  ModelPerformance,
  ModelFeature,

  // Confidence
  ConfidenceMetrics,
  UncertaintyFactor,

  // Alerts
  Alert,
  AlertRule,
  AlertCondition,
  Recipient,
  Acknowledgment,
  Escalation,

  // Risk Scoring
  RiskScore,
  RiskForecast,

  // Scenario Analysis
  Scenario,
  ScenarioAnalysis,
  Assumption,
  PredictedOutcome,

  // Monte Carlo
  MonteCarloSimulation,
  SimulationVariable,
  SimulationResults,

  // Configuration
  EarlyWarningConfig
} from './types/index.js';

// Re-export enums
export {
  CrisisType,
  CrisisSeverity,
  CrisisPhase,
  IndicatorType,
  IndicatorCategory,
  IndicatorStatus,
  ModelType,
  ModelStatus,
  AlertSeverity,
  AlertPriority,
  AlertStatus,
  AlertChannel,
  Trend,
  DataQuality,
  SignalStatus
} from './types/index.js';
