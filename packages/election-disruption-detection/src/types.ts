/**
 * Core type definitions for election disruption detection
 */

export interface ElectionThreatSignal {
  id: string;
  type: ThreatType;
  confidence: number;
  severity: SeverityLevel;
  vectors: ThreatVector[];
  temporalContext: TemporalContext;
  geospatialContext: GeospatialContext;
  attribution: AttributionAssessment;
  evidence: Evidence[];
  mitigationRecommendations: Mitigation[];
}

export type ThreatType =
  | 'VOTER_SUPPRESSION'
  | 'INFRASTRUCTURE_ATTACK'
  | 'DISINFORMATION_CAMPAIGN'
  | 'FOREIGN_INTERFERENCE'
  | 'COORDINATED_HARASSMENT'
  | 'DEEPFAKE_INJECTION'
  | 'POLL_WORKER_INTIMIDATION'
  | 'BALLOT_MANIPULATION'
  | 'REGISTRATION_ATTACK'
  | 'RESULTS_MANIPULATION'
  | 'PERCEPTION_HACK'
  | 'LEGITIMACY_ATTACK';

export type ThreatVector =
  | 'SOCIAL_MEDIA'
  | 'CYBER_INFRASTRUCTURE'
  | 'PHYSICAL'
  | 'LEGAL_PROCEDURAL'
  | 'MEDIA_NARRATIVE'
  | 'GRASSROOTS_ASTROTURF';

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';

export interface TemporalContext {
  phase: ElectionPhase;
  daysToElection: number;
  timeWindow: TimeWindow;
  trendDirection: 'ESCALATING' | 'STABLE' | 'DECLINING';
  velocity: number;
}

export type ElectionPhase =
  | 'PRE_REGISTRATION'
  | 'REGISTRATION'
  | 'EARLY_VOTING'
  | 'CAMPAIGN'
  | 'ELECTION_DAY'
  | 'COUNTING'
  | 'CERTIFICATION'
  | 'POST_CERTIFICATION';

export interface GeospatialContext {
  jurisdictions: string[];
  precincts: string[];
  swingIndicator: number;
  demographicOverlays: DemographicOverlay[];
  infrastructureDependencies: string[];
}

export interface DemographicOverlay {
  group: string;
  vulnerabilityScore: number;
  historicalTargeting: boolean;
}

export interface AttributionAssessment {
  primaryActor: ActorProfile | null;
  confidence: number;
  methodology: AttributionMethod;
  indicators: AttributionIndicator[];
  alternativeHypotheses: AlternativeHypothesis[];
}

export interface ActorProfile {
  id: string;
  type: 'STATE' | 'NON_STATE' | 'DOMESTIC' | 'HYBRID' | 'UNKNOWN';
  name?: string;
  capabilities: string[];
  historicalTTPs: string[];
  motivation: string[];
}

export type AttributionMethod =
  | 'TECHNICAL_FORENSICS'
  | 'BEHAVIORAL_ANALYSIS'
  | 'LINGUISTIC_FINGERPRINT'
  | 'INFRASTRUCTURE_CORRELATION'
  | 'OPERATIONAL_PATTERN'
  | 'MULTI_INT_FUSION';

export interface AttributionIndicator {
  type: string;
  value: string;
  confidence: number;
  source: string;
}

export interface AlternativeHypothesis {
  actor: ActorProfile;
  probability: number;
  supportingEvidence: string[];
  contradictingEvidence: string[];
}

export interface Evidence {
  id: string;
  type: EvidenceType;
  source: string;
  content: unknown;
  timestamp: Date;
  reliability: number;
  chainOfCustody: string[];
}

export type EvidenceType =
  | 'SOCIAL_POST'
  | 'NETWORK_TRAFFIC'
  | 'INFRASTRUCTURE_LOG'
  | 'WITNESS_REPORT'
  | 'DOCUMENT'
  | 'MEDIA_ARTIFACT'
  | 'TECHNICAL_INDICATOR';

export interface Mitigation {
  action: string;
  priority: number;
  timeframe: string;
  stakeholders: string[];
  effectivenessEstimate: number;
  riskOfEscalation: number;
}

export interface TimeWindow {
  start: Date;
  end: Date;
}

export interface RawSignal {
  id: string;
  source: string;
  type: string;
  data: unknown;
  timestamp: Date;
}

export interface ElectionContext {
  electionId: string;
  jurisdiction: string;
  currentPhase: ElectionPhase;
  daysToElection: number;
  historicalBaseline: unknown;
}

export interface ElectionThreatAssessment {
  timestamp: Date;
  context: ElectionContext;
  threats: ElectionThreatSignal[];
  overallRiskLevel: RiskAssessment;
  recommendations: Mitigation[];
  confidence: number;
}

export interface RiskAssessment {
  level: SeverityLevel;
  score: number;
  trend: string;
  keyDrivers: string[];
}

export interface EngineConfig {
  fusion: FusionConfig;
  attribution: AttributionConfig;
  adversarial: AdversarialConfig;
}

export interface FusionConfig {
  weights: Record<string, number>;
  correlationThreshold: number;
}

export interface AttributionConfig {
  minConfidence: number;
  methods: AttributionMethod[];
}

export interface AdversarialConfig {
  enabled: boolean;
  detectionThreshold: number;
}
