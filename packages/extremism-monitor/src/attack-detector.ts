/**
 * Attack Detector
 * Detects and analyzes potential attack planning indicators
 */

import type {
  AttackPlan,
  AttackIndicator,
  MonitoringQuery,
  MonitoringResult,
  WeaponsProcurement,
  ExplosivesMaterial,
  TrainingActivity,
  CommunicationPattern,
  TravelPattern,
  OperationalSecurityLapse,
  MartyrdomMaterial,
  AttackRehearsal,
  RiskAssessment,
  ThreatTrend
} from './types.js';

export class AttackDetector {
  private attackPlans: Map<string, AttackPlan> = new Map();
  private weaponsProcurements: WeaponsProcurement[] = [];
  private explosivesMaterials: ExplosivesMaterial[] = [];
  private trainingActivities: TrainingActivity[] = [];
  private communicationPatterns: CommunicationPattern[] = [];
  private travelPatterns: TravelPattern[] = [];
  private opsecLapses: OperationalSecurityLapse[] = [];
  private martyrdomMaterials: MartyrdomMaterial[] = [];
  private attackRehearsals: AttackRehearsal[] = [];

  /**
   * Register a potential attack plan
   */
  async registerAttackPlan(plan: AttackPlan): Promise<void> {
    this.attackPlans.set(plan.id, plan);
  }

  /**
   * Record weapons procurement activity
   */
  async recordWeaponsProcurement(procurement: WeaponsProcurement): Promise<void> {
    this.weaponsProcurements.push(procurement);
    await this.correlateIndicators(procurement);
  }

  /**
   * Record explosives material acquisition
   */
  async recordExplosivesMaterial(material: ExplosivesMaterial): Promise<void> {
    this.explosivesMaterials.push(material);
    await this.correlateIndicators(material);
  }

  /**
   * Record training activity
   */
  async recordTrainingActivity(activity: TrainingActivity): Promise<void> {
    this.trainingActivities.push(activity);
    await this.correlateIndicators(activity);
  }

  /**
   * Analyze communication patterns
   */
  async analyzeCommunicationPattern(pattern: CommunicationPattern): Promise<void> {
    this.communicationPatterns.push(pattern);
    await this.detectCommunicationAnomalies(pattern);
  }

  /**
   * Track travel patterns
   */
  async trackTravelPattern(pattern: TravelPattern): Promise<void> {
    this.travelPatterns.push(pattern);
    await this.correlateIndicators(pattern);
  }

  /**
   * Record operational security lapse
   */
  async recordOpsecLapse(lapse: OperationalSecurityLapse): Promise<void> {
    this.opsecLapses.push(lapse);
    await this.correlateIndicators(lapse);
  }

  /**
   * Record martyrdom material
   */
  async recordMartyrdomMaterial(material: MartyrdomMaterial): Promise<void> {
    this.martyrdomMaterials.push(material);
    // Martyrdom material is a critical indicator
    await this.escalateImminentThreat(material.individualId);
  }

  /**
   * Record attack rehearsal
   */
  async recordAttackRehearsal(rehearsal: AttackRehearsal): Promise<void> {
    this.attackRehearsals.push(rehearsal);
    await this.correlateIndicators(rehearsal);
  }

  /**
   * Query attack plans based on criteria
   */
  async queryAttackPlans(query: MonitoringQuery): Promise<MonitoringResult> {
    let filtered = Array.from(this.attackPlans.values());

    // Apply filters
    if (query.status && query.status.length > 0) {
      filtered = filtered.filter(plan => query.status!.includes(plan.status));
    }

    if (query.targetTypes && query.targetTypes.length > 0) {
      filtered = filtered.filter(plan =>
        plan.targets.some(target => query.targetTypes!.includes(target.type))
      );
    }

    if (query.severities && query.severities.length > 0) {
      filtered = filtered.filter(plan => query.severities!.includes(plan.severity));
    }

    if (query.regions && query.regions.length > 0) {
      filtered = filtered.filter(plan =>
        plan.targets.some(target =>
          query.regions!.includes(target.location.region)
        )
      );
    }

    if (query.minConfidence !== undefined) {
      filtered = filtered.filter(plan => plan.confidence >= query.minConfidence!);
    }

    // Collect all indicators
    const allIndicators = filtered.flatMap(plan => plan.indicators);

    // Filter by indicator types if specified
    let indicators = allIndicators;
    if (query.indicatorTypes && query.indicatorTypes.length > 0) {
      indicators = allIndicators.filter(ind =>
        query.indicatorTypes!.includes(ind.type)
      );
    }

    // Identify critical threats
    const criticalThreats = filtered.filter(
      plan => plan.severity === 'CRITICAL' && plan.confidence > 0.7
    );

    // Calculate trends
    const trends = this.calculateTrends(filtered);

    return {
      attacks: filtered,
      totalCount: filtered.length,
      criticalThreats,
      indicators,
      trends
    };
  }

  /**
   * Get attack plan by ID
   */
  async getAttackPlan(id: string): Promise<AttackPlan | undefined> {
    return this.attackPlans.get(id);
  }

  /**
   * Assess risk for an attack plan
   */
  async assessRisk(planId: string): Promise<RiskAssessment | null> {
    const plan = this.attackPlans.get(planId);
    if (!plan) return null;

    const factors = [
      {
        category: 'Capability',
        description: 'Weapons and materials procurement',
        weight: 0.3,
        present: this.hasWeaponsProcurement(plan)
      },
      {
        category: 'Intent',
        description: 'Martyrdom materials and communications',
        weight: 0.25,
        present: this.hasIntentIndicators(plan)
      },
      {
        category: 'Preparation',
        description: 'Training and rehearsals',
        weight: 0.25,
        present: this.hasPreparationIndicators(plan)
      },
      {
        category: 'Timing',
        description: 'Imminent execution indicators',
        weight: 0.2,
        present: this.hasTimingIndicators(plan)
      }
    ];

    const likelihood = factors.reduce(
      (sum, factor) => sum + (factor.present ? factor.weight : 0),
      0
    );

    const impact = this.calculateImpact(plan);

    const overallRisk = (likelihood * 0.6 + impact * 0.4);

    return {
      attackPlanId: planId,
      overallRisk,
      likelihood,
      impact,
      factors,
      mitigations: this.suggestMitigations(plan),
      assessmentDate: new Date()
    };
  }

  /**
   * Update attack plan status
   */
  async updateAttackStatus(planId: string, status: AttackPlan['status']): Promise<void> {
    const plan = this.attackPlans.get(planId);
    if (plan) {
      plan.status = status;
      plan.lastUpdated = new Date();
    }
  }

  /**
   * Get all indicators for a specific individual or organization
   */
  async getEntityIndicators(entityId: string): Promise<{
    weapons: WeaponsProcurement[];
    explosives: ExplosivesMaterial[];
    training: TrainingActivity[];
    travel: TravelPattern[];
    communications: CommunicationPattern[];
    opsec: OperationalSecurityLapse[];
    martyrdom: MartyrdomMaterial[];
    rehearsals: AttackRehearsal[];
  }> {
    return {
      weapons: this.weaponsProcurements.filter(
        w => w.individualId === entityId || w.organizationId === entityId
      ),
      explosives: this.explosivesMaterials.filter(
        e => e.acquiredBy === entityId
      ),
      training: this.trainingActivities.filter(
        t => t.participants.includes(entityId)
      ),
      travel: this.travelPatterns.filter(
        t => t.individualId === entityId
      ),
      communications: this.communicationPatterns.filter(
        c => c.participants.includes(entityId)
      ),
      opsec: this.opsecLapses.filter(
        o => o.individualId === entityId || o.organizationId === entityId
      ),
      martyrdom: this.martyrdomMaterials.filter(
        m => m.individualId === entityId
      ),
      rehearsals: this.attackRehearsals.filter(
        r => r.participants.includes(entityId)
      )
    };
  }

  /**
   * Private helper methods
   */

  private async correlateIndicators(indicator: unknown): Promise<void> {
    // Correlation logic would be implemented here
    // This would look for patterns across multiple indicators
  }

  private async detectCommunicationAnomalies(
    pattern: CommunicationPattern
  ): Promise<void> {
    // Anomaly detection logic would be implemented here
  }

  private async escalateImminentThreat(individualId: string): Promise<void> {
    // Find attack plans involving this individual
    for (const plan of this.attackPlans.values()) {
      if (plan.planners.includes(individualId)) {
        plan.status = 'IMMINENT';
        plan.severity = 'CRITICAL';
        plan.lastUpdated = new Date();
      }
    }
  }

  private hasWeaponsProcurement(plan: AttackPlan): boolean {
    return plan.planners.some(plannerId =>
      this.weaponsProcurements.some(
        w => w.individualId === plannerId || w.organizationId === plannerId
      )
    );
  }

  private hasIntentIndicators(plan: AttackPlan): boolean {
    return plan.planners.some(plannerId =>
      this.martyrdomMaterials.some(m => m.individualId === plannerId)
    );
  }

  private hasPreparationIndicators(plan: AttackPlan): boolean {
    return plan.planners.some(plannerId =>
      this.trainingActivities.some(t => t.participants.includes(plannerId)) ||
      this.attackRehearsals.some(r => r.participants.includes(plannerId))
    );
  }

  private hasTimingIndicators(plan: AttackPlan): boolean {
    if (!plan.timeline?.expectedExecution) return false;
    const daysUntil = Math.ceil(
      (plan.timeline.expectedExecution.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntil <= 30;
  }

  private calculateImpact(plan: AttackPlan): number {
    let impact = 0.5; // Base impact

    // Target type impact
    if (plan.targets.some(t => t.type === 'MASS_GATHERING')) impact += 0.3;
    if (plan.targets.some(t => t.type === 'INFRASTRUCTURE')) impact += 0.2;

    // Number of targets
    if (plan.targets.length > 3) impact += 0.2;

    return Math.min(impact, 1.0);
  }

  private suggestMitigations(plan: AttackPlan): string[] {
    const mitigations: string[] = [];

    mitigations.push('Increase surveillance on identified planners');
    mitigations.push('Enhance security at identified targets');

    if (this.hasWeaponsProcurement(plan)) {
      mitigations.push('Monitor weapons suppliers and procurement channels');
    }

    if (plan.status === 'IMMINENT') {
      mitigations.push('Consider preemptive interdiction');
      mitigations.push('Alert law enforcement and security services');
    }

    return mitigations;
  }

  private calculateTrends(plans: AttackPlan[]): ThreatTrend[] {
    // Simplified trend calculation
    return [
      {
        type: 'Attack Planning',
        direction: 'STABLE',
        magnitude: plans.length,
        period: '30-days',
        description: `${plans.length} active attack plans detected`
      }
    ];
  }
}
