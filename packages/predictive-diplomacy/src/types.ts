/**
 * Predictive Diplomacy and Forecasting Types
 * Advanced prediction and forecasting for diplomatic outcomes
 */

export enum PredictionType {
  RELATIONSHIP_TRAJECTORY = 'RELATIONSHIP_TRAJECTORY',
  POLICY_SHIFT = 'POLICY_SHIFT',
  ALLIANCE_CHANGE = 'ALLIANCE_CHANGE',
  NEGOTIATION_OUTCOME = 'NEGOTIATION_OUTCOME',
  TREATY_RATIFICATION = 'TREATY_RATIFICATION',
  DIPLOMATIC_INCIDENT = 'DIPLOMATIC_INCIDENT',
  CRISIS_ESCALATION = 'CRISIS_ESCALATION',
  LEADERSHIP_TRANSITION_IMPACT = 'LEADERSHIP_TRANSITION_IMPACT',
  REGIONAL_STABILITY = 'REGIONAL_STABILITY',
  MULTILATERAL_INITIATIVE = 'MULTILATERAL_INITIATIVE'
}

export enum PredictionTimeframe {
  IMMEDIATE = 'IMMEDIATE', // 0-3 months
  SHORT_TERM = 'SHORT_TERM', // 3-12 months
  MEDIUM_TERM = 'MEDIUM_TERM', // 1-3 years
  LONG_TERM = 'LONG_TERM' // 3+ years
}

export enum Confidence {
  VERY_HIGH = 'VERY_HIGH', // 90-100%
  HIGH = 'HIGH', // 75-90%
  MEDIUM = 'MEDIUM', // 50-75%
  LOW = 'LOW', // 25-50%
  VERY_LOW = 'VERY_LOW' // 0-25%
}

export interface Prediction {
  id: string;
  type: PredictionType;
  timeframe: PredictionTimeframe;
  generatedDate: Date;
  targetDate?: Date;

  // Prediction details
  subject: string;
  description: string;
  prediction: string;
  confidence: Confidence;
  confidenceScore: number; // 0-100

  // Supporting data
  indicators: Indicator[];
  historicalPatterns: HistoricalPattern[];
  scenarios: Scenario[];
  assumptions: string[];
  limitingFactors: string[];

  // Probability distribution
  outcomes: PredictedOutcome[];
  mostLikelyOutcome: PredictedOutcome;
  worstCase: PredictedOutcome;
  bestCase: PredictedOutcome;

  // Monitoring
  keyEventsToWatch: string[];
  earlyWarningSignals: string[];
  verificationMilestones: VerificationMilestone[];

  // Context
  relatedPredictions?: string[]; // Other prediction IDs
  dependencies?: string[];
  geopoliticalContext: string;

  // Updates
  updates?: PredictionUpdate[];
  actualOutcome?: {
    outcome: string;
    date: Date;
    accuracy: number; // 0-100
  };

  createdAt: Date;
  updatedAt: Date;
  validUntil?: Date;
  tags?: string[];
}

export interface Indicator {
  id: string;
  type: 'LEADING' | 'COINCIDENT' | 'LAGGING';
  category: string;
  description: string;
  currentValue: number | string;
  threshold?: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE' | 'VOLATILE';
  weight: number; // importance 0-1
  reliability: number; // 0-1
  lastUpdated: Date;
}

export interface HistoricalPattern {
  id: string;
  pattern: string;
  description: string;
  occurrences: {
    date: Date;
    context: string;
    outcome: string;
    similarity: number; // 0-100 to current situation
  }[];
  predictivePower: number; // 0-100
  conditions: string[];
}

export interface Scenario {
  id: string;
  name: string;
  probability: number; // 0-100
  description: string;
  triggers: string[];
  timeline: ScenarioEvent[];
  impact: {
    geopolitical: 'MINIMAL' | 'MODERATE' | 'SIGNIFICANT' | 'MAJOR' | 'TRANSFORMATIVE';
    economic: 'MINIMAL' | 'MODERATE' | 'SIGNIFICANT' | 'MAJOR' | 'TRANSFORMATIVE';
    security: 'MINIMAL' | 'MODERATE' | 'SIGNIFICANT' | 'MAJOR' | 'TRANSFORMATIVE';
  };
  keyActors: string[];
  dependencies: string[];
}

export interface ScenarioEvent {
  timeOffset: number; // days from trigger
  event: string;
  probability: number; // conditional on scenario
  criticalPathEvent: boolean;
}

export interface PredictedOutcome {
  outcome: string;
  probability: number; // 0-100
  confidence: Confidence;
  timeframe: string;
  implications: string[];
  stakeholders: {
    actor: string;
    impact: 'VERY_POSITIVE' | 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'VERY_NEGATIVE';
    response?: string;
  }[];
}

export interface VerificationMilestone {
  date: Date;
  expectedEvent: string;
  actualEvent?: string;
  verified: boolean;
  verificationDate?: Date;
  impact: 'STRENGTHENS' | 'NEUTRAL' | 'WEAKENS' | 'INVALIDATES';
}

export interface PredictionUpdate {
  date: Date;
  reason: string;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  confidenceAdjustment?: number;
  newInformation: string;
}

export interface TrendAnalysis {
  subject: string;
  domain: string;
  timeRange: { start: Date; end: Date };

  overallTrend: 'STRONGLY_POSITIVE' | 'POSITIVE' | 'STABLE' | 'NEGATIVE' | 'STRONGLY_NEGATIVE' | 'VOLATILE';
  trendStrength: number; // 0-100
  volatility: number; // 0-100

  dataPoints: {
    date: Date;
    value: number;
    confidence: number;
  }[];

  projection: {
    shortTerm: { value: number; confidence: number };
    mediumTerm: { value: number; confidence: number };
    longTerm: { value: number; confidence: number };
  };

  inflectionPoints: {
    date: Date;
    description: string;
    cause?: string;
  }[];

  drivers: {
    driver: string;
    impact: number; // -100 to 100
    persistence: 'TEMPORARY' | 'MEDIUM_TERM' | 'LONG_TERM' | 'STRUCTURAL';
  }[];
}

export interface RiskScenario {
  id: string;
  riskType: 'DIPLOMATIC' | 'MILITARY' | 'ECONOMIC' | 'HUMANITARIAN' | 'ENVIRONMENTAL' | 'HEALTH';
  title: string;
  description: string;

  probability: number; // 0-100
  impact: number; // 1-10
  riskScore: number; // probability * impact
  timeframe: PredictionTimeframe;

  triggers: {
    trigger: string;
    likelihood: number;
    leadTime?: number; // days of warning
  }[];

  escalationPath: {
    stage: string;
    description: string;
    probabilityOfReaching: number;
    timeToReach?: number; // days
  }[];

  mitigationStrategies: {
    strategy: string;
    effectiveness: number; // 0-100
    cost: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
    timeToImplement: number; // days
    stakeholders: string[];
  }[];

  earlyWarningIndicators: Indicator[];
  monitoringRecommendations: string[];
}

export interface OpportunityForecast {
  id: string;
  opportunityType: 'DIPLOMATIC' | 'ECONOMIC' | 'STRATEGIC' | 'MULTILATERAL' | 'BILATERAL';
  title: string;
  description: string;

  probability: number; // 0-100
  benefit: number; // 1-10
  opportunityScore: number;
  timeframe: PredictionTimeframe;
  window: { opensAt?: Date; closesAt?: Date };

  preconditions: {
    condition: string;
    currentStatus: 'MET' | 'PARTIALLY_MET' | 'NOT_MET';
    importance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  }[];

  exploitationStrategies: {
    strategy: string;
    successProbability: number;
    resources: string[];
    timeline: number; // days
    stakeholders: string[];
  }[];

  competingActors?: {
    actor: string;
    likelihood: number;
    advantage?: string;
  }[];

  dependencies: string[];
  recommendations: string[];
}

export interface DiplomaticForecast {
  id: string;
  scope: 'BILATERAL' | 'REGIONAL' | 'GLOBAL';
  subject: string;
  timeframe: PredictionTimeframe;
  generatedDate: Date;

  predictions: Prediction[];
  trends: TrendAnalysis[];
  risks: RiskScenario[];
  opportunities: OpportunityForecast[];

  keyFindings: string[];
  strategicRecommendations: string[];
  uncertainties: string[];

  confidenceAssessment: {
    overall: Confidence;
    byType: Record<PredictionType, Confidence>;
  };

  modelAccuracy?: {
    historicalAccuracy: number; // 0-100
    recentAccuracy: number;
    predictionTypes: Record<PredictionType, number>;
  };
}

export interface AllianceShiftPrediction {
  country: string;
  currentAlliance?: string;
  predictedShift: {
    newAlignment: string;
    probability: number;
    timeframe: PredictionTimeframe;
    drivers: string[];
  };
  hedgingBehavior?: {
    strategy: string;
    indicators: string[];
  };
}

export interface LeadershipTransitionImpact {
  country: string;
  transitionType: 'ELECTION' | 'APPOINTMENT' | 'SUCCESSION' | 'COUP' | 'REVOLUTION';
  expectedDate?: Date;
  probability: number;

  expectedPolicyChanges: {
    domain: string;
    currentPolicy: string;
    predictedPolicy: string;
    likelihood: number;
    timeToChange?: number; // days
  }[];

  relationshipImpacts: {
    counterparty: string;
    currentStatus: string;
    predictedStatus: string;
    confidence: number;
  }[];

  regionalImpact: string;
  globalImpact: string;
  stability: 'STABILIZING' | 'NEUTRAL' | 'DESTABILIZING';
}

export interface NegotiationOutcomePrediction {
  negotiationId: string;
  subject: string;
  parties: string[];
  startDate: Date;

  predictedDuration: number; // days
  successProbability: number; // 0-100

  possibleOutcomes: {
    outcome: string;
    probability: number;
    favoredParties: string[];
    timeToAchieve?: number;
  }[];

  stickingPoints: {
    issue: string;
    difficulty: number; // 1-10
    resolutionPath?: string;
  }[];

  dealBreakers: string[];
  sweeteners: string[];

  externalFactors: {
    factor: string;
    impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    controllable: boolean;
  }[];
}

export interface RegionalStabilityForecast {
  region: string;
  timeframe: PredictionTimeframe;
  overallStability: number; // 0-100
  trend: 'IMPROVING' | 'STABLE' | 'DETERIORATING';

  flashpoints: {
    location: string;
    issue: string;
    escalationRisk: number; // 0-100
    parties: string[];
    mitigationOptions: string[];
  }[];

  stabilizingFactors: string[];
  destabilizingFactors: string[];

  countryStability: {
    country: string;
    stability: number;
    trend: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
  }[];

  spilloverRisks: {
    from: string;
    to: string[];
    probability: number;
    mechanism: string;
  }[];

  recommendations: string[];
}
