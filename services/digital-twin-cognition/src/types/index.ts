/**
 * Digital Twin Cognition Layer Types
 *
 * Comprehensive type definitions for the next-generation digital twin cognition system
 * that provides self-learning, multi-scale, multi-agent reasoning on top of digital twins.
 */

import { z } from 'zod';

// =============================================================================
// Core Cognition Types
// =============================================================================

export type CognitionState =
  | 'IDLE'
  | 'PERCEIVING'
  | 'REASONING'
  | 'DELIBERATING'
  | 'DECIDING'
  | 'EXECUTING'
  | 'LEARNING'
  | 'REFLECTING';

export type ReasoningParadigm =
  | 'DEDUCTIVE'      // From general to specific
  | 'INDUCTIVE'      // From specific to general
  | 'ABDUCTIVE'      // Best explanation inference
  | 'ANALOGICAL'     // Pattern matching from similar cases
  | 'CAUSAL'         // Cause-effect reasoning
  | 'COUNTERFACTUAL' // What-if analysis
  | 'PROBABILISTIC'  // Bayesian reasoning
  | 'TEMPORAL'       // Time-series reasoning
  | 'SPATIAL';       // Spatial relationship reasoning

export type ConfidenceLevel = 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export type RiskLevel = 'NEGLIGIBLE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AgentType =
  | 'DIAGNOSTICS'    // Explains anomalies, traces causal chains
  | 'OPTIMIZATION'   // Searches control settings for improved KPIs
  | 'OPERATIONS'     // Chat interface grounded in the twin
  | 'COMPLIANCE'     // Checks changes against safety and regulatory constraints
  | 'PREDICTION'     // Forecasts future states
  | 'ANOMALY'        // Detects unusual patterns
  | 'MAINTENANCE'    // Predicts and schedules maintenance
  | 'EFFICIENCY';    // Optimizes resource usage

// =============================================================================
// Cognition Session & Context
// =============================================================================

export interface CognitionSession {
  id: string;
  twinId: string;
  tenantId: string;
  agentId?: string;
  state: CognitionState;
  context: CognitionContext;
  reasoningTrace: ReasoningStep[];
  decisions: Decision[];
  outcomes: Outcome[];
  confidence: number;
  startedAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  metadata: Record<string, unknown>;
}

export interface CognitionContext {
  // Twin state
  twinState: TwinStateSnapshot;
  historicalStates: TwinStateSnapshot[];

  // Multi-modal inputs
  sensorData: SensorReading[];
  textInputs: TextInput[];
  imageInputs: ImageInput[];
  documentInputs: DocumentInput[];

  // External context
  marketContext?: MarketContext;
  economicContext?: EconomicContext;
  regulatoryContext?: RegulatoryContext;
  weatherContext?: WeatherContext;

  // Learned patterns
  recognizedPatterns: Pattern[];
  activeAlerts: Alert[];

  // Goals and constraints
  objectives: Objective[];
  constraints: Constraint[];
  preferences: Preference[];
}

export interface TwinStateSnapshot {
  timestamp: Date;
  properties: Record<string, unknown>;
  derived: Record<string, unknown>;
  confidence: number;
  source: string;
}

// =============================================================================
// Multi-Modal Perception Types
// =============================================================================

export interface SensorReading {
  id: string;
  sensorId: string;
  type: SensorType;
  value: number | number[] | Record<string, number>;
  unit: string;
  timestamp: Date;
  quality: number;
  metadata: Record<string, unknown>;
}

export type SensorType =
  | 'TEMPERATURE'
  | 'PRESSURE'
  | 'FLOW'
  | 'VIBRATION'
  | 'POWER'
  | 'VOLTAGE'
  | 'CURRENT'
  | 'HUMIDITY'
  | 'LEVEL'
  | 'SPEED'
  | 'POSITION'
  | 'ACOUSTIC'
  | 'CHEMICAL'
  | 'CUSTOM';

export interface TextInput {
  id: string;
  type: 'WORK_ORDER' | 'LOG' | 'REPORT' | 'ALERT' | 'COMMENT' | 'MANUAL' | 'PROCEDURE';
  content: string;
  timestamp: Date;
  source: string;
  entities: ExtractedEntity[];
  sentiment?: number;
  urgency?: number;
}

export interface ImageInput {
  id: string;
  type: 'INSPECTION' | 'DRONE' | 'THERMAL' | 'CAMERA' | 'DIAGRAM';
  url: string;
  analysis?: ImageAnalysis;
  timestamp: Date;
  location?: { lat: number; lng: number; alt?: number };
}

export interface ImageAnalysis {
  detectedObjects: DetectedObject[];
  anomalies: VisualAnomaly[];
  measurements?: Record<string, number>;
  confidence: number;
}

export interface DetectedObject {
  label: string;
  confidence: number;
  boundingBox: { x: number; y: number; width: number; height: number };
  attributes: Record<string, unknown>;
}

export interface VisualAnomaly {
  type: 'CORROSION' | 'CRACK' | 'LEAK' | 'WEAR' | 'DISPLACEMENT' | 'THERMAL_ANOMALY' | 'OTHER';
  severity: RiskLevel;
  location: { x: number; y: number };
  confidence: number;
  description: string;
}

export interface DocumentInput {
  id: string;
  type: 'MANUAL' | 'SPECIFICATION' | 'REGULATION' | 'CONTRACT' | 'PROCEDURE' | 'REPORT';
  content: string;
  extractedKnowledge: ExtractedKnowledge[];
  timestamp: Date;
}

export interface ExtractedEntity {
  text: string;
  type: string;
  startOffset: number;
  endOffset: number;
  confidence: number;
  linkedId?: string;
}

export interface ExtractedKnowledge {
  type: 'FACT' | 'RULE' | 'CONSTRAINT' | 'PROCEDURE' | 'SPECIFICATION';
  content: string;
  confidence: number;
  source: string;
}

// =============================================================================
// Reasoning & Decision Types
// =============================================================================

export interface ReasoningStep {
  id: string;
  stepNumber: number;
  paradigm: ReasoningParadigm;
  inputState: Record<string, unknown>;
  reasoning: string;
  result: Record<string, unknown>;
  confidence: number;
  evidenceChain: Evidence[];
  timestamp: Date;
  durationMs: number;
}

export interface Evidence {
  id: string;
  type: 'SENSOR' | 'MODEL' | 'RULE' | 'HISTORICAL' | 'EXTERNAL' | 'EXPERT';
  source: string;
  content: unknown;
  weight: number;
  timestamp: Date;
}

export interface Decision {
  id: string;
  sessionId: string;
  type: DecisionType;
  description: string;
  action: ProposedAction;
  alternatives: ProposedAction[];
  rationale: string;
  causalChain: CausalLink[];
  riskAssessment: RiskAssessment;
  expectedOutcome: ExpectedOutcome;
  confidence: number;
  requiresApproval: boolean;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  createdAt: Date;
  executedAt?: Date;
}

export type DecisionType =
  | 'CONTROL_ADJUSTMENT'
  | 'MAINTENANCE_SCHEDULE'
  | 'ALERT_ESCALATION'
  | 'CONFIGURATION_CHANGE'
  | 'RESOURCE_ALLOCATION'
  | 'PROCESS_OPTIMIZATION'
  | 'SAFETY_INTERVENTION';

export interface ProposedAction {
  id: string;
  type: ActionType;
  target: string;
  parameters: Record<string, unknown>;
  priority: number;
  estimatedImpact: Impact[];
  constraints: ActionConstraint[];
  rollbackPlan?: RollbackPlan;
}

export type ActionType =
  | 'SET_PARAMETER'
  | 'TRIGGER_WORKFLOW'
  | 'SEND_ALERT'
  | 'SCHEDULE_MAINTENANCE'
  | 'ADJUST_SETPOINT'
  | 'MODIFY_SCHEDULE'
  | 'ALLOCATE_RESOURCE'
  | 'EXECUTE_PROCEDURE';

export interface CausalLink {
  cause: string;
  effect: string;
  mechanism: string;
  strength: number;
  delay?: number;
  confidence: number;
}

export interface RiskAssessment {
  overallRisk: RiskLevel;
  factors: RiskFactor[];
  mitigations: Mitigation[];
  unmitigatedRisk: RiskLevel;
}

export interface RiskFactor {
  id: string;
  category: string;
  description: string;
  likelihood: number;
  impact: number;
  riskScore: number;
}

export interface Mitigation {
  id: string;
  riskFactorId: string;
  description: string;
  effectiveness: number;
  cost: number;
}

export interface ExpectedOutcome {
  metrics: MetricPrediction[];
  sideEffects: SideEffect[];
  confidence: number;
  timeHorizon: number;
}

export interface MetricPrediction {
  metric: string;
  currentValue: number;
  predictedValue: number;
  improvement: number;
  confidence: number;
}

export interface SideEffect {
  description: string;
  likelihood: number;
  impact: RiskLevel;
  acceptable: boolean;
}

export interface Impact {
  metric: string;
  direction: 'INCREASE' | 'DECREASE' | 'STABILIZE';
  magnitude: number;
  confidence: number;
}

export interface ActionConstraint {
  type: 'SAFETY' | 'REGULATORY' | 'OPERATIONAL' | 'BUSINESS' | 'PHYSICAL';
  description: string;
  satisfied: boolean;
  margin?: number;
}

export interface RollbackPlan {
  steps: RollbackStep[];
  estimatedDuration: number;
  automaticTriggers: string[];
}

export interface RollbackStep {
  order: number;
  action: string;
  target: string;
  parameters: Record<string, unknown>;
}

// =============================================================================
// Learning & Adaptation Types
// =============================================================================

export interface Outcome {
  id: string;
  decisionId: string;
  observedAt: Date;
  metrics: ObservedMetric[];
  success: boolean;
  feedback: OutcomeFeedback;
  learnings: Learning[];
}

export interface ObservedMetric {
  metric: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  withinTolerance: boolean;
}

export interface OutcomeFeedback {
  type: 'AUTOMATED' | 'OPERATOR' | 'SYSTEM';
  rating?: number;
  comments?: string;
  corrections?: Record<string, unknown>;
}

export interface Learning {
  id: string;
  type: 'PATTERN' | 'RULE' | 'PARAMETER' | 'MODEL_UPDATE';
  description: string;
  confidence: number;
  applicability: string[];
  createdAt: Date;
}

export interface Pattern {
  id: string;
  type: PatternType;
  description: string;
  signature: PatternSignature;
  occurrences: number;
  lastSeen: Date;
  confidence: number;
  actions?: PatternAction[];
}

export type PatternType =
  | 'ANOMALY'
  | 'DEGRADATION'
  | 'SEASONAL'
  | 'OPERATIONAL'
  | 'FAULT'
  | 'EFFICIENCY'
  | 'REGIME_CHANGE';

export interface PatternSignature {
  features: Record<string, unknown>;
  timescale: number;
  threshold: number;
}

export interface PatternAction {
  condition: string;
  action: ProposedAction;
  successRate: number;
}

// =============================================================================
// Governance & Compliance Types
// =============================================================================

export interface GovernancePolicy {
  id: string;
  name: string;
  type: PolicyType;
  rules: PolicyRule[];
  priority: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type PolicyType =
  | 'SAFETY'
  | 'REGULATORY'
  | 'OPERATIONAL'
  | 'ENVIRONMENTAL'
  | 'FINANCIAL'
  | 'SECURITY';

export interface PolicyRule {
  id: string;
  condition: string;
  action: 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL' | 'LOG' | 'ALERT';
  severity: RiskLevel;
  message: string;
}

export interface ComplianceCheck {
  policyId: string;
  ruleId: string;
  decision: Decision;
  result: 'PASS' | 'FAIL' | 'CONDITIONAL';
  violations: Violation[];
  timestamp: Date;
}

export interface Violation {
  id: string;
  ruleId: string;
  description: string;
  severity: RiskLevel;
  remediation?: string;
}

export interface AuditEntry {
  id: string;
  sessionId: string;
  action: string;
  actor: string;
  target: string;
  details: Record<string, unknown>;
  timestamp: Date;
  outcome: string;
  policyChecks: ComplianceCheck[];
}

// =============================================================================
// Economic & Market Types
// =============================================================================

export interface MarketContext {
  timestamp: Date;
  energyPrices: PricePoint[];
  carbonPrice?: number;
  demandForecast: ForecastPoint[];
  gridConditions: GridCondition;
}

export interface PricePoint {
  timestamp: Date;
  price: number;
  currency: string;
  market: string;
}

export interface ForecastPoint {
  timestamp: Date;
  value: number;
  confidence: number;
}

export interface GridCondition {
  frequency: number;
  voltageQuality: number;
  demandResponseActive: boolean;
  emergencyLevel: number;
}

export interface EconomicContext {
  contracts: Contract[];
  budgets: Budget[];
  costAllocations: CostAllocation[];
}

export interface Contract {
  id: string;
  type: 'SLA' | 'SUPPLY' | 'DEMAND_RESPONSE' | 'MAINTENANCE';
  terms: ContractTerm[];
  penalties: Penalty[];
  validUntil: Date;
}

export interface ContractTerm {
  metric: string;
  operator: 'GT' | 'LT' | 'EQ' | 'GTE' | 'LTE' | 'BETWEEN';
  value: number | number[];
  unit: string;
}

export interface Penalty {
  condition: string;
  amount: number;
  currency: string;
  frequency: 'PER_OCCURRENCE' | 'DAILY' | 'MONTHLY';
}

export interface Budget {
  id: string;
  category: string;
  allocated: number;
  spent: number;
  remaining: number;
  currency: string;
  period: { start: Date; end: Date };
}

export interface CostAllocation {
  category: string;
  amount: number;
  source: string;
  timestamp: Date;
}

export interface RegulatoryContext {
  regulations: Regulation[];
  certifications: Certification[];
  upcomingChanges: RegulatoryChange[];
}

export interface Regulation {
  id: string;
  name: string;
  jurisdiction: string;
  requirements: Requirement[];
  effectiveDate: Date;
  status: 'ACTIVE' | 'PENDING' | 'SUNSET';
}

export interface Requirement {
  id: string;
  description: string;
  metric?: string;
  threshold?: number;
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'UNKNOWN';
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  validUntil: Date;
  requirements: string[];
}

export interface RegulatoryChange {
  id: string;
  regulation: string;
  description: string;
  effectiveDate: Date;
  impactAssessment: string;
}

export interface WeatherContext {
  current: WeatherCondition;
  forecast: WeatherForecast[];
  alerts: WeatherAlert[];
}

export interface WeatherCondition {
  timestamp: Date;
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  solarRadiation?: number;
}

export interface WeatherForecast {
  timestamp: Date;
  condition: WeatherCondition;
  confidence: number;
}

export interface WeatherAlert {
  id: string;
  type: string;
  severity: RiskLevel;
  message: string;
  validFrom: Date;
  validTo: Date;
}

// =============================================================================
// Alert & Notification Types
// =============================================================================

export interface Alert {
  id: string;
  twinId: string;
  type: AlertType;
  severity: RiskLevel;
  title: string;
  description: string;
  source: string;
  context: Record<string, unknown>;
  recommendedActions: ProposedAction[];
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'SUPPRESSED';
}

export type AlertType =
  | 'ANOMALY_DETECTED'
  | 'THRESHOLD_BREACH'
  | 'PREDICTION_ALERT'
  | 'COMPLIANCE_VIOLATION'
  | 'MAINTENANCE_DUE'
  | 'OPTIMIZATION_OPPORTUNITY'
  | 'SYSTEM_HEALTH';

// =============================================================================
// Objective & Constraint Types
// =============================================================================

export interface Objective {
  id: string;
  name: string;
  type: ObjectiveType;
  metric: string;
  direction: 'MINIMIZE' | 'MAXIMIZE' | 'TARGET';
  targetValue?: number;
  weight: number;
  timeHorizon: number;
}

export type ObjectiveType =
  | 'EFFICIENCY'
  | 'COST'
  | 'EMISSIONS'
  | 'RELIABILITY'
  | 'QUALITY'
  | 'THROUGHPUT'
  | 'SAFETY';

export interface Constraint {
  id: string;
  name: string;
  type: ConstraintType;
  expression: string;
  hardLimit: boolean;
  margin?: number;
  source: string;
}

export type ConstraintType =
  | 'PHYSICAL'
  | 'SAFETY'
  | 'REGULATORY'
  | 'CONTRACTUAL'
  | 'OPERATIONAL'
  | 'ENVIRONMENTAL';

export interface Preference {
  id: string;
  name: string;
  description: string;
  weight: number;
  source: 'OPERATOR' | 'POLICY' | 'LEARNED';
}

// =============================================================================
// Physics & Model Types
// =============================================================================

export interface PhysicsModel {
  id: string;
  name: string;
  type: PhysicsModelType;
  equations: Equation[];
  parameters: ModelParameter[];
  calibrationState: CalibrationState;
  validityRange: ValidityRange;
}

export type PhysicsModelType =
  | 'THERMODYNAMIC'
  | 'MECHANICAL'
  | 'ELECTRICAL'
  | 'CHEMICAL'
  | 'HYDRAULIC'
  | 'HEAT_TRANSFER'
  | 'FLUID_DYNAMICS';

export interface Equation {
  id: string;
  name: string;
  expression: string;
  inputs: string[];
  outputs: string[];
}

export interface ModelParameter {
  id: string;
  name: string;
  value: number;
  unit: string;
  uncertainty: number;
  source: 'SPECIFICATION' | 'CALIBRATED' | 'ESTIMATED' | 'DEFAULT';
  lastCalibrated?: Date;
}

export interface CalibrationState {
  lastCalibration: Date;
  calibrationQuality: number;
  driftDetected: boolean;
  driftMagnitude?: number;
  nextCalibrationDue: Date;
}

export interface ValidityRange {
  inputs: Record<string, { min: number; max: number }>;
  operatingConditions: string[];
}

export interface UncertaintyQuantification {
  source: string;
  type: 'ALEATORY' | 'EPISTEMIC';
  distribution: string;
  parameters: Record<string, number>;
  samples?: number[];
}

// =============================================================================
// Zod Schemas for Validation
// =============================================================================

export const CognitionSessionSchema = z.object({
  id: z.string().uuid(),
  twinId: z.string().uuid(),
  tenantId: z.string(),
  agentId: z.string().uuid().optional(),
  state: z.enum([
    'IDLE', 'PERCEIVING', 'REASONING', 'DELIBERATING',
    'DECIDING', 'EXECUTING', 'LEARNING', 'REFLECTING'
  ]),
  confidence: z.number().min(0).max(1),
  startedAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().optional(),
  metadata: z.record(z.unknown()),
});

export const DecisionSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  type: z.enum([
    'CONTROL_ADJUSTMENT', 'MAINTENANCE_SCHEDULE', 'ALERT_ESCALATION',
    'CONFIGURATION_CHANGE', 'RESOURCE_ALLOCATION', 'PROCESS_OPTIMIZATION',
    'SAFETY_INTERVENTION'
  ]),
  description: z.string(),
  rationale: z.string(),
  confidence: z.number().min(0).max(1),
  requiresApproval: z.boolean(),
  approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  createdAt: z.date(),
  executedAt: z.date().optional(),
});

export const AlertSchema = z.object({
  id: z.string().uuid(),
  twinId: z.string().uuid(),
  type: z.enum([
    'ANOMALY_DETECTED', 'THRESHOLD_BREACH', 'PREDICTION_ALERT',
    'COMPLIANCE_VIOLATION', 'MAINTENANCE_DUE', 'OPTIMIZATION_OPPORTUNITY',
    'SYSTEM_HEALTH'
  ]),
  severity: z.enum(['NEGLIGIBLE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  title: z.string(),
  description: z.string(),
  source: z.string(),
  status: z.enum(['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'SUPPRESSED']),
  createdAt: z.date(),
});

// Type exports
export type CognitionSessionInput = z.infer<typeof CognitionSessionSchema>;
export type DecisionInput = z.infer<typeof DecisionSchema>;
export type AlertInput = z.infer<typeof AlertSchema>;
