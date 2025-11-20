/**
 * Risk Forecasting Platform
 * Global risk assessment and forecasting
 */

export type RiskCategory =
  | 'systemic'
  | 'geopolitical'
  | 'economic'
  | 'technological'
  | 'environmental'
  | 'societal'
  | 'security';

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical' | 'catastrophic';

export interface GlobalRisk {
  id: string;
  name: string;
  category: RiskCategory;
  severity: RiskSeverity;
  probability: number; // 0-100
  impact: RiskImpact;
  timeframe: RiskTimeframe;
  interconnections: RiskInterconnection[];
  cascadingEffects: CascadingEffect[];
  earlyWarningIndicators: EarlyWarningIndicator[];
  mitigationStrategies: MitigationStrategy[];
  resilience: ResilienceAssessment;
  tippingPoints: TippingPoint[];
}

export interface RiskImpact {
  human: number; // scale 1-10
  economic: number;
  environmental: number;
  political: number;
  technological: number;
  description: string;
  affectedPopulation?: number;
  estimatedCost?: number;
}

export interface RiskTimeframe {
  emergenceTime: Date;
  peakRiskPeriod: [Date, Date];
  longTermHorizon: Date;
}

export interface RiskInterconnection {
  connectedRiskId: string;
  relationshipType: 'amplifies' | 'triggers' | 'mitigates' | 'correlates';
  strength: number; // 0-1
  bidirectional: boolean;
}

export interface CascadingEffect {
  id: string;
  trigger: string;
  sequence: EffectStage[];
  totalImpact: number;
  likelihood: number;
  preventable: boolean;
}

export interface EffectStage {
  stage: number;
  effect: string;
  domain: string;
  delay: number; // days
  magnitude: number;
}

export interface EarlyWarningIndicator {
  id: string;
  indicator: string;
  metric: string;
  threshold: number | string;
  currentValue: number | string;
  trend: 'improving' | 'stable' | 'deteriorating' | 'critical';
  leadTime: number; // days
  reliability: 'low' | 'medium' | 'high';
  dataSource: string;
}

export interface MitigationStrategy {
  id: string;
  strategy: string;
  effectiveness: number; // 0-100
  cost: 'low' | 'medium' | 'high' | 'very-high';
  timeToImplement: number; // days
  stakeholders: string[];
  dependencies: string[];
  sideEffects: string[];
}

export interface ResilienceAssessment {
  overallScore: number; // 0-100
  adaptiveCapacity: number;
  absorptiveCapacity: number;
  transformativeCapacity: number;
  vulnerabilities: Vulnerability[];
  strengths: string[];
}

export interface Vulnerability {
  id: string;
  vulnerability: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  exploitability: number; // 0-100
  affectedSystems: string[];
}

export interface TippingPoint {
  id: string;
  description: string;
  threshold: string;
  currentDistance: number; // proximity to threshold
  reversibility: 'reversible' | 'partially-reversible' | 'irreversible';
  consequences: string[];
  precursors: string[];
}

export interface BlackSwanEvent {
  id: string;
  event: string;
  description: string;
  probability: 'very-low' | 'extremely-low';
  impact: 'catastrophic' | 'existential';
  detectability: 'low' | 'very-low' | 'undetectable';
  potentialPrecursors: string[];
  scenarioAnalysis: string;
}

export interface SystemicRisk {
  id: string;
  system: string;
  vulnerabilities: SystemVulnerability[];
  feedbackLoops: FeedbackLoop[];
  emergentProperties: string[];
  breakingPoints: BreakingPoint[];
}

export interface SystemVulnerability {
  component: string;
  criticality: number; // 0-100
  redundancy: number; // 0-100
  dependencies: string[];
}

export interface FeedbackLoop {
  type: 'reinforcing' | 'balancing';
  components: string[];
  strength: number;
  delay: number;
}

export interface BreakingPoint {
  condition: string;
  threshold: string;
  failureMode: string;
  cascadeRisk: number;
}
