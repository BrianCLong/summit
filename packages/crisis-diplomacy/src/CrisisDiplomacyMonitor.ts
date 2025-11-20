import {
  Crisis,
  CrisisType,
  CrisisPhase,
  EscalationLevel,
  MediationEffort,
  Negotiation,
  Ceasefire,
  Agreement,
  PeaceProcess,
  EscalationRisk,
  DeescalationOpportunity,
  TrajectoryPrediction,
  ResolutionProspects,
  CrisisComparison,
  EarlyWarningIndicator
} from './types.js';

/**
 * CrisisDiplomacyMonitor
 *
 * Monitor conflict mediation, peace processes, crisis communications,
 * and track diplomatic efforts to resolve international crises
 */
export class CrisisDiplomacyMonitor {
  private crises: Map<string, Crisis> = new Map();
  private crisesByType: Map<CrisisType, Set<string>> = new Map();
  private crisesByPhase: Map<CrisisPhase, Set<string>> = new Map();
  private peaceProcesses: Map<string, PeaceProcess> = new Map();
  private mediationEfforts: Map<string, MediationEffort> = new Map();

  /**
   * Track a crisis
   */
  trackCrisis(crisis: Crisis): void {
    this.crises.set(crisis.id, crisis);

    // Index by type
    if (!this.crisesByType.has(crisis.type)) {
      this.crisesByType.set(crisis.type, new Set());
    }
    this.crisesByType.get(crisis.type)!.add(crisis.id);

    // Index by phase
    if (!this.crisesByPhase.has(crisis.phase)) {
      this.crisesByPhase.set(crisis.phase, new Set());
    }
    this.crisesByPhase.get(crisis.phase)!.add(crisis.id);
  }

  /**
   * Get crisis by ID
   */
  getCrisis(id: string): Crisis | undefined {
    return this.crises.get(id);
  }

  /**
   * Get active crises
   */
  getActiveCrises(): Crisis[] {
    return Array.from(this.crises.values())
      .filter(c =>
        c.phase !== CrisisPhase.RESOLVED &&
        c.phase !== CrisisPhase.FROZEN &&
        c.monitoring
      )
      .sort((a, b) => b.escalationLevel.localeCompare(a.escalationLevel));
  }

  /**
   * Get crises by type
   */
  getCrisesByType(type: CrisisType): Crisis[] {
    const crisisIds = this.crisesByType.get(type) || new Set();
    return Array.from(crisisIds)
      .map(id => this.crises.get(id))
      .filter((c): c is Crisis => c !== undefined);
  }

  /**
   * Get crises by phase
   */
  getCrisesByPhase(phase: CrisisPhase): Crisis[] {
    const crisisIds = this.crisesByPhase.get(phase) || new Set();
    return Array.from(crisisIds)
      .map(id => this.crises.get(id))
      .filter((c): c is Crisis => c !== undefined);
  }

  /**
   * Assess escalation risk
   */
  assessEscalationRisk(crisisId: string): {
    overallRisk: number;
    level: EscalationLevel;
    immediateRisks: EscalationRisk[];
    criticalIndicators: string[];
    mitigationOptions: string[];
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  } {
    const crisis = this.crises.get(crisisId);
    if (!crisis) {
      return {
        overallRisk: 0,
        level: EscalationLevel.LOW,
        immediateRisks: [],
        criticalIndicators: [],
        mitigationOptions: [],
        urgency: 'LOW'
      };
    }

    // Calculate overall risk
    let overallRisk = 0;
    const weights = {
      IMMEDIATE: 1.0,
      SHORT_TERM: 0.7,
      MEDIUM_TERM: 0.4,
      LONG_TERM: 0.2
    };

    for (const risk of crisis.escalationRisks) {
      const weight = weights[risk.timeframe];
      overallRisk += (risk.probability * risk.severity * weight) / 1000;
    }

    overallRisk = Math.min(100, overallRisk);

    // Get immediate risks
    const immediateRisks = crisis.escalationRisks
      .filter(r => r.timeframe === 'IMMEDIATE' || r.timeframe === 'SHORT_TERM')
      .sort((a, b) => (b.probability * b.severity) - (a.probability * a.severity))
      .slice(0, 5);

    // Critical indicators
    const criticalIndicators = immediateRisks
      .flatMap(r => r.indicators)
      .filter(Boolean)
      .slice(0, 10);

    // Determine level
    let level: EscalationLevel = EscalationLevel.LOW;
    if (overallRisk >= 80) level = EscalationLevel.MAXIMUM;
    else if (overallRisk >= 60) level = EscalationLevel.CRITICAL;
    else if (overallRisk >= 40) level = EscalationLevel.HIGH;
    else if (overallRisk >= 20) level = EscalationLevel.MODERATE;

    // Mitigation options
    const mitigationOptions = this.generateMitigationOptions(crisis, immediateRisks);

    // Urgency
    let urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (level === EscalationLevel.MAXIMUM || level === EscalationLevel.CRITICAL) {
      urgency = 'CRITICAL';
    } else if (level === EscalationLevel.HIGH) {
      urgency = 'HIGH';
    } else if (level === EscalationLevel.MODERATE) {
      urgency = 'MEDIUM';
    }

    return {
      overallRisk,
      level,
      immediateRisks,
      criticalIndicators,
      mitigationOptions,
      urgency
    };
  }

  /**
   * Identify deescalation opportunities
   */
  identifyDeescalationOpportunities(crisisId: string): {
    opportunities: DeescalationOpportunity[];
    immediateActions: string[];
    diplomaticWindows: string[];
    confidence: number;
  } {
    const crisis = this.crises.get(crisisId);
    if (!crisis) {
      return {
        opportunities: [],
        immediateActions: [],
        diplomaticWindows: [],
        confidence: 0
      };
    }

    // Sort opportunities by feasibility and impact
    const opportunities = crisis.deescalationOpportunities
      .sort((a, b) => (b.feasibility * b.impact) - (a.feasibility * a.impact));

    // Immediate actions (high feasibility, immediate timeframe)
    const immediateActions = opportunities
      .filter(o => o.timeframe === 'IMMEDIATE' && o.feasibility > 60)
      .flatMap(o => o.requirements)
      .filter(Boolean)
      .slice(0, 5);

    // Diplomatic windows
    const diplomaticWindows: string[] = [];
    for (const opp of opportunities.slice(0, 3)) {
      if (opp.sponsors && opp.sponsors.length > 0) {
        diplomaticWindows.push(
          `${opp.opportunity} (Sponsored by: ${opp.sponsors.join(', ')})`
        );
      } else {
        diplomaticWindows.push(opp.opportunity);
      }
    }

    // Calculate confidence based on data quality
    let confidence = 60;
    if (crisis.mediationEfforts.length > 0) confidence += 10;
    if (crisis.ceasefires.length > 0) confidence += 10;
    if (crisis.confidence > 0.8) confidence += 10;

    return {
      opportunities,
      immediateActions,
      diplomaticWindows,
      confidence: Math.min(100, confidence)
    };
  }

  /**
   * Track mediation effort
   */
  trackMediationEffort(effort: MediationEffort): void {
    this.mediationEfforts.set(effort.id, effort);

    // Add to crisis if exists
    for (const crisis of this.crises.values()) {
      const hasMediationForCrisis = crisis.primaryParties.some(p =>
        effort.parties.includes(p.name)
      );

      if (hasMediationForCrisis) {
        const existingIndex = crisis.mediationEfforts.findIndex(m => m.id === effort.id);
        if (existingIndex >= 0) {
          crisis.mediationEfforts[existingIndex] = effort;
        } else {
          crisis.mediationEfforts.push(effort);
        }
      }
    }
  }

  /**
   * Analyze mediation effectiveness
   */
  analyzeMediationEffectiveness(effortId: string): {
    effort: MediationEffort | undefined;
    effectivenessScore: number;
    strengths: string[];
    weaknesses: string[];
    prospects: string;
    recommendations: string[];
  } {
    const effort = this.mediationEfforts.get(effortId);
    if (!effort) {
      return {
        effort: undefined,
        effectivenessScore: 0,
        strengths: [],
        weaknesses: [],
        prospects: 'Unknown',
        recommendations: []
      };
    }

    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // Analyze factors
    if (effort.factors.mediatorCredibility > 70) {
      strengths.push('High mediator credibility');
    } else if (effort.factors.mediatorCredibility < 40) {
      weaknesses.push('Low mediator credibility');
    }

    if (effort.factors.partyWillingness > 70) {
      strengths.push('Strong party willingness to negotiate');
    } else if (effort.factors.partyWillingness < 40) {
      weaknesses.push('Limited party willingness');
    }

    if (effort.factors.externalSupport > 70) {
      strengths.push('Strong external support');
    } else if (effort.factors.externalSupport < 40) {
      weaknesses.push('Weak external support');
    }

    // Calculate effectiveness score
    const effectivenessScore = (
      effort.factors.mediatorCredibility * 0.3 +
      effort.factors.partyWillingness * 0.4 +
      effort.factors.externalSupport * 0.2 +
      effort.factors.timing * 0.1
    );

    // Breakthroughs and setbacks
    if (effort.breakthroughs && effort.breakthroughs.length > 0) {
      strengths.push(`${effort.breakthroughs.length} breakthrough(s) achieved`);
    }

    if (effort.setbacks && effort.setbacks.length > 0) {
      weaknesses.push(`${effort.setbacks.length} setback(s) encountered`);
    }

    // Prospects
    let prospects = 'Uncertain';
    if (effectivenessScore > 70 && effort.status === 'ACTIVE') {
      prospects = 'Promising - likely to yield results';
    } else if (effectivenessScore > 50 && effort.status === 'ACTIVE') {
      prospects = 'Moderate - progress possible with sustained effort';
    } else if (effectivenessScore < 30 || effort.status === 'FAILED') {
      prospects = 'Poor - alternative approaches needed';
    } else if (effort.status === 'SUSPENDED') {
      prospects = 'Stalled - requires renewed commitment';
    }

    // Recommendations
    const recommendations = this.generateMediationRecommendations(effort, effectivenessScore);

    return {
      effort,
      effectivenessScore,
      strengths,
      weaknesses,
      prospects,
      recommendations
    };
  }

  /**
   * Track peace process
   */
  trackPeaceProcess(process: PeaceProcess): void {
    this.peaceProcesses.set(process.id, process);
  }

  /**
   * Assess peace process sustainability
   */
  assessPeaceProcessSustainability(processId: string): {
    process: PeaceProcess | undefined;
    sustainabilityScore: number;
    supportingFactors: string[];
    threateningFactors: string[];
    criticalPeriods: string[];
    prognosis: string;
  } {
    const process = this.peaceProcesses.get(processId);
    if (!process) {
      return {
        process: undefined,
        sustainabilityScore: 0,
        supportingFactors: [],
        threateningFactors: [],
        criticalPeriods: [],
        prognosis: 'Unknown'
      };
    }

    const supportingFactors: string[] = [];
    const threateningFactors: string[] = [];

    // Analyze momentum
    if (process.momentum === 'STRONG') {
      supportingFactors.push('Strong process momentum');
    } else if (process.momentum === 'STALLED') {
      threateningFactors.push('Process has stalled');
    }

    // Analyze public support
    const avgSupport = process.publicSupport.reduce((sum, s) => sum + s.support, 0) /
      (process.publicSupport.length || 1);

    if (avgSupport > 70) {
      supportingFactors.push('Strong public support across parties');
    } else if (avgSupport < 40) {
      threateningFactors.push('Weak public support');
    }

    // Analyze stakeholder commitment
    const avgCommitment = process.stakeholders.reduce((sum, s) => sum + s.commitment, 0) /
      (process.stakeholders.length || 1);

    if (avgCommitment > 70) {
      supportingFactors.push('High stakeholder commitment');
    } else if (avgCommitment < 40) {
      threateningFactors.push('Low stakeholder commitment');
    }

    // Identify critical periods
    const criticalPeriods: string[] = [];
    for (const phase of process.phases) {
      if (phase.status === 'STALLED') {
        criticalPeriods.push(`Phase ${phase.number}: ${phase.name} is stalled`);
      } else if (phase.challenges.length > 3) {
        criticalPeriods.push(`Phase ${phase.number}: Multiple challenges`);
      }
    }

    // Calculate sustainability score
    let sustainabilityScore = process.sustainability;
    if (process.momentum === 'STRONG') sustainabilityScore += 10;
    if (process.momentum === 'STALLED') sustainabilityScore -= 20;
    sustainabilityScore = Math.max(0, Math.min(100, sustainabilityScore));

    // Prognosis
    let prognosis = '';
    if (sustainabilityScore > 75) {
      prognosis = 'Excellent - process likely to succeed';
    } else if (sustainabilityScore > 60) {
      prognosis = 'Good - process on track with manageable risks';
    } else if (sustainabilityScore > 40) {
      prognosis = 'Uncertain - requires attention to address challenges';
    } else {
      prognosis = 'Poor - significant risks to process continuation';
    }

    return {
      process,
      sustainabilityScore,
      supportingFactors,
      threateningFactors,
      criticalPeriods,
      prognosis
    };
  }

  /**
   * Monitor ceasefire compliance
   */
  monitorCeasefireCompliance(crisisId: string): {
    ceasefires: Ceasefire[];
    activeCount: number;
    averageCompliance: number;
    violations: number;
    trend: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  } {
    const crisis = this.crises.get(crisisId);
    if (!crisis) {
      return {
        ceasefires: [],
        activeCount: 0,
        averageCompliance: 0,
        violations: 0,
        trend: 'STABLE',
        riskLevel: 'LOW'
      };
    }

    const activeCeasefires = crisis.ceasefires.filter(c =>
      c.status === 'HOLDING' || c.status === 'VIOLATED'
    );

    const avgCompliance = activeCeasefires.length > 0
      ? activeCeasefires.reduce((sum, c) => sum + c.compliance, 0) / activeCeasefires.length
      : 0;

    const totalViolations = crisis.ceasefires.reduce(
      (sum, c) => sum + (c.violations?.length || 0),
      0
    );

    // Determine trend
    let trend: 'IMPROVING' | 'STABLE' | 'DETERIORATING' = 'STABLE';
    if (activeCeasefires.length >= 2) {
      const recent = activeCeasefires[activeCeasefires.length - 1];
      const previous = activeCeasefires[activeCeasefires.length - 2];

      if (recent.compliance > previous.compliance + 10) trend = 'IMPROVING';
      else if (recent.compliance < previous.compliance - 10) trend = 'DETERIORATING';
    }

    // Risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (avgCompliance < 50 || trend === 'DETERIORATING') riskLevel = 'HIGH';
    else if (avgCompliance < 70) riskLevel = 'MEDIUM';

    return {
      ceasefires: crisis.ceasefires,
      activeCount: activeCeasefires.length,
      averageCompliance: avgCompliance,
      violations: totalViolations,
      trend,
      riskLevel
    };
  }

  /**
   * Predict crisis trajectory
   */
  predictTrajectory(crisisId: string): TrajectoryPrediction {
    const crisis = this.crises.get(crisisId);
    if (!crisis) {
      return {
        shortTerm: {
          phase: CrisisPhase.EMERGING,
          probability: 0,
          keyFactors: []
        },
        mediumTerm: {
          phase: CrisisPhase.EMERGING,
          probability: 0,
          keyFactors: []
        },
        longTerm: {
          phase: CrisisPhase.EMERGING,
          probability: 0,
          keyFactors: []
        },
        confidence: 0
      };
    }

    // Use existing prediction if available
    if (crisis.trajectoryPrediction) {
      return crisis.trajectoryPrediction;
    }

    // Generate basic prediction
    const currentPhase = crisis.phase;
    let shortTermPhase = currentPhase;
    let mediumTermPhase = currentPhase;
    let longTermPhase = currentPhase;

    // Simple logic based on escalation level and mediation efforts
    if (crisis.escalationLevel === EscalationLevel.MAXIMUM) {
      shortTermPhase = CrisisPhase.PEAK;
      mediumTermPhase = CrisisPhase.DE_ESCALATING;
      longTermPhase = CrisisPhase.STABILIZING;
    } else if (crisis.mediationEfforts.length > 0) {
      const activeMediations = crisis.mediationEfforts.filter(m => m.status === 'ACTIVE');
      if (activeMediations.length > 0) {
        shortTermPhase = CrisisPhase.STABILIZING;
        mediumTermPhase = CrisisPhase.DE_ESCALATING;
        longTermPhase = CrisisPhase.RESOLVED;
      }
    }

    return {
      shortTerm: {
        phase: shortTermPhase,
        probability: 60,
        keyFactors: ['Current escalation level', 'Active mediation efforts']
      },
      mediumTerm: {
        phase: mediumTermPhase,
        probability: 50,
        keyFactors: ['Mediation effectiveness', 'Regional stability']
      },
      longTerm: {
        phase: longTermPhase,
        probability: 40,
        keyFactors: ['Root causes resolution', 'Political will']
      },
      confidence: 50
    };
  }

  /**
   * Compare crises for lessons learned
   */
  compareCrises(crisisIds: string[]): CrisisComparison {
    const crises = crisisIds
      .map(id => this.crises.get(id))
      .filter((c): c is Crisis => c !== undefined);

    const similarities: string[] = [];
    const differences: string[] = [];
    const lessons: string[] = [];
    const applicableStrategies: string[] = [];

    if (crises.length < 2) {
      return { crises, similarities, differences, lessons, applicableStrategies };
    }

    // Find similarities
    const types = new Set(crises.map(c => c.type));
    if (types.size === 1) {
      similarities.push(`All crises are of type: ${Array.from(types)[0]}`);
    }

    const scopes = new Set(crises.map(c => c.scope));
    if (scopes.size === 1) {
      similarities.push(`Similar scope: ${Array.from(scopes)[0]}`);
    }

    // Check for common mediation approaches
    const mediationTypes = new Set(
      crises.flatMap(c => c.mediationEfforts.map(m => m.type))
    );
    if (mediationTypes.size > 0) {
      similarities.push(`Common mediation approaches: ${Array.from(mediationTypes).join(', ')}`);
    }

    // Find differences
    const escalationLevels = new Set(crises.map(c => c.escalationLevel));
    if (escalationLevels.size > 1) {
      differences.push(`Varying escalation levels: ${Array.from(escalationLevels).join(', ')}`);
    }

    // Extract lessons from resolved crises
    for (const crisis of crises) {
      if (crisis.phase === CrisisPhase.RESOLVED) {
        if (crisis.successFactors) {
          lessons.push(...crisis.successFactors);
        }
      }
    }

    // Identify applicable strategies from successful mediations
    for (const crisis of crises) {
      for (const mediation of crisis.mediationEfforts) {
        if (mediation.status === 'CONCLUDED' && mediation.outcomes) {
          applicableStrategies.push(`${mediation.type}: ${mediation.outcomes.join(', ')}`);
        }
      }
    }

    return {
      crises,
      similarities,
      differences,
      lessons: Array.from(new Set(lessons)),
      applicableStrategies: Array.from(new Set(applicableStrategies))
    };
  }

  /**
   * Generate early warning assessment
   */
  generateEarlyWarning(indicators: EarlyWarningIndicator[]): {
    overallThreatLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
    criticalIndicators: EarlyWarningIndicator[];
    deterioratingIndicators: EarlyWarningIndicator[];
    recommendations: string[];
  } {
    const criticalIndicators = indicators.filter(i => i.urgency === 'CRITICAL' || i.urgency === 'HIGH');
    const deterioratingIndicators = indicators.filter(i => i.trend === 'DETERIORATING');

    let overallThreatLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' = 'LOW';
    const criticalCount = criticalIndicators.length;
    const deterioratingCount = deterioratingIndicators.length;

    if (criticalCount >= 3 || deterioratingCount >= 5) {
      overallThreatLevel = 'SEVERE';
    } else if (criticalCount >= 2 || deterioratingCount >= 3) {
      overallThreatLevel = 'HIGH';
    } else if (criticalCount >= 1 || deterioratingCount >= 2) {
      overallThreatLevel = 'MODERATE';
    }

    const recommendations: string[] = [];
    if (overallThreatLevel === 'SEVERE' || overallThreatLevel === 'HIGH') {
      recommendations.push('Immediate diplomatic engagement required');
      recommendations.push('Activate crisis response mechanisms');
      recommendations.push('Engage regional and international partners');
    }

    if (deterioratingCount > 0) {
      recommendations.push('Monitor deteriorating indicators closely');
      recommendations.push('Prepare contingency plans');
    }

    return {
      overallThreatLevel,
      criticalIndicators,
      deterioratingIndicators,
      recommendations
    };
  }

  private generateMitigationOptions(crisis: Crisis, risks: EscalationRisk[]): string[] {
    const options: string[] = [];

    options.push('Establish direct communication channels between parties');
    options.push('Deploy preventive diplomacy measures');

    if (crisis.mediationEfforts.length === 0) {
      options.push('Initiate third-party mediation');
    }

    if (crisis.ceasefires.length === 0) {
      options.push('Negotiate humanitarian ceasefire');
    }

    for (const risk of risks.slice(0, 3)) {
      if (risk.mitigation) {
        options.push(...risk.mitigation);
      }
    }

    return Array.from(new Set(options)).slice(0, 8);
  }

  private generateMediationRecommendations(effort: MediationEffort, score: number): string[] {
    const recommendations: string[] = [];

    if (effort.factors.mediatorCredibility < 60) {
      recommendations.push('Strengthen mediator credibility through coalition building');
    }

    if (effort.factors.partyWillingness < 60) {
      recommendations.push('Build confidence through incremental agreements');
    }

    if (effort.factors.externalSupport < 60) {
      recommendations.push('Mobilize international support and guarantees');
    }

    if (score < 50) {
      recommendations.push('Consider alternative mediation approaches');
    }

    if (effort.setbacks && effort.setbacks.length > 2) {
      recommendations.push('Review strategy and address recurring obstacles');
    }

    return recommendations;
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalCrises: number;
    activeCrises: number;
    byPhase: Record<string, number>;
    byType: Record<string, number>;
    averageIntensity: number;
    criticalCrises: number;
  } {
    const byPhase: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let totalIntensity = 0;
    let criticalCount = 0;

    for (const crisis of this.crises.values()) {
      byPhase[crisis.phase] = (byPhase[crisis.phase] || 0) + 1;
      byType[crisis.type] = (byType[crisis.type] || 0) + 1;
      totalIntensity += crisis.intensity;

      if (crisis.escalationLevel === EscalationLevel.CRITICAL ||
          crisis.escalationLevel === EscalationLevel.MAXIMUM) {
        criticalCount++;
      }
    }

    const activeCrises = this.getActiveCrises();

    return {
      totalCrises: this.crises.size,
      activeCrises: activeCrises.length,
      byPhase,
      byType,
      averageIntensity: this.crises.size > 0 ? totalIntensity / this.crises.size : 0,
      criticalCrises: criticalCount
    };
  }
}
