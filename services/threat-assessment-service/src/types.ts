/**
 * Threat Assessment Service Types
 */

export interface ThreatAssessment {
  id: string;
  targetId: string;
  targetType: TargetType;
  assessmentDate: Date;
  nextReview?: Date;
  overallThreat: number;
  components: ThreatComponent[];
  mitigations: Mitigation[];
  recommendations: string[];
  confidence: number;
}

export enum TargetType {
  INDIVIDUAL = 'INDIVIDUAL',
  ORGANIZATION = 'ORGANIZATION',
  ATTACK_PLAN = 'ATTACK_PLAN',
  NETWORK = 'NETWORK',
  LOCATION = 'LOCATION',
  INFRASTRUCTURE = 'INFRASTRUCTURE'
}

export interface ThreatComponent {
  category: string;
  score: number;
  weight: number;
  factors: Factor[];
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
}

export interface Factor {
  name: string;
  value: number;
  description: string;
  evidence: string[];
}

export interface Mitigation {
  type: string;
  description: string;
  effectiveness: number;
  implemented: boolean;
  cost?: string;
}

export interface AttackProbability {
  targetId: string;
  probability: number;
  timeframe: string;
  attackTypes: AttackTypeProbability[];
  factors: ProbabilityFactor[];
  confidence: number;
}

export interface AttackTypeProbability {
  type: string;
  probability: number;
  lethality: number;
}

export interface ProbabilityFactor {
  factor: string;
  weight: number;
  present: boolean;
  description: string;
}

export interface TargetVulnerability {
  targetId: string;
  targetType: string;
  location?: string;
  vulnerabilities: VulnerabilityItem[];
  securityMeasures: SecurityMeasure[];
  overallVulnerability: number;
  assessmentDate: Date;
}

export interface VulnerabilityItem {
  type: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  likelihood: number;
  impact: number;
  score: number;
}

export interface SecurityMeasure {
  type: string;
  description: string;
  effectiveness: number;
  coverage: number;
}

export interface CapabilityAssessment {
  entityId: string;
  capabilities: Capability[];
  overallCapability: number;
  limitations: string[];
  trends: string[];
  assessmentDate: Date;
}

export interface Capability {
  type: string;
  level: 'ADVANCED' | 'INTERMEDIATE' | 'BASIC' | 'MINIMAL';
  description: string;
  evidence: string[];
  score: number;
}

export interface IntentAssessment {
  entityId: string;
  intents: Intent[];
  overallIntent: number;
  motivations: string[];
  constraints: string[];
  assessmentDate: Date;
}

export interface Intent {
  type: string;
  strength: number;
  evidence: string[];
  indicators: string[];
}

export interface GeographicThreatMap {
  regions: RegionThreat[];
  hotspots: Hotspot[];
  trends: GeographicTrend[];
  generated: Date;
}

export interface RegionThreat {
  region: string;
  threatLevel: number;
  organizations: number;
  attacks: number;
  trends: string[];
}

export interface Hotspot {
  location: string;
  coordinates?: [number, number];
  threatLevel: number;
  activities: string[];
  radius: number; // km
}

export interface GeographicTrend {
  type: string;
  direction: 'EXPANDING' | 'CONTRACTING' | 'SHIFTING' | 'STABLE';
  regions: string[];
  description: string;
}

export interface SectorThreat {
  sector: string;
  threatLevel: number;
  vulnerabilities: string[];
  attackTypes: string[];
  incidents: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
}

export interface CriticalInfrastructure {
  id: string;
  type: string;
  name: string;
  location: string;
  importance: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  vulnerabilities: VulnerabilityItem[];
  threats: ThreatIndicator[];
  securityLevel: number;
}

export interface ThreatIndicator {
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  detected: Date;
  confidence: number;
}

export interface MassCasualtyPotential {
  scenarioId: string;
  attackType: string;
  target: string;
  estimatedCasualties: CasualtyEstimate;
  probability: number;
  factors: string[];
}

export interface CasualtyEstimate {
  minimum: number;
  likely: number;
  maximum: number;
}

export interface SymbolicTarget {
  id: string;
  name: string;
  type: string;
  location: string;
  significance: number;
  vulnerabilities: VulnerabilityItem[];
  threatLevel: number;
  previousTargeting: boolean;
}

export interface ThreatTimeline {
  period: string;
  threats: TimelineThreat[];
  trends: TrendAnalysis[];
}

export interface TimelineThreat {
  date: Date;
  type: string;
  severity: number;
  description: string;
  materialized: boolean;
}

export interface TrendAnalysis {
  metric: string;
  direction: 'UP' | 'DOWN' | 'STABLE';
  magnitude: number;
  significance: string;
}

export interface RiskMatrix {
  scenarios: RiskScenario[];
  generated: Date;
}

export interface RiskScenario {
  id: string;
  description: string;
  likelihood: number;
  impact: number;
  riskScore: number;
  mitigations: string[];
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}
