/**
 * Early Warning System - Type Definitions
 * Comprehensive types for predictive analytics and crisis forecasting
 */

// ============================================================================
// Crisis Types and Scenarios
// ============================================================================

export enum CrisisType {
  // Political Crises
  POLITICAL_INSTABILITY = 'POLITICAL_INSTABILITY',
  REGIME_CHANGE = 'REGIME_CHANGE',
  GOVERNMENT_COLLAPSE = 'GOVERNMENT_COLLAPSE',
  CONSTITUTIONAL_CRISIS = 'CONSTITUTIONAL_CRISIS',
  CIVIL_UNREST = 'CIVIL_UNREST',
  COUP_ATTEMPT = 'COUP_ATTEMPT',

  // Security Crises
  ARMED_CONFLICT = 'ARMED_CONFLICT',
  CIVIL_WAR = 'CIVIL_WAR',
  INTERSTATE_WAR = 'INTERSTATE_WAR',
  INSURGENCY = 'INSURGENCY',
  TERRORISM_WAVE = 'TERRORISM_WAVE',
  BORDER_CONFLICT = 'BORDER_CONFLICT',

  // Economic Crises
  ECONOMIC_COLLAPSE = 'ECONOMIC_COLLAPSE',
  FINANCIAL_CRISIS = 'FINANCIAL_CRISIS',
  CURRENCY_CRISIS = 'CURRENCY_CRISIS',
  DEBT_CRISIS = 'DEBT_CRISIS',
  HYPERINFLATION = 'HYPERINFLATION',
  BANKING_CRISIS = 'BANKING_CRISIS',

  // Social Crises
  HUMANITARIAN_CRISIS = 'HUMANITARIAN_CRISIS',
  REFUGEE_CRISIS = 'REFUGEE_CRISIS',
  FAMINE = 'FAMINE',
  EPIDEMIC = 'EPIDEMIC',
  ENVIRONMENTAL_DISASTER = 'ENVIRONMENTAL_DISASTER',
  MASS_MIGRATION = 'MASS_MIGRATION',

  // International Relations
  DIPLOMATIC_CRISIS = 'DIPLOMATIC_CRISIS',
  ALLIANCE_BREAKDOWN = 'ALLIANCE_BREAKDOWN',
  SANCTIONS_ESCALATION = 'SANCTIONS_ESCALATION',
  TRADE_WAR = 'TRADE_WAR',
  NUCLEAR_THREAT = 'NUCLEAR_THREAT',
  CYBER_WARFARE = 'CYBER_WARFARE'
}

export enum CrisisSeverity {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  SEVERE = 'SEVERE',
  CRITICAL = 'CRITICAL',
  CATASTROPHIC = 'CATASTROPHIC'
}

export enum CrisisPhase {
  PRE_CRISIS = 'PRE_CRISIS',           // Warning signs emerging
  EMERGING = 'EMERGING',               // Crisis beginning to manifest
  ESCALATING = 'ESCALATING',           // Crisis intensifying
  PEAK = 'PEAK',                       // Crisis at maximum intensity
  DE_ESCALATING = 'DE_ESCALATING',     // Crisis subsiding
  RESOLUTION = 'RESOLUTION',           // Crisis being resolved
  POST_CRISIS = 'POST_CRISIS'          // After-effects and recovery
}

export interface CrisisScenario {
  id: string;
  type: CrisisType;
  severity: CrisisSeverity;
  phase: CrisisPhase;

  // Description
  title: string;
  description: string;
  triggers: TriggerEvent[];

  // Affected entities
  countries: string[];
  regions: string[];
  affectedPopulation: number;

  // Probability and confidence
  probability: number; // 0-1
  confidence: ConfidenceMetrics;

  // Timeline
  estimatedOnset: Date | null;
  estimatedDuration: {
    min: number; // days
    max: number;
    expected: number;
  } | null;

  // Impact assessment
  impact: CrisisImpact;

  // Related scenarios
  relatedScenarios: string[];
  dependencies: string[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastAnalyzed: Date;
  metadata: Record<string, any>;
}

export interface TriggerEvent {
  id: string;
  type: string;
  description: string;
  probability: number;
  alreadyOccurred: boolean;
  occurredAt?: Date;
  leadTime: number; // hours before crisis onset
  catalystPotential: number; // 0-1, how much it accelerates crisis
}

export interface CrisisImpact {
  // Multi-dimensional impact scores (0-100)
  political: number;
  economic: number;
  social: number;
  security: number;
  humanitarian: number;
  environmental: number;
  overall: number;

  // Quantitative estimates
  estimatedCasualties?: {
    deaths: { min: number; max: number; expected: number };
    injuries: { min: number; max: number; expected: number };
    displaced: { min: number; max: number; expected: number };
  };

  estimatedEconomicCost?: {
    amount: { min: number; max: number; expected: number };
    currency: string;
  };

  affectedInfrastructure?: string[];
  secondaryEffects: string[];
  spilloverRisk: number; // 0-1, risk of crisis spreading
}

// ============================================================================
// Warning Indicators and Signals
// ============================================================================

export enum IndicatorType {
  LEADING = 'LEADING',     // Predicts future crises
  LAGGING = 'LAGGING',     // Confirms crisis has occurred
  COINCIDENT = 'COINCIDENT' // Moves with the crisis
}

export enum IndicatorCategory {
  POLITICAL = 'POLITICAL',
  ECONOMIC = 'ECONOMIC',
  SOCIAL = 'SOCIAL',
  SECURITY = 'SECURITY',
  ENVIRONMENTAL = 'ENVIRONMENTAL',
  DIPLOMATIC = 'DIPLOMATIC',
  MEDIA_SENTIMENT = 'MEDIA_SENTIMENT'
}

export interface WarningIndicator {
  id: string;
  name: string;
  type: IndicatorType;
  category: IndicatorCategory;

  // Description
  description: string;
  relevantCrises: CrisisType[];

  // Measurement
  currentValue: number;
  historicalValues: TimeSeriesData[];
  threshold: IndicatorThreshold;

  // Strength and reliability
  weight: number; // 0-1, importance in predictions
  reliability: number; // 0-1, historical accuracy
  leadTime: number; // days before crisis

  // Change analysis
  trend: Trend;
  velocity: number; // rate of change
  acceleration: number; // rate of change of rate of change

  // Status
  status: IndicatorStatus;
  lastUpdated: Date;
  metadata: Record<string, any>;
}

export enum IndicatorStatus {
  NORMAL = 'NORMAL',
  ELEVATED = 'ELEVATED',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  BREACH = 'BREACH' // Threshold exceeded
}

export interface IndicatorThreshold {
  normal: { min: number; max: number };
  elevated: { min: number; max: number };
  warning: { min: number; max: number };
  critical: { min: number; max: number };
  breach: number; // absolute threshold
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  quality: DataQuality;
  source?: string;
}

export enum DataQuality {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  ESTIMATED = 'ESTIMATED',
  INTERPOLATED = 'INTERPOLATED'
}

export enum Trend {
  STRONGLY_DECREASING = 'STRONGLY_DECREASING',
  DECREASING = 'DECREASING',
  STABLE = 'STABLE',
  INCREASING = 'INCREASING',
  STRONGLY_INCREASING = 'STRONGLY_INCREASING',
  VOLATILE = 'VOLATILE'
}

export interface WarningSignal {
  id: string;
  severity: AlertSeverity;
  priority: AlertPriority;

  // Signal details
  title: string;
  description: string;
  indicators: string[]; // IDs of triggered indicators

  // Crisis linkage
  potentialCrises: {
    crisisType: CrisisType;
    probability: number;
    timeframe: string;
  }[];

  // Timing
  detectedAt: Date;
  estimatedCrisisOnset: Date | null;
  timeToAction: number; // hours until response needed

  // Confidence and validation
  confidence: ConfidenceMetrics;
  validatedBy?: string[];
  falseAlarmProbability: number;

  // Status
  status: SignalStatus;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

export enum SignalStatus {
  NEW = 'NEW',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  INVESTIGATING = 'INVESTIGATING',
  CONFIRMED = 'CONFIRMED',
  FALSE_ALARM = 'FALSE_ALARM',
  RESOLVED = 'RESOLVED',
  ESCALATED = 'ESCALATED'
}

// ============================================================================
// Prediction Models
// ============================================================================

export enum ModelType {
  // Statistical Models
  TIME_SERIES = 'TIME_SERIES',
  REGRESSION = 'REGRESSION',
  ARIMA = 'ARIMA',
  EXPONENTIAL_SMOOTHING = 'EXPONENTIAL_SMOOTHING',

  // Machine Learning Models
  NEURAL_NETWORK = 'NEURAL_NETWORK',
  RANDOM_FOREST = 'RANDOM_FOREST',
  GRADIENT_BOOSTING = 'GRADIENT_BOOSTING',
  SVM = 'SVM',

  // Probabilistic Models
  BAYESIAN_NETWORK = 'BAYESIAN_NETWORK',
  MARKOV_CHAIN = 'MARKOV_CHAIN',
  MONTE_CARLO = 'MONTE_CARLO',

  // Hybrid Models
  ENSEMBLE = 'ENSEMBLE',
  HYBRID = 'HYBRID'
}

export interface PredictionModel {
  id: string;
  name: string;
  type: ModelType;
  version: string;

  // Model description
  description: string;
  targetCrisis: CrisisType | CrisisType[] | 'ALL';

  // Performance metrics
  performance: ModelPerformance;

  // Configuration
  parameters: Record<string, any>;
  features: ModelFeature[];

  // Training
  trainingDataRange: { start: Date; end: Date };
  lastTrained: Date;
  trainingSize: number;

  // Validation
  validationMethod: 'CROSS_VALIDATION' | 'HOLDOUT' | 'TIME_SERIES_SPLIT';
  validationScore: number;

  // Status
  status: ModelStatus;
  isActive: boolean;
  metadata: Record<string, any>;
}

export enum ModelStatus {
  TRAINING = 'TRAINING',
  READY = 'READY',
  DEPLOYED = 'DEPLOYED',
  DEPRECATED = 'DEPRECATED',
  FAILED = 'FAILED'
}

export interface ModelFeature {
  name: string;
  type: 'NUMERIC' | 'CATEGORICAL' | 'BINARY' | 'TEXT' | 'TIME_SERIES';
  importance: number; // 0-1
  source: string;
  transformations?: string[];
}

export interface ModelPerformance {
  // Classification metrics
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  auc?: number;

  // Regression metrics
  rmse?: number; // Root Mean Squared Error
  mae?: number;  // Mean Absolute Error
  r2?: number;   // R-squared

  // Probabilistic metrics
  brierScore?: number;
  logLoss?: number;

  // Custom metrics
  timeliness: number; // How early predictions are made
  falsePositiveRate: number;
  falseNegativeRate: number;

  // Temporal performance
  performanceHistory: {
    date: Date;
    metric: string;
    value: number;
  }[];
}

export interface Prediction {
  id: string;
  modelId: string;

  // What is being predicted
  crisisType: CrisisType;
  scenario: string;

  // Prediction details
  probability: number; // 0-1
  confidence: ConfidenceMetrics;

  // Timeline
  predictionHorizon: number; // days ahead
  predictedOnset: Date;
  predictionMadeAt: Date;

  // Context
  triggeringIndicators: string[];
  supportingEvidence: string[];

  // Uncertainty
  uncertaintyFactors: UncertaintyFactor[];
  sensitivityAnalysis?: SensitivityAnalysis;

  // Validation
  outcome?: PredictionOutcome;
  actualOnset?: Date;
  validated: boolean;
  validatedAt?: Date;
}

export interface UncertaintyFactor {
  factor: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  mitigable: boolean;
}

export interface SensitivityAnalysis {
  baselineProbability: number;
  scenarios: {
    name: string;
    adjustment: string;
    probability: number;
    delta: number;
  }[];
}

export interface PredictionOutcome {
  occurred: boolean;
  actualSeverity?: CrisisSeverity;
  predictionError: number; // days off from actual
  outcomeRecordedAt: Date;
}

// ============================================================================
// Confidence Metrics
// ============================================================================

export interface ConfidenceMetrics {
  overall: number; // 0-1, overall confidence score

  // Component confidences
  dataQuality: number; // Quality of input data
  modelReliability: number; // Historical model performance
  indicatorStrength: number; // Strength of warning indicators
  expertConsensus: number; // Agreement among experts/analysts

  // Uncertainty measures
  standardError?: number;
  confidenceInterval?: {
    lower: number;
    upper: number;
    level: number; // e.g., 0.95 for 95% CI
  };

  // Factors affecting confidence
  dataGaps: string[];
  assumptions: string[];
  limitations: string[];
}

// ============================================================================
// Alert System
// ============================================================================

export enum AlertSeverity {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
  EMERGENCY = 'EMERGENCY'
}

export enum AlertPriority {
  P1 = 'P1', // Immediate action required
  P2 = 'P2', // Action required within hours
  P3 = 'P3', // Action required within days
  P4 = 'P4', // Informational
  P5 = 'P5'  // Low priority
}

export enum AlertStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

export interface Alert {
  id: string;
  type: 'WARNING' | 'FORECAST' | 'SIGNAL' | 'UPDATE' | 'ESCALATION';
  severity: AlertSeverity;
  priority: AlertPriority;

  // Content
  title: string;
  message: string;
  summary: string;
  details: string;

  // Context
  crisisType?: CrisisType;
  affectedCountries: string[];
  affectedRegions: string[];

  // Source
  sourceType: 'MODEL' | 'INDICATOR' | 'ANALYST' | 'SYSTEM';
  sourceId: string;
  predictionId?: string;
  indicatorIds?: string[];

  // Recipients and routing
  recipients: Recipient[];
  channels: AlertChannel[];

  // Timing
  createdAt: Date;
  sentAt?: Date;
  expiresAt?: Date;

  // Actions
  recommendedActions: string[];
  requiredActions?: string[];
  deadline?: Date;

  // Status tracking
  status: AlertStatus;
  acknowledgments: Acknowledgment[];
  escalations: Escalation[];

  // Metadata
  tags: string[];
  metadata: Record<string, any>;
}

export interface Recipient {
  id: string;
  name: string;
  role: string;
  organization?: string;
  contacts: {
    email?: string;
    phone?: string;
    sms?: string;
  };
  priority: AlertPriority;
  acknowledged: boolean;
  acknowledgedAt?: Date;
}

export enum AlertChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PHONE = 'PHONE',
  PUSH_NOTIFICATION = 'PUSH_NOTIFICATION',
  SLACK = 'SLACK',
  TEAMS = 'TEAMS',
  WEBHOOK = 'WEBHOOK',
  DASHBOARD = 'DASHBOARD'
}

export interface Acknowledgment {
  id: string;
  recipientId: string;
  acknowledgedAt: Date;
  response?: string;
  action?: string;
}

export interface Escalation {
  id: string;
  reason: string;
  escalatedFrom: AlertSeverity;
  escalatedTo: AlertSeverity;
  escalatedAt: Date;
  escalatedBy: string;
  additionalRecipients: string[];
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;

  // Trigger conditions
  conditions: AlertCondition[];
  logicalOperator: 'AND' | 'OR';

  // Alert configuration
  severity: AlertSeverity;
  priority: AlertPriority;
  template: string;

  // Recipients
  recipientGroups: string[];
  channels: AlertChannel[];

  // Timing
  cooldownPeriod: number; // minutes between same alerts
  escalationTime: number; // minutes before escalation

  // Status
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertCondition {
  type: 'INDICATOR' | 'PREDICTION' | 'THRESHOLD' | 'PATTERN' | 'COMPOSITE';
  parameter: string;
  operator: 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ' | 'NEQ' | 'IN' | 'NOT_IN';
  value: any;
  duration?: number; // condition must be true for this many minutes
}

// ============================================================================
// Risk Scoring and Forecasting
// ============================================================================

export interface RiskScore {
  country: string;
  region?: string;

  // Overall risk
  overallRisk: number; // 0-100
  riskLevel: 'MINIMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' | 'EXTREME';

  // Risk by type
  riskByType: Record<CrisisType, number>;

  // Component scores
  politicalRisk: number;
  economicRisk: number;
  socialRisk: number;
  securityRisk: number;

  // Trends
  trend: Trend;
  change30Days: number;
  change90Days: number;

  // Forecasts
  forecasts: RiskForecast[];

  // Analysis
  keyRiskFactors: string[];
  protectiveFactors: string[];

  // Metadata
  calculatedAt: Date;
  validUntil: Date;
  confidence: ConfidenceMetrics;
}

export interface RiskForecast {
  horizon: number; // days ahead
  forecastDate: Date;
  predictedRisk: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  majorDrivers: string[];
}

// ============================================================================
// Scenario Analysis and Simulation
// ============================================================================

export interface ScenarioAnalysis {
  id: string;
  name: string;
  description: string;

  // Scenarios
  baselineScenario: Scenario;
  alternativeScenarios: Scenario[];

  // Analysis
  mostLikelyScenario: string;
  worstCaseScenario: string;
  bestCaseScenario: string;

  // Comparison
  scenarioComparison: ScenarioComparison[];

  // Metadata
  createdAt: Date;
  analyzedAt: Date;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;

  // Assumptions
  assumptions: Assumption[];

  // Probability
  probability: number;

  // Outcomes
  predictedOutcomes: PredictedOutcome[];

  // Impact
  impact: CrisisImpact;

  // Timeline
  timeline: TimelineEvent[];
}

export interface Assumption {
  id: string;
  description: string;
  type: 'CERTAIN' | 'LIKELY' | 'POSSIBLE' | 'SPECULATIVE';
  confidence: number;
}

export interface PredictedOutcome {
  description: string;
  probability: number;
  timeframe: string;
  impact: number; // 0-100
}

export interface TimelineEvent {
  date: Date;
  event: string;
  probability: number;
  impact: number;
}

export interface ScenarioComparison {
  metric: string;
  scenarios: Record<string, number>;
}

// ============================================================================
// Monte Carlo Simulation
// ============================================================================

export interface MonteCarloSimulation {
  id: string;
  name: string;
  description: string;

  // Configuration
  iterations: number;
  randomSeed?: number;

  // Variables
  inputVariables: SimulationVariable[];
  outputVariables: string[];

  // Results
  results: SimulationResults;

  // Metadata
  startedAt: Date;
  completedAt: Date;
  computeTime: number; // milliseconds
}

export interface SimulationVariable {
  name: string;
  distribution: 'NORMAL' | 'UNIFORM' | 'TRIANGULAR' | 'BETA' | 'EXPONENTIAL';
  parameters: Record<string, number>;
  constraints?: {
    min?: number;
    max?: number;
  };
}

export interface SimulationResults {
  summary: {
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
    percentiles: Record<number, number>;
  };

  // Distribution
  histogram: {
    bins: number[];
    frequencies: number[];
  };

  // Probabilities
  probabilities: {
    exceedingThreshold: Record<number, number>;
    withinRange: Record<string, number>;
  };

  // Sensitivity
  sensitivityAnalysis: {
    variable: string;
    correlation: number;
    impact: number;
  }[];
}

// ============================================================================
// System Configuration
// ============================================================================

export interface EarlyWarningConfig {
  // Monitoring
  monitoringEnabled: boolean;
  monitoredRegions: string[];
  monitoredCountries: string[];
  monitoredCrises: CrisisType[];
  updateInterval: number; // milliseconds

  // Prediction
  predictionEnabled: boolean;
  activePredictionModels: string[];
  predictionHorizons: number[]; // days ahead
  minPredictionConfidence: number;

  // Indicators
  indicatorRefreshInterval: number; // milliseconds
  indicatorSources: string[];
  minIndicatorReliability: number;

  // Alerts
  alertingEnabled: boolean;
  minAlertSeverity: AlertSeverity;
  alertChannels: AlertChannel[];
  escalationEnabled: boolean;
  escalationThresholds: {
    timeWithoutAcknowledgment: number; // minutes
    severityIncrease: boolean;
  };

  // Machine Learning
  mlEnabled: boolean;
  autoRetrain: boolean;
  retrainInterval: number; // days
  minTrainingDataSize: number;

  // System
  dataRetentionDays: number;
  archiveOldData: boolean;
  enableTelemetry: boolean;
}

// ============================================================================
// Events for EventEmitter
// ============================================================================

export interface EarlyWarningEvents {
  // Warnings
  'warning-signal': (signal: WarningSignal) => void;
  'indicator-breach': (indicator: WarningIndicator) => void;

  // Predictions
  'prediction-made': (prediction: Prediction) => void;
  'crisis-predicted': (scenario: CrisisScenario) => void;
  'probability-increased': (scenario: CrisisScenario, oldProb: number, newProb: number) => void;
  'probability-decreased': (scenario: CrisisScenario, oldProb: number, newProb: number) => void;

  // Alerts
  'alert-created': (alert: Alert) => void;
  'alert-sent': (alert: Alert) => void;
  'alert-acknowledged': (alert: Alert, acknowledgment: Acknowledgment) => void;
  'alert-escalated': (alert: Alert, escalation: Escalation) => void;

  // Models
  'model-trained': (model: PredictionModel) => void;
  'model-performance-degraded': (model: PredictionModel) => void;

  // System
  'system-started': () => void;
  'system-stopped': () => void;
  'error': (error: Error) => void;
}
