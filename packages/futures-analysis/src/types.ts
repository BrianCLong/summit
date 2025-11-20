/**
 * Futures Analysis and Strategic Foresight Platform
 * Types and interfaces for scenario planning and foresight analysis
 */

export type ScenarioType = 'baseline' | 'optimistic' | 'pessimistic' | 'transformative' | 'disruptive';

export type ForesightMethod =
  | 'scenario-planning'
  | 'delphi'
  | 'horizon-scanning'
  | 'trend-analysis'
  | 'cross-impact-analysis'
  | 'morphological-analysis'
  | 'backcasting'
  | 'futures-wheel'
  | 'causal-layered-analysis';

export type TimeHorizon = 'near-term' | 'mid-term' | 'long-term' | 'very-long-term';

export interface FutureScenario {
  id: string;
  title: string;
  type: ScenarioType;
  timeHorizon: TimeHorizon;
  targetYear: number;
  narrative: string;
  keyAssumptions: string[];
  drivingForces: DrivingForce[];
  criticalUncertainties: Uncertainty[];
  indicators: ScenarioIndicator[];
  implications: Implication[];
  signposts: Signpost[];
  probability: number; // 0-100
  desirability: number; // -100 to 100
  plausibility: number; // 0-100
  createdDate: Date;
  lastUpdated: Date;
}

export interface DrivingForce {
  id: string;
  name: string;
  category: 'political' | 'economic' | 'social' | 'technological' | 'environmental' | 'legal';
  description: string;
  trajectory: 'increasing' | 'decreasing' | 'stable' | 'volatile' | 'uncertain';
  impact: 'low' | 'medium' | 'high' | 'very-high';
  uncertainty: 'low' | 'medium' | 'high';
  interconnections: string[];
}

export interface Uncertainty {
  id: string;
  question: string;
  description: string;
  dimension: string;
  outcomes: UncertaintyOutcome[];
  currentIndicators: string[];
  criticalityLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface UncertaintyOutcome {
  name: string;
  description: string;
  probability: number;
  implications: string[];
}

export interface ScenarioIndicator {
  id: string;
  metric: string;
  currentValue?: number | string;
  scenarioValue: number | string;
  unit?: string;
  source?: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface Implication {
  domain: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  opportunities: string[];
  threats: string[];
  requiredActions: string[];
}

export interface Signpost {
  id: string;
  description: string;
  indicator: string;
  threshold?: string;
  observed: boolean;
  observedDate?: Date;
  significance: 'low' | 'medium' | 'high' | 'critical';
}

export interface AlternativeFuture {
  id: string;
  name: string;
  description: string;
  scenarios: string[]; // scenario IDs
  pathways: Pathway[];
  branchingPoints: BranchingPoint[];
  convergencePoints: string[];
  probability: number;
}

export interface Pathway {
  id: string;
  name: string;
  startState: string;
  endState: string;
  milestones: Milestone[];
  dependencies: string[];
  enablers: string[];
  blockers: string[];
}

export interface Milestone {
  name: string;
  description: string;
  targetDate: Date;
  completed: boolean;
  indicators: string[];
}

export interface BranchingPoint {
  id: string;
  description: string;
  decision: string;
  options: BranchOption[];
  criticality: 'low' | 'medium' | 'high' | 'critical';
  timeframe: string;
}

export interface BranchOption {
  name: string;
  description: string;
  leadsTo: string; // scenario or pathway ID
  probability: number;
  consequences: string[];
}

export interface TrendAnalysis {
  id: string;
  trend: string;
  description: string;
  category: string;
  strength: 'weak' | 'emerging' | 'strong' | 'dominant';
  direction: 'ascending' | 'descending' | 'stable' | 'cyclical';
  velocity: 'slow' | 'moderate' | 'fast' | 'accelerating';
  dataPoints: TrendDataPoint[];
  projection: TrendProjection;
  inflectionPoints: InflectionPoint[];
  relatedTrends: string[];
}

export interface TrendDataPoint {
  date: Date;
  value: number;
  source: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface TrendProjection {
  methodology: string;
  projectedValues: Array<{
    date: Date;
    value: number;
    confidenceInterval: [number, number];
  }>;
  assumptions: string[];
  limitingFactors: string[];
}

export interface InflectionPoint {
  date: Date;
  description: string;
  cause: string;
  impact: 'minor' | 'moderate' | 'major' | 'transformative';
}

export interface HorizonScan {
  id: string;
  scanDate: Date;
  timeHorizon: TimeHorizon;
  domains: string[];
  findings: ScanFinding[];
  emergingIssues: EmergingIssue[];
  weakSignals: string[];
  wildCards: string[];
}

export interface ScanFinding {
  id: string;
  title: string;
  description: string;
  source: string;
  category: string;
  novelty: 'incremental' | 'significant' | 'breakthrough' | 'paradigm-shift';
  relevance: 'low' | 'medium' | 'high' | 'critical';
  urgency: 'low' | 'medium' | 'high' | 'immediate';
}

export interface EmergingIssue {
  id: string;
  issue: string;
  description: string;
  firstIdentified: Date;
  momentum: 'stalling' | 'stable' | 'growing' | 'accelerating';
  stakeholders: string[];
  potentialImpact: string[];
  responseOptions: string[];
}

export interface DelphiStudy {
  id: string;
  topic: string;
  rounds: DelphiRound[];
  participants: DelphiParticipant[];
  consensus: ConsensusResult;
  startDate: Date;
  endDate?: Date;
  status: 'planning' | 'active' | 'completed' | 'archived';
}

export interface DelphiRound {
  roundNumber: number;
  questions: DelphiQuestion[];
  responses: DelphiResponse[];
  startDate: Date;
  endDate: Date;
}

export interface DelphiQuestion {
  id: string;
  question: string;
  type: 'forecast' | 'probability' | 'impact' | 'timeline' | 'ranking';
  context?: string;
}

export interface DelphiResponse {
  questionId: string;
  participantId: string;
  value: number | string;
  confidence: number;
  rationale?: string;
  timestamp: Date;
}

export interface DelphiParticipant {
  id: string;
  expertise: string[];
  affiliation?: string;
  anonymous: boolean;
}

export interface ConsensusResult {
  achieved: boolean;
  consensusLevel: number; // 0-100
  medianValue?: number;
  iqr?: [number, number];
  outliers: DelphiResponse[];
  convergence: 'diverging' | 'stable' | 'converging' | 'consensus';
}

export interface CrossImpactAnalysis {
  id: string;
  events: AnalysisEvent[];
  impactMatrix: ImpactMatrix;
  scenarios: string[];
  createdDate: Date;
}

export interface AnalysisEvent {
  id: string;
  name: string;
  description: string;
  probability: number;
  impact: number;
}

export interface ImpactMatrix {
  matrix: number[][]; // Cross-impact coefficients
  eventIds: string[];
  normalizedMatrix?: number[][];
}

export interface BackcastingAnalysis {
  id: string;
  desiredFuture: string;
  targetYear: number;
  currentState: string;
  futureState: string;
  pathways: BackcastingPathway[];
  milestones: BackcastingMilestone[];
  requiredChanges: RequiredChange[];
}

export interface BackcastingPathway {
  name: string;
  steps: BackcastingStep[];
  feasibility: 'low' | 'medium' | 'high';
  risks: string[];
  enablers: string[];
}

export interface BackcastingStep {
  year: number;
  action: string;
  actors: string[];
  resources: string[];
  dependencies: string[];
}

export interface BackcastingMilestone {
  year: number;
  description: string;
  indicators: string[];
  criticalSuccess: boolean;
}

export interface RequiredChange {
  type: 'policy' | 'technology' | 'behavior' | 'infrastructure' | 'institutional';
  description: string;
  magnitude: 'incremental' | 'substantial' | 'transformational';
  timeframe: string;
  stakeholders: string[];
}
