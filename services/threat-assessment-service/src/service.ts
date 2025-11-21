/**
 * Threat Assessment Service
 * Comprehensive threat assessment and risk analysis
 */

import type {
  ThreatAssessment,
  AttackProbability,
  TargetVulnerability,
  CapabilityAssessment,
  IntentAssessment,
  GeographicThreatMap,
  SectorThreat,
  CriticalInfrastructure,
  MassCasualtyPotential,
  SymbolicTarget,
  ThreatTimeline,
  RiskMatrix
} from './types.js';

export class ThreatAssessmentService {
  private assessments: Map<string, ThreatAssessment> = new Map();
  private vulnerabilities: Map<string, TargetVulnerability> = new Map();
  private capabilities: Map<string, CapabilityAssessment> = new Map();
  private intents: Map<string, IntentAssessment> = new Map();
  private infrastructure: Map<string, CriticalInfrastructure> = new Map();
  private symbolicTargets: Map<string, SymbolicTarget> = new Map();

  /**
   * Conduct comprehensive threat assessment
   */
  async assessThreat(assessment: ThreatAssessment): Promise<void> {
    this.assessments.set(assessment.targetId, assessment);
  }

  /**
   * Calculate attack probability
   */
  async calculateAttackProbability(targetId: string): Promise<AttackProbability> {
    const assessment = this.assessments.get(targetId);
    if (!assessment) {
      return {
        targetId,
        probability: 0,
        timeframe: 'unknown',
        attackTypes: [],
        factors: [],
        confidence: 0
      };
    }

    // Calculate probability based on threat components
    let totalProbability = 0;
    const factors: AttackProbability['factors'] = [];

    for (const component of assessment.components) {
      if (component.category === 'CAPABILITY') {
        totalProbability += component.score * 0.3;
        factors.push({
          factor: 'Capability',
          weight: 0.3,
          present: component.score > 0.5,
          description: 'Adversary capability to conduct attack'
        });
      } else if (component.category === 'INTENT') {
        totalProbability += component.score * 0.4;
        factors.push({
          factor: 'Intent',
          weight: 0.4,
          present: component.score > 0.5,
          description: 'Demonstrated intent to attack'
        });
      } else if (component.category === 'OPPORTUNITY') {
        totalProbability += component.score * 0.3;
        factors.push({
          factor: 'Opportunity',
          weight: 0.3,
          present: component.score > 0.5,
          description: 'Opportunity to conduct attack'
        });
      }
    }

    return {
      targetId,
      probability: Math.min(totalProbability, 1.0),
      timeframe: this.estimateTimeframe(totalProbability),
      attackTypes: this.estimateAttackTypes(assessment),
      factors,
      confidence: assessment.confidence
    };
  }

  /**
   * Assess target vulnerability
   */
  async assessVulnerability(vulnerability: TargetVulnerability): Promise<void> {
    this.vulnerabilities.set(vulnerability.targetId, vulnerability);
  }

  /**
   * Assess entity capability
   */
  async assessCapability(capability: CapabilityAssessment): Promise<void> {
    this.capabilities.set(capability.entityId, capability);
  }

  /**
   * Assess entity intent
   */
  async assessIntent(intent: IntentAssessment): Promise<void> {
    this.intents.set(intent.entityId, intent);
  }

  /**
   * Generate geographic threat map
   */
  async generateGeographicThreatMap(): Promise<GeographicThreatMap> {
    const regions: GeographicThreatMap['regions'] = [];
    const hotspots: GeographicThreatMap['hotspots'] = [];

    // Aggregate threats by region
    const regionMap = new Map<string, { orgs: number; attacks: number; threats: number }>();

    for (const assessment of this.assessments.values()) {
      // This would be populated with actual regional data
    }

    return {
      regions,
      hotspots,
      trends: [],
      generated: new Date()
    };
  }

  /**
   * Assess sector-specific threats
   */
  async assessSectorThreats(): Promise<SectorThreat[]> {
    const sectors = [
      'AVIATION',
      'MARITIME',
      'TRANSPORTATION',
      'ENERGY',
      'FINANCIAL',
      'GOVERNMENT',
      'RELIGIOUS',
      'ENTERTAINMENT'
    ];

    return sectors.map(sector => ({
      sector,
      threatLevel: this.calculateSectorThreat(sector),
      vulnerabilities: [],
      attackTypes: [],
      incidents: 0,
      trend: 'STABLE' as const
    }));
  }

  /**
   * Register critical infrastructure
   */
  async registerInfrastructure(infrastructure: CriticalInfrastructure): Promise<void> {
    this.infrastructure.set(infrastructure.id, infrastructure);
  }

  /**
   * Assess mass casualty potential
   */
  async assessMassCasualtyPotential(
    attackType: string,
    targetId: string
  ): Promise<MassCasualtyPotential> {
    const vulnerability = this.vulnerabilities.get(targetId);

    const estimates: Record<string, CasualtyEstimate> = {
      'BOMBING': { minimum: 10, likely: 50, maximum: 200 },
      'VEHICLE_RAMMING': { minimum: 5, likely: 20, maximum: 100 },
      'MASS_SHOOTING': { minimum: 5, likely: 30, maximum: 150 },
      'CHEMICAL': { minimum: 50, likely: 200, maximum: 1000 }
    };

    return {
      scenarioId: `scenario-${targetId}-${attackType}`,
      attackType,
      target: targetId,
      estimatedCasualties: estimates[attackType] || { minimum: 0, likely: 0, maximum: 0 },
      probability: 0.1,
      factors: ['Target vulnerability', 'Attack complexity', 'Security measures']
    };
  }

  /**
   * Register symbolic target
   */
  async registerSymbolicTarget(target: SymbolicTarget): Promise<void> {
    this.symbolicTargets.set(target.id, target);
  }

  /**
   * Generate threat timeline
   */
  async generateThreatTimeline(period: string): Promise<ThreatTimeline> {
    return {
      period,
      threats: [],
      trends: []
    };
  }

  /**
   * Generate risk matrix
   */
  async generateRiskMatrix(): Promise<RiskMatrix> {
    const scenarios: RiskScenario[] = [];

    // Generate scenarios from assessments
    for (const assessment of this.assessments.values()) {
      const likelihood = assessment.overallThreat;
      const impact = this.estimateImpact(assessment);

      scenarios.push({
        id: `scenario-${assessment.targetId}`,
        description: `Threat from ${assessment.targetId}`,
        likelihood,
        impact,
        riskScore: likelihood * impact,
        mitigations: assessment.mitigations.map(m => m.description),
        priority: this.calculatePriority(likelihood * impact)
      });
    }

    return {
      scenarios: scenarios.sort((a, b) => b.riskScore - a.riskScore),
      generated: new Date()
    };
  }

  /**
   * Get assessment by ID
   */
  async getAssessment(targetId: string): Promise<ThreatAssessment | undefined> {
    return this.assessments.get(targetId);
  }

  /**
   * Private helper methods
   */

  private estimateTimeframe(probability: number): string {
    if (probability >= 0.8) return 'IMMINENT';
    if (probability >= 0.6) return 'NEAR_TERM';
    if (probability >= 0.4) return 'MEDIUM_TERM';
    return 'LONG_TERM';
  }

  private estimateAttackTypes(assessment: ThreatAssessment) {
    return [
      { type: 'BOMBING', probability: 0.3, lethality: 0.8 },
      { type: 'SHOOTING', probability: 0.4, lethality: 0.6 },
      { type: 'VEHICLE_RAMMING', probability: 0.2, lethality: 0.5 }
    ];
  }

  private calculateSectorThreat(sector: string): number {
    // Simplified calculation
    return 0.5;
  }

  private estimateImpact(assessment: ThreatAssessment): number {
    return 0.7;
  }

  private calculatePriority(riskScore: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    if (riskScore >= 0.75) return 'CRITICAL';
    if (riskScore >= 0.5) return 'HIGH';
    if (riskScore >= 0.25) return 'MEDIUM';
    return 'LOW';
  }
}
