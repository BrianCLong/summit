/**
 * Strategic Framework - Core Type Definitions
 *
 * Comprehensive type system for strategic planning, analysis,
 * decision support, and monitoring capabilities.
 */

import { z } from 'zod';

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const StrategicPriority = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
} as const;
export type StrategicPriority = (typeof StrategicPriority)[keyof typeof StrategicPriority];

export const StrategicStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ON_HOLD: 'ON_HOLD',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  AT_RISK: 'AT_RISK',
} as const;
export type StrategicStatus = (typeof StrategicStatus)[keyof typeof StrategicStatus];

export const TimeHorizon = {
  IMMEDIATE: 'IMMEDIATE',      // 0-3 months
  SHORT_TERM: 'SHORT_TERM',    // 3-12 months
  MEDIUM_TERM: 'MEDIUM_TERM',  // 1-3 years
  LONG_TERM: 'LONG_TERM',      // 3-5 years
  STRATEGIC: 'STRATEGIC',      // 5+ years
} as const;
export type TimeHorizon = (typeof TimeHorizon)[keyof typeof TimeHorizon];

export const AnalysisType = {
  SWOT: 'SWOT',
  PESTLE: 'PESTLE',
  PORTER_FIVE_FORCES: 'PORTER_FIVE_FORCES',
  GAP_ANALYSIS: 'GAP_ANALYSIS',
  SCENARIO_PLANNING: 'SCENARIO_PLANNING',
  RISK_ASSESSMENT: 'RISK_ASSESSMENT',
  CAPABILITY_ASSESSMENT: 'CAPABILITY_ASSESSMENT',
  COMPETITIVE_ANALYSIS: 'COMPETITIVE_ANALYSIS',
} as const;
export type AnalysisType = (typeof AnalysisType)[keyof typeof AnalysisType];

export const DecisionType = {
  STRATEGIC: 'STRATEGIC',
  TACTICAL: 'TACTICAL',
  OPERATIONAL: 'OPERATIONAL',
  RESOURCE_ALLOCATION: 'RESOURCE_ALLOCATION',
  RISK_MITIGATION: 'RISK_MITIGATION',
  INVESTMENT: 'INVESTMENT',
  PARTNERSHIP: 'PARTNERSHIP',
  MARKET_ENTRY: 'MARKET_ENTRY',
} as const;
export type DecisionType = (typeof DecisionType)[keyof typeof DecisionType];

export const ImpactLevel = {
  TRANSFORMATIONAL: 'TRANSFORMATIONAL',
  SIGNIFICANT: 'SIGNIFICANT',
  MODERATE: 'MODERATE',
  MINOR: 'MINOR',
  NEGLIGIBLE: 'NEGLIGIBLE',
} as const;
export type ImpactLevel = (typeof ImpactLevel)[keyof typeof ImpactLevel];

export const RiskCategory = {
  STRATEGIC: 'STRATEGIC',
  OPERATIONAL: 'OPERATIONAL',
  FINANCIAL: 'FINANCIAL',
  COMPLIANCE: 'COMPLIANCE',
  REPUTATIONAL: 'REPUTATIONAL',
  TECHNOLOGICAL: 'TECHNOLOGICAL',
  MARKET: 'MARKET',
  GEOPOLITICAL: 'GEOPOLITICAL',
} as const;
export type RiskCategory = (typeof RiskCategory)[keyof typeof RiskCategory];

export const MetricType = {
  KPI: 'KPI',
  OKR: 'OKR',
  LEADING_INDICATOR: 'LEADING_INDICATOR',
  LAGGING_INDICATOR: 'LAGGING_INDICATOR',
  HEALTH_METRIC: 'HEALTH_METRIC',
  EFFICIENCY_METRIC: 'EFFICIENCY_METRIC',
} as const;
export type MetricType = (typeof MetricType)[keyof typeof MetricType];

// ============================================================================
// BASE INTERFACES
// ============================================================================

export interface Auditable {
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  version: number;
}

export interface Identifiable {
  id: string;
}

export interface Taggable {
  tags: string[];
  labels: Record<string, string>;
}

// ============================================================================
// STRATEGIC PLANNING TYPES
// ============================================================================

export interface StrategicGoal extends Identifiable, Auditable, Taggable {
  title: string;
  description: string;
  vision: string;
  missionAlignment: string;
  priority: StrategicPriority;
  status: StrategicStatus;
  timeHorizon: TimeHorizon;
  startDate: Date;
  targetDate: Date;
  owner: string;
  stakeholders: string[];
  objectives: StrategicObjective[];
  successCriteria: SuccessCriterion[];
  dependencies: string[];
  risks: string[];
  progress: number; // 0-100
  healthScore: number; // 0-100
  lastAssessmentDate: Date;
  notes: string;
}

export interface StrategicObjective extends Identifiable, Auditable {
  goalId: string;
  title: string;
  description: string;
  keyResults: KeyResult[];
  priority: StrategicPriority;
  status: StrategicStatus;
  owner: string;
  contributors: string[];
  startDate: Date;
  targetDate: Date;
  progress: number;
  initiatives: Initiative[];
  alignedCapabilities: string[];
  measurementCriteria: string;
}

export interface KeyResult extends Identifiable, Auditable {
  objectiveId: string;
  title: string;
  description: string;
  metricType: MetricType;
  baseline: number;
  target: number;
  current: number;
  unit: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  dataSource: string;
  owner: string;
  status: StrategicStatus;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  confidence: number; // 0-100
  history: MetricDataPoint[];
}

export interface Initiative extends Identifiable, Auditable, Taggable {
  objectiveId: string;
  title: string;
  description: string;
  rationale: string;
  priority: StrategicPriority;
  status: StrategicStatus;
  owner: string;
  team: string[];
  startDate: Date;
  targetDate: Date;
  actualEndDate?: Date;
  budget: BudgetAllocation;
  milestones: Milestone[];
  deliverables: Deliverable[];
  dependencies: InitiativeDependency[];
  risks: InitiativeRisk[];
  progress: number;
  effortEstimate: number; // person-days
  actualEffort: number;
  impactAssessment: ImpactAssessment;
}

export interface Milestone extends Identifiable {
  initiativeId: string;
  title: string;
  description: string;
  targetDate: Date;
  actualDate?: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'BLOCKED';
  deliverables: string[];
  blockers: string[];
  notes: string;
}

export interface Deliverable extends Identifiable {
  initiativeId: string;
  title: string;
  description: string;
  type: 'DOCUMENT' | 'CODE' | 'PROCESS' | 'TRAINING' | 'DEPLOYMENT' | 'OTHER';
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED';
  owner: string;
  dueDate: Date;
  completedDate?: Date;
  acceptanceCriteria: string[];
  artifacts: string[];
}

export interface SuccessCriterion extends Identifiable {
  goalId: string;
  criterion: string;
  measurementMethod: string;
  threshold: string;
  achieved: boolean;
  evidence: string;
  assessmentDate: Date;
}

export interface BudgetAllocation {
  total: number;
  currency: string;
  allocated: number;
  spent: number;
  committed: number;
  forecast: number;
  categories: BudgetCategory[];
}

export interface BudgetCategory {
  name: string;
  allocated: number;
  spent: number;
  description: string;
}

export interface InitiativeDependency {
  dependencyId: string;
  dependencyType: 'FINISH_TO_START' | 'START_TO_START' | 'FINISH_TO_FINISH' | 'START_TO_FINISH';
  description: string;
  isCritical: boolean;
  status: 'PENDING' | 'MET' | 'BLOCKED';
}

export interface InitiativeRisk extends Identifiable {
  initiativeId: string;
  category: RiskCategory;
  description: string;
  probability: number; // 0-1
  impact: ImpactLevel;
  riskScore: number;
  mitigationStrategy: string;
  contingencyPlan: string;
  owner: string;
  status: 'IDENTIFIED' | 'MITIGATED' | 'ACCEPTED' | 'OCCURRED' | 'CLOSED';
  triggers: string[];
  earlyWarningIndicators: string[];
}

export interface ImpactAssessment {
  strategicAlignment: number; // 0-100
  valueCreation: number;
  riskReduction: number;
  capabilityEnhancement: number;
  resourceEfficiency: number;
  overallScore: number;
  narrative: string;
}

export interface MetricDataPoint {
  timestamp: Date;
  value: number;
  note?: string;
}

// ============================================================================
// STRATEGIC ANALYSIS TYPES
// ============================================================================

export interface StrategicAnalysis extends Identifiable, Auditable {
  type: AnalysisType;
  title: string;
  description: string;
  scope: string;
  context: string;
  timeHorizon: TimeHorizon;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
  analyst: string;
  reviewers: string[];
  findings: AnalysisFinding[];
  recommendations: AnalysisRecommendation[];
  confidenceLevel: number;
  dataSourceQuality: number;
  linkedGoals: string[];
  linkedDecisions: string[];
  executiveSummary: string;
}

export interface SWOTAnalysis extends StrategicAnalysis {
  type: 'SWOT';
  strengths: SWOTItem[];
  weaknesses: SWOTItem[];
  opportunities: SWOTItem[];
  threats: SWOTItem[];
  strategicImplications: StrategicImplication[];
}

export interface SWOTItem extends Identifiable {
  description: string;
  impact: ImpactLevel;
  evidence: string[];
  relevance: number; // 0-100
  timeframe: TimeHorizon;
  linkedFactors: string[];
  actionability: number; // 0-100
}

export interface StrategicImplication {
  id: string;
  implication: string;
  derivedFrom: string[]; // SWOT item IDs
  priority: StrategicPriority;
  recommendedAction: string;
  timeframe: TimeHorizon;
}

export interface ScenarioAnalysis extends StrategicAnalysis {
  type: 'SCENARIO_PLANNING';
  scenarios: Scenario[];
  keyUncertainties: Uncertainty[];
  criticalDrivers: Driver[];
  preferredScenario: string;
  contingencyPlans: ContingencyPlan[];
}

export interface Scenario extends Identifiable {
  name: string;
  narrative: string;
  probability: number;
  timeframe: TimeHorizon;
  assumptions: string[];
  triggers: string[];
  implications: ScenarioImplication[];
  opportunities: string[];
  threats: string[];
  preparednessScore: number;
  indicatorSignals: IndicatorSignal[];
}

export interface ScenarioImplication {
  area: string;
  impact: ImpactLevel;
  description: string;
  requiredActions: string[];
}

export interface IndicatorSignal {
  indicator: string;
  currentValue: number;
  thresholdValue: number;
  trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  signalStrength: number;
}

export interface Uncertainty {
  id: string;
  description: string;
  importance: number;
  uncertainty: number;
  relatedScenarios: string[];
}

export interface Driver {
  id: string;
  name: string;
  description: string;
  category: string;
  influence: number;
  predictability: number;
  relatedUncertainties: string[];
}

export interface ContingencyPlan extends Identifiable {
  scenarioId: string;
  name: string;
  description: string;
  triggerConditions: string[];
  actions: ContingencyAction[];
  owner: string;
  status: 'DRAFT' | 'APPROVED' | 'ACTIVATED' | 'COMPLETED';
  lastReviewDate: Date;
  nextReviewDate: Date;
}

export interface ContingencyAction {
  sequence: number;
  action: string;
  owner: string;
  timeline: string;
  resources: string[];
  successCriteria: string;
}

export interface RiskAssessment extends StrategicAnalysis {
  type: 'RISK_ASSESSMENT';
  risks: Risk[];
  riskMatrix: RiskMatrix;
  aggregateRiskScore: number;
  riskAppetite: RiskAppetite;
  mitigationPlan: MitigationPlan;
}

export interface Risk extends Identifiable {
  title: string;
  description: string;
  category: RiskCategory;
  source: string;
  probability: number;
  impact: ImpactLevel;
  impactAreas: string[];
  riskScore: number;
  inherentRisk: number;
  residualRisk: number;
  controls: RiskControl[];
  owner: string;
  status: 'OPEN' | 'MITIGATED' | 'ACCEPTED' | 'TRANSFERRED' | 'CLOSED';
  reviewFrequency: string;
  lastReviewDate: Date;
  escalationThreshold: number;
}

export interface RiskControl {
  id: string;
  type: 'PREVENTIVE' | 'DETECTIVE' | 'CORRECTIVE';
  description: string;
  effectiveness: number;
  owner: string;
  testingFrequency: string;
  lastTestDate: Date;
  status: 'EFFECTIVE' | 'PARTIALLY_EFFECTIVE' | 'INEFFECTIVE';
}

export interface RiskMatrix {
  lowRisks: string[];
  mediumRisks: string[];
  highRisks: string[];
  criticalRisks: string[];
  heatmapData: RiskHeatmapCell[];
}

export interface RiskHeatmapCell {
  probability: number;
  impact: number;
  riskIds: string[];
  color: string;
}

export interface RiskAppetite {
  overallLevel: 'RISK_AVERSE' | 'CAUTIOUS' | 'BALANCED' | 'OPPORTUNISTIC' | 'RISK_SEEKING';
  byCategory: Record<RiskCategory, number>;
  toleranceThresholds: Record<string, number>;
  statement: string;
}

export interface MitigationPlan {
  id: string;
  riskId: string;
  strategies: MitigationStrategy[];
  timeline: string;
  budget: number;
  expectedRiskReduction: number;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface MitigationStrategy {
  id: string;
  type: 'AVOID' | 'REDUCE' | 'TRANSFER' | 'ACCEPT';
  description: string;
  actions: string[];
  owner: string;
  cost: number;
  effectivenessEstimate: number;
}

export interface GapAnalysis extends StrategicAnalysis {
  type: 'GAP_ANALYSIS';
  currentState: StateAssessment;
  targetState: StateAssessment;
  gaps: Gap[];
  closurePlan: GapClosurePlan;
}

export interface StateAssessment {
  description: string;
  capabilities: CapabilityAssessment[];
  maturityLevel: number;
  strengths: string[];
  limitations: string[];
}

export interface CapabilityAssessment {
  capability: string;
  currentLevel: number;
  targetLevel: number;
  gap: number;
  priority: StrategicPriority;
  closureEffort: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
}

export interface Gap extends Identifiable {
  area: string;
  description: string;
  currentState: string;
  targetState: string;
  gapSize: number;
  impact: ImpactLevel;
  priority: StrategicPriority;
  rootCauses: string[];
  closureApproach: string;
  estimatedEffort: number;
  estimatedCost: number;
  timeline: string;
}

export interface GapClosurePlan {
  phases: GapClosurePhase[];
  totalDuration: string;
  totalCost: number;
  quickWins: string[];
  criticalPath: string[];
}

export interface GapClosurePhase {
  phase: number;
  name: string;
  duration: string;
  gaps: string[];
  milestones: string[];
  resources: string[];
  cost: number;
}

export interface AnalysisFinding extends Identifiable {
  category: string;
  finding: string;
  evidence: string[];
  significance: ImpactLevel;
  confidence: number;
  implications: string[];
  linkedTo: string[];
}

export interface AnalysisRecommendation extends Identifiable {
  recommendation: string;
  rationale: string;
  priority: StrategicPriority;
  expectedBenefit: string;
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  timeline: TimeHorizon;
  owner?: string;
  linkedFindings: string[];
  risks: string[];
  prerequisites: string[];
}

// ============================================================================
// STRATEGIC DECISION SUPPORT TYPES
// ============================================================================

export interface StrategicDecision extends Identifiable, Auditable {
  title: string;
  description: string;
  type: DecisionType;
  context: string;
  urgency: 'IMMEDIATE' | 'URGENT' | 'NORMAL' | 'LOW';
  importance: ImpactLevel;
  status: 'PENDING' | 'IN_ANALYSIS' | 'READY_FOR_DECISION' | 'DECIDED' | 'IMPLEMENTED' | 'REVIEWED';
  decisionMaker: string;
  stakeholders: string[];
  deadline: Date;
  options: DecisionOption[];
  criteria: DecisionCriterion[];
  analysis: DecisionAnalysis;
  selectedOption?: string;
  rationale?: string;
  decision?: string;
  decisionDate?: Date;
  implementation?: DecisionImplementation;
  outcome?: DecisionOutcome;
  linkedGoals: string[];
  linkedAnalyses: string[];
  supportingEvidence: string[];
}

export interface DecisionOption extends Identifiable {
  decisionId: string;
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  assumptions: string[];
  risks: DecisionRisk[];
  resourceRequirements: ResourceRequirement[];
  timeline: string;
  cost: CostEstimate;
  expectedOutcomes: ExpectedOutcome[];
  feasibilityScore: number;
  alignmentScore: number;
  overallScore: number;
  rank: number;
}

export interface DecisionCriterion extends Identifiable {
  name: string;
  description: string;
  weight: number;
  type: 'QUANTITATIVE' | 'QUALITATIVE';
  measurementMethod: string;
  minimumThreshold?: number;
  idealValue?: number;
  mustHave: boolean;
}

export interface DecisionAnalysis {
  multiCriteriaAnalysis: MultiCriteriaResult[];
  sensitivityAnalysis: SensitivityResult[];
  scenarioImpacts: ScenarioImpact[];
  tradeoffMatrix: TradeoffEntry[];
  recommendation: string;
  confidenceLevel: number;
  keyConsiderations: string[];
  risksAndMitigations: string[];
}

export interface MultiCriteriaResult {
  optionId: string;
  criterionScores: Record<string, number>;
  weightedScore: number;
  normalizedScore: number;
}

export interface SensitivityResult {
  criterionId: string;
  weightRange: [number, number];
  impactOnRanking: string;
  breakEvenPoint?: number;
  robustness: number;
}

export interface ScenarioImpact {
  scenarioId: string;
  scenarioName: string;
  optionImpacts: Record<string, OptionScenarioImpact>;
}

export interface OptionScenarioImpact {
  viability: number;
  adjustedScore: number;
  notes: string;
}

export interface TradeoffEntry {
  optionA: string;
  optionB: string;
  advantagesA: string[];
  advantagesB: string[];
  keyTradeoff: string;
}

export interface DecisionRisk {
  description: string;
  probability: number;
  impact: ImpactLevel;
  mitigationStrategy: string;
}

export interface ResourceRequirement {
  type: 'HUMAN' | 'FINANCIAL' | 'TECHNOLOGICAL' | 'TIME' | 'OTHER';
  description: string;
  quantity: number;
  unit: string;
  availability: 'AVAILABLE' | 'PARTIALLY_AVAILABLE' | 'NOT_AVAILABLE';
  acquisitionPlan?: string;
}

export interface CostEstimate {
  initialInvestment: number;
  ongoingCosts: number;
  totalCostOfOwnership: number;
  currency: string;
  confidenceLevel: number;
  assumptions: string[];
  breakdown: CostBreakdown[];
}

export interface CostBreakdown {
  category: string;
  amount: number;
  timing: string;
  notes: string;
}

export interface ExpectedOutcome {
  description: string;
  probability: number;
  value: number;
  timeframe: TimeHorizon;
  measurementMethod: string;
}

export interface DecisionImplementation {
  plan: ImplementationStep[];
  owner: string;
  startDate: Date;
  targetDate: Date;
  actualEndDate?: Date;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'BLOCKED';
  progress: number;
  issues: ImplementationIssue[];
  lessons: string[];
}

export interface ImplementationStep {
  sequence: number;
  action: string;
  owner: string;
  targetDate: Date;
  actualDate?: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  dependencies: string[];
  notes: string;
}

export interface ImplementationIssue {
  id: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  resolution?: string;
  owner: string;
  createdDate: Date;
  resolvedDate?: Date;
}

export interface DecisionOutcome {
  assessmentDate: Date;
  expectedVsActual: Record<string, OutcomeComparison>;
  overallSuccess: number;
  lessonsLearned: string[];
  recommendations: string[];
  followUpActions: string[];
}

export interface OutcomeComparison {
  expected: number;
  actual: number;
  variance: number;
  explanation: string;
}

// ============================================================================
// STRATEGIC MONITORING TYPES
// ============================================================================

export interface StrategicDashboard extends Identifiable, Auditable {
  name: string;
  description: string;
  owner: string;
  viewers: string[];
  sections: DashboardSection[];
  refreshFrequency: 'REAL_TIME' | 'HOURLY' | 'DAILY' | 'WEEKLY';
  lastRefresh: Date;
  alerts: DashboardAlert[];
}

export interface DashboardSection {
  id: string;
  title: string;
  type: 'KPI_GRID' | 'CHART' | 'TABLE' | 'STATUS_BOARD' | 'TIMELINE' | 'HEATMAP';
  config: Record<string, unknown>;
  metrics: string[];
  position: { row: number; col: number; width: number; height: number };
}

export interface StrategicMetric extends Identifiable, Auditable {
  name: string;
  description: string;
  type: MetricType;
  category: string;
  owner: string;
  formula?: string;
  dataSource: string;
  unit: string;
  direction: 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER' | 'TARGET_IS_BEST';
  baseline: number;
  target: number;
  stretch: number;
  current: number;
  previousPeriod: number;
  trend: TrendAnalysis;
  thresholds: MetricThreshold[];
  linkedGoals: string[];
  linkedObjectives: string[];
  history: MetricDataPoint[];
  forecast: MetricForecast;
  annotations: MetricAnnotation[];
}

export interface TrendAnalysis {
  direction: 'IMPROVING' | 'STABLE' | 'DECLINING';
  rate: number;
  volatility: number;
  seasonality: boolean;
  projectedValue: number;
  confidenceInterval: [number, number];
}

export interface MetricThreshold {
  level: 'CRITICAL' | 'WARNING' | 'CAUTION' | 'ON_TRACK' | 'EXCEEDING';
  operator: 'LESS_THAN' | 'LESS_THAN_OR_EQUAL' | 'EQUAL' | 'GREATER_THAN_OR_EQUAL' | 'GREATER_THAN';
  value: number;
  color: string;
  notification: boolean;
}

export interface MetricForecast {
  method: string;
  periods: ForecastPeriod[];
  accuracy: number;
  lastUpdated: Date;
}

export interface ForecastPeriod {
  period: string;
  predictedValue: number;
  confidenceLow: number;
  confidenceHigh: number;
}

export interface MetricAnnotation {
  id: string;
  timestamp: Date;
  note: string;
  author: string;
  type: 'EVENT' | 'ANOMALY' | 'COMMENT' | 'ACTION';
}

export interface DashboardAlert {
  id: string;
  metricId: string;
  type: 'THRESHOLD_BREACH' | 'TREND_CHANGE' | 'ANOMALY' | 'TARGET_RISK';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  triggered: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolution?: string;
}

export interface ProgressReport extends Identifiable, Auditable {
  reportType: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'AD_HOC';
  periodStart: Date;
  periodEnd: Date;
  goals: GoalProgress[];
  initiatives: InitiativeProgress[];
  metrics: MetricSummary[];
  highlights: string[];
  challenges: string[];
  risks: RiskSummary[];
  decisions: DecisionSummary[];
  nextPeriodFocus: string[];
  executiveSummary: string;
  detailedNarrative: string;
}

export interface GoalProgress {
  goalId: string;
  goalTitle: string;
  previousProgress: number;
  currentProgress: number;
  change: number;
  status: StrategicStatus;
  healthScore: number;
  onTrack: boolean;
  blockers: string[];
  achievements: string[];
}

export interface InitiativeProgress {
  initiativeId: string;
  initiativeTitle: string;
  previousProgress: number;
  currentProgress: number;
  change: number;
  status: StrategicStatus;
  milestonesCompleted: number;
  milestonesTotal: number;
  budgetStatus: 'UNDER' | 'ON_TRACK' | 'OVER';
  timelineStatus: 'AHEAD' | 'ON_TRACK' | 'BEHIND';
  keyUpdates: string[];
}

export interface MetricSummary {
  metricId: string;
  metricName: string;
  previousValue: number;
  currentValue: number;
  change: number;
  changePercent: number;
  target: number;
  attainment: number;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
}

export interface RiskSummary {
  riskId: string;
  riskTitle: string;
  category: RiskCategory;
  previousScore: number;
  currentScore: number;
  status: string;
  changes: string;
}

export interface DecisionSummary {
  decisionId: string;
  decisionTitle: string;
  status: string;
  outcomePreview?: string;
}

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

export const CreateGoalInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  vision: z.string().max(1000).optional(),
  missionAlignment: z.string().max(1000).optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  timeHorizon: z.enum(['IMMEDIATE', 'SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM', 'STRATEGIC']),
  startDate: z.coerce.date(),
  targetDate: z.coerce.date(),
  owner: z.string().min(1),
  stakeholders: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  labels: z.record(z.string()).optional().default({}),
  notes: z.string().max(5000).optional().default(''),
});
export type CreateGoalInput = z.infer<typeof CreateGoalInputSchema>;

export const UpdateGoalInputSchema = CreateGoalInputSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'AT_RISK']).optional(),
});
export type UpdateGoalInput = z.infer<typeof UpdateGoalInputSchema>;

export const CreateObjectiveInputSchema = z.object({
  goalId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  owner: z.string().min(1),
  contributors: z.array(z.string()).optional().default([]),
  startDate: z.coerce.date(),
  targetDate: z.coerce.date(),
  alignedCapabilities: z.array(z.string()).optional().default([]),
  measurementCriteria: z.string().max(1000).optional().default(''),
});
export type CreateObjectiveInput = z.infer<typeof CreateObjectiveInputSchema>;

export const CreateInitiativeInputSchema = z.object({
  objectiveId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  rationale: z.string().max(2000).optional().default(''),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  owner: z.string().min(1),
  team: z.array(z.string()).optional().default([]),
  startDate: z.coerce.date(),
  targetDate: z.coerce.date(),
  budget: z.object({
    total: z.number().min(0),
    currency: z.string().default('USD'),
  }).optional(),
  effortEstimate: z.number().min(0).optional(),
  tags: z.array(z.string()).optional().default([]),
  labels: z.record(z.string()).optional().default({}),
});
export type CreateInitiativeInput = z.infer<typeof CreateInitiativeInputSchema>;

export const CreateDecisionInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  type: z.enum(['STRATEGIC', 'TACTICAL', 'OPERATIONAL', 'RESOURCE_ALLOCATION', 'RISK_MITIGATION', 'INVESTMENT', 'PARTNERSHIP', 'MARKET_ENTRY']),
  context: z.string().max(5000).optional().default(''),
  urgency: z.enum(['IMMEDIATE', 'URGENT', 'NORMAL', 'LOW']),
  importance: z.enum(['TRANSFORMATIONAL', 'SIGNIFICANT', 'MODERATE', 'MINOR', 'NEGLIGIBLE']),
  decisionMaker: z.string().min(1),
  stakeholders: z.array(z.string()).optional().default([]),
  deadline: z.coerce.date(),
  linkedGoals: z.array(z.string()).optional().default([]),
  linkedAnalyses: z.array(z.string()).optional().default([]),
});
export type CreateDecisionInput = z.infer<typeof CreateDecisionInputSchema>;

export const CreateAnalysisInputSchema = z.object({
  type: z.enum(['SWOT', 'PESTLE', 'PORTER_FIVE_FORCES', 'GAP_ANALYSIS', 'SCENARIO_PLANNING', 'RISK_ASSESSMENT', 'CAPABILITY_ASSESSMENT', 'COMPETITIVE_ANALYSIS']),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  scope: z.string().max(2000).optional().default(''),
  context: z.string().max(5000).optional().default(''),
  timeHorizon: z.enum(['IMMEDIATE', 'SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM', 'STRATEGIC']),
  analyst: z.string().min(1),
  reviewers: z.array(z.string()).optional().default([]),
  linkedGoals: z.array(z.string()).optional().default([]),
});
export type CreateAnalysisInput = z.infer<typeof CreateAnalysisInputSchema>;
