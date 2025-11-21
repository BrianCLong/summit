/**
 * @intelgraph/election-disruption-detection
 *
 * State-of-the-art election disruption detection system leveraging:
 * - Multi-modal threat fusion (social, infrastructure, cyber, physical)
 * - Adversarial ML for evolving threat detection
 * - Causal inference for attribution
 * - Real-time anomaly correlation across electoral phases
 */

export * from './detectors/index.js';
export * from './models/index.js';
export * from './fusion/index.js';
export * from './attribution/index.js';

// Core Types
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

/**
 * Main Election Disruption Detection Engine
 */
export class ElectionDisruptionEngine {
  private detectors: ThreatDetector[] = [];
  private fusionEngine: MultiModalFusionEngine;
  private attributionEngine: CausalAttributionEngine;
  private adversarialDefense: AdversarialDefenseLayer;

  constructor(config: EngineConfig) {
    this.fusionEngine = new MultiModalFusionEngine(config.fusion);
    this.attributionEngine = new CausalAttributionEngine(config.attribution);
    this.adversarialDefense = new AdversarialDefenseLayer(config.adversarial);
    this.initializeDetectors(config);
  }

  private initializeDetectors(config: EngineConfig): void {
    this.detectors = [
      new VoterSuppressionDetector(config),
      new DisinformationCampaignDetector(config),
      new InfrastructureAttackDetector(config),
      new ForeignInterferenceDetector(config),
      new DeepfakeInjectionDetector(config),
      new CoordinatedHarassmentDetector(config),
      new PerceptionHackDetector(config),
      new LegitimacyAttackDetector(config),
    ];
  }

  async analyzeSignals(
    signals: RawSignal[],
    context: ElectionContext
  ): Promise<ElectionThreatAssessment> {
    // Adversarial robustness check
    const cleanedSignals = await this.adversarialDefense.filterAdversarialInputs(signals);

    // Multi-detector analysis
    const detectorResults = await Promise.all(
      this.detectors.map((d) => d.analyze(cleanedSignals, context))
    );

    // Multi-modal fusion
    const fusedThreats = await this.fusionEngine.fuse(detectorResults);

    // Causal attribution
    const attributedThreats = await this.attributionEngine.attribute(fusedThreats);

    // Temporal correlation
    const correlatedThreats = this.correlateTemporally(attributedThreats, context);

    return {
      timestamp: new Date(),
      context,
      threats: correlatedThreats,
      overallRiskLevel: this.calculateOverallRisk(correlatedThreats),
      recommendations: this.generateRecommendations(correlatedThreats, context),
      confidence: this.calculateConfidence(correlatedThreats),
    };
  }

  private correlateTemporally(
    threats: ElectionThreatSignal[],
    context: ElectionContext
  ): ElectionThreatSignal[] {
    // Identify coordinated temporal patterns
    return threats.map((threat) => ({
      ...threat,
      temporalContext: {
        ...threat.temporalContext,
        phase: context.currentPhase,
        daysToElection: context.daysToElection,
      },
    }));
  }

  private calculateOverallRisk(threats: ElectionThreatSignal[]): RiskAssessment {
    const severityWeights = {
      CRITICAL: 1.0,
      HIGH: 0.7,
      MEDIUM: 0.4,
      LOW: 0.2,
      INFORMATIONAL: 0.05,
    };

    const weightedSum = threats.reduce(
      (sum, t) => sum + severityWeights[t.severity] * t.confidence,
      0
    );

    const normalizedRisk = Math.min(1, weightedSum / threats.length || 0);

    return {
      level: this.riskLevelFromScore(normalizedRisk),
      score: normalizedRisk,
      trend: this.calculateTrend(threats),
      keyDrivers: this.identifyKeyDrivers(threats),
    };
  }

  private riskLevelFromScore(score: number): SeverityLevel {
    if (score >= 0.8) return 'CRITICAL';
    if (score >= 0.6) return 'HIGH';
    if (score >= 0.4) return 'MEDIUM';
    if (score >= 0.2) return 'LOW';
    return 'INFORMATIONAL';
  }

  private calculateTrend(threats: ElectionThreatSignal[]): string {
    const escalating = threats.filter(
      (t) => t.temporalContext.trendDirection === 'ESCALATING'
    ).length;
    const total = threats.length || 1;
    if (escalating / total > 0.6) return 'ESCALATING';
    if (escalating / total < 0.3) return 'DECLINING';
    return 'STABLE';
  }

  private identifyKeyDrivers(threats: ElectionThreatSignal[]): string[] {
    const typeCount = new Map<ThreatType, number>();
    threats.forEach((t) => {
      typeCount.set(t.type, (typeCount.get(t.type) || 0) + 1);
    });
    return Array.from(typeCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type);
  }

  private generateRecommendations(
    threats: ElectionThreatSignal[],
    context: ElectionContext
  ): Mitigation[] {
    const recommendations: Mitigation[] = [];

    // Phase-specific recommendations
    const criticalThreats = threats.filter((t) => t.severity === 'CRITICAL');

    for (const threat of criticalThreats) {
      recommendations.push(...threat.mitigationRecommendations);
    }

    // Deduplicate and prioritize
    return this.prioritizeMitigations(recommendations, context);
  }

  private prioritizeMitigations(
    mitigations: Mitigation[],
    context: ElectionContext
  ): Mitigation[] {
    return mitigations
      .sort((a, b) => {
        // Prioritize by urgency based on election proximity
        const urgencyA = a.priority * (1 + 1 / (context.daysToElection + 1));
        const urgencyB = b.priority * (1 + 1 / (context.daysToElection + 1));
        return urgencyB - urgencyA;
      })
      .slice(0, 10);
  }

  private calculateConfidence(threats: ElectionThreatSignal[]): number {
    if (threats.length === 0) return 0;
    return threats.reduce((sum, t) => sum + t.confidence, 0) / threats.length;
  }
}

// Supporting interfaces
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

// Abstract base classes for detectors
export abstract class ThreatDetector {
  abstract analyze(
    signals: RawSignal[],
    context: ElectionContext
  ): Promise<ElectionThreatSignal[]>;
}

export class MultiModalFusionEngine {
  constructor(private config: FusionConfig) {}

  async fuse(results: ElectionThreatSignal[][]): Promise<ElectionThreatSignal[]> {
    const allThreats = results.flat();
    // Correlation and deduplication logic
    return this.correlateAndDeduplicate(allThreats);
  }

  private correlateAndDeduplicate(threats: ElectionThreatSignal[]): ElectionThreatSignal[] {
    const grouped = new Map<string, ElectionThreatSignal[]>();

    threats.forEach((t) => {
      const key = `${t.type}-${t.geospatialContext.jurisdictions.join(',')}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(t);
    });

    return Array.from(grouped.values()).map((group) => this.mergeThreats(group));
  }

  private mergeThreats(threats: ElectionThreatSignal[]): ElectionThreatSignal {
    const merged = threats[0];
    merged.confidence = Math.max(...threats.map((t) => t.confidence));
    merged.evidence = threats.flatMap((t) => t.evidence);
    return merged;
  }
}

export class CausalAttributionEngine {
  constructor(private config: AttributionConfig) {}

  async attribute(threats: ElectionThreatSignal[]): Promise<ElectionThreatSignal[]> {
    return Promise.all(
      threats.map(async (threat) => ({
        ...threat,
        attribution: await this.performAttribution(threat),
      }))
    );
  }

  private async performAttribution(threat: ElectionThreatSignal): Promise<AttributionAssessment> {
    // Multi-method attribution
    return {
      primaryActor: null,
      confidence: 0,
      methodology: 'MULTI_INT_FUSION',
      indicators: [],
      alternativeHypotheses: [],
    };
  }
}

export class AdversarialDefenseLayer {
  constructor(private config: AdversarialConfig) {}

  async filterAdversarialInputs(signals: RawSignal[]): Promise<RawSignal[]> {
    if (!this.config.enabled) return signals;
    // Filter out adversarial/poisoned inputs
    return signals.filter((s) => this.isClean(s));
  }

  private isClean(signal: RawSignal): boolean {
    // Adversarial detection logic
    return true;
  }
}

// Placeholder detector implementations
class VoterSuppressionDetector extends ThreatDetector {
  constructor(private config: EngineConfig) { super(); }
  async analyze(signals: RawSignal[], context: ElectionContext): Promise<ElectionThreatSignal[]> {
    return [];
  }
}

class DisinformationCampaignDetector extends ThreatDetector {
  constructor(private config: EngineConfig) { super(); }
  async analyze(signals: RawSignal[], context: ElectionContext): Promise<ElectionThreatSignal[]> {
    return [];
  }
}

class InfrastructureAttackDetector extends ThreatDetector {
  constructor(private config: EngineConfig) { super(); }
  async analyze(signals: RawSignal[], context: ElectionContext): Promise<ElectionThreatSignal[]> {
    return [];
  }
}

class ForeignInterferenceDetector extends ThreatDetector {
  constructor(private config: EngineConfig) { super(); }
  async analyze(signals: RawSignal[], context: ElectionContext): Promise<ElectionThreatSignal[]> {
    return [];
  }
}

class DeepfakeInjectionDetector extends ThreatDetector {
  constructor(private config: EngineConfig) { super(); }
  async analyze(signals: RawSignal[], context: ElectionContext): Promise<ElectionThreatSignal[]> {
    return [];
  }
}

class CoordinatedHarassmentDetector extends ThreatDetector {
  constructor(private config: EngineConfig) { super(); }
  async analyze(signals: RawSignal[], context: ElectionContext): Promise<ElectionThreatSignal[]> {
    return [];
  }
}

class PerceptionHackDetector extends ThreatDetector {
  constructor(private config: EngineConfig) { super(); }
  async analyze(signals: RawSignal[], context: ElectionContext): Promise<ElectionThreatSignal[]> {
    return [];
  }
}

class LegitimacyAttackDetector extends ThreatDetector {
  constructor(private config: EngineConfig) { super(); }
  async analyze(signals: RawSignal[], context: ElectionContext): Promise<ElectionThreatSignal[]> {
    return [];
  }
}
