/**
 * Conflict Analyzer - Analysis and risk assessment
 */

import {
  Conflict,
  ConflictAnalysis,
  ConflictStatus,
  IntensityLevel
} from '../types/index.js';

export class ConflictAnalyzer {
  /**
   * Analyze a conflict
   */
  analyzeConflict(conflict: Conflict): ConflictAnalysis {
    return {
      conflictId: conflict.id,
      escalation_risk: this.assessEscalationRisk(conflict),
      spillover_analysis: this.analyzeSpilloverRisk(conflict),
      resolution_prospects: this.assessResolutionProspects(conflict),
      humanitarian_situation: this.assessHumanitarianSituation(conflict),
      recommendations: this.generateRecommendations(conflict)
    };
  }

  /**
   * Assess escalation risk
   */
  private assessEscalationRisk(conflict: Conflict): {
    score: number;
    factors: string[];
    trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  } {
    let score = 0;
    const factors: string[] = [];

    // Status-based risk
    if (conflict.status === ConflictStatus.ESCALATING) {
      score += 30;
      factors.push('Conflict currently escalating');
    }

    // Intensity-based risk
    switch (conflict.intensity) {
      case IntensityLevel.EXTREME:
        score += 40;
        factors.push('Extreme intensity level');
        break;
      case IntensityLevel.HIGH:
        score += 25;
        factors.push('High intensity level');
        break;
      case IntensityLevel.MEDIUM:
        score += 10;
        break;
    }

    // Ceasefire violations
    const recentViolations = conflict.ceasefires
      .flatMap(c => c.violations)
      .filter(v => {
        const daysSince = (Date.now() - v.date.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince <= 30;
      }).length;

    if (recentViolations > 0) {
      score += Math.min(20, recentViolations * 5);
      factors.push(`${recentViolations} ceasefire violations in past 30 days`);
    }

    // Regional instability
    if (conflict.countries.length > 2) {
      score += 15;
      factors.push('Multi-country involvement increases complexity');
    }

    // Failed negotiations
    const failedNegotiations = conflict.negotiations.filter(
      n => n.status === 'FAILED'
    ).length;
    if (failedNegotiations > 0) {
      score += 10;
      factors.push('Recent negotiation failures');
    }

    // Duration factor
    const durationYears = conflict.duration / 365;
    if (durationYears > 5) {
      score += 10;
      factors.push('Protracted conflict (>5 years)');
    }

    // Determine trend
    let trend: 'INCREASING' | 'STABLE' | 'DECREASING' = 'STABLE';
    if (conflict.status === ConflictStatus.ESCALATING) {
      trend = 'INCREASING';
    } else if (conflict.status === ConflictStatus.DE_ESCALATING ||
               conflict.status === ConflictStatus.CEASEFIRE) {
      trend = 'DECREASING';
    }

    return {
      score: Math.min(100, score),
      factors,
      trend
    };
  }

  /**
   * Analyze spillover risk
   */
  private analyzeSpilloverRisk(conflict: Conflict): {
    at_risk_countries: string[];
    probability: number;
    pathways: string[];
  } {
    const at_risk_countries: string[] = [];
    const pathways: string[] = [];
    let probability = 0;

    // Neighboring countries at risk
    // (In production, this would use geographic/political data)
    at_risk_countries.push(...conflict.countries.map(c => `${c}_NEIGHBORS`));

    // Displacement-based spillover
    if (conflict.displacement.refugees > 100000) {
      probability += 0.3;
      pathways.push('Large refugee flows to neighboring countries');
    }

    // Alliance-based spillover
    if (conflict.allies.length > 0) {
      probability += 0.2;
      pathways.push('Military alliances may draw in additional parties');
    }

    // Separatist movements
    if (conflict.type === 'SEPARATIST_MOVEMENT') {
      probability += 0.15;
      pathways.push('Separatist movements can inspire similar movements');
    }

    // Border conflicts
    if (conflict.type === 'BORDER_CONFLICT') {
      probability += 0.2;
      pathways.push('Border conflicts directly involve multiple countries');
    }

    // Resource scarcity
    if (conflict.tags.includes('resources') || conflict.tags.includes('water')) {
      probability += 0.15;
      pathways.push('Resource conflicts affect broader region');
    }

    return {
      at_risk_countries,
      probability: Math.min(1, probability),
      pathways
    };
  }

  /**
   * Assess resolution prospects
   */
  private assessResolutionProspects(conflict: Conflict): {
    likelihood: number;
    timeframe: string;
    requirements: string[];
  } {
    let likelihood = 0.3; // Base likelihood
    const requirements: string[] = [];

    // Active negotiations improve prospects
    const activeNegotiations = conflict.negotiations.filter(
      n => n.status === 'ONGOING'
    ).length;
    if (activeNegotiations > 0) {
      likelihood += 0.2;
      requirements.push('Continue active negotiations');
    } else {
      requirements.push('Initiate peace negotiations');
    }

    // Ceasefire in place
    const activeCeasefire = conflict.ceasefires.find(
      c => c.status === 'ACTIVE'
    );
    if (activeCeasefire) {
      likelihood += 0.2;
      requirements.push('Maintain ceasefire compliance');
    } else {
      requirements.push('Establish ceasefire agreement');
    }

    // Peace agreement exists
    if (conflict.peaceAgreements.length > 0) {
      likelihood += 0.15;
      requirements.push('Implement peace agreement provisions');
    } else {
      requirements.push('Negotiate comprehensive peace agreement');
    }

    // International mediation
    const hasMediators = conflict.negotiations.some(
      n => n.mediators.length > 0
    );
    if (hasMediators) {
      likelihood += 0.1;
    } else {
      requirements.push('Engage international mediators');
    }

    // De-escalating status
    if (conflict.status === ConflictStatus.DE_ESCALATING) {
      likelihood += 0.15;
    }

    // Determine timeframe
    let timeframe: string;
    if (likelihood > 0.7) {
      timeframe = '6-12 months';
    } else if (likelihood > 0.5) {
      timeframe = '1-2 years';
    } else if (likelihood > 0.3) {
      timeframe = '2-5 years';
    } else {
      timeframe = '>5 years';
    }

    requirements.push('Address root causes of conflict');
    requirements.push('Build trust between parties');
    requirements.push('Ensure accountability and justice mechanisms');

    return {
      likelihood: Math.min(1, likelihood),
      timeframe,
      requirements
    };
  }

  /**
   * Assess humanitarian situation
   */
  private assessHumanitarianSituation(conflict: Conflict): {
    severity: 'STABLE' | 'DETERIORATING' | 'CRITICAL';
    needs: string[];
    access_constraints: string[];
  } {
    const needs: string[] = [];
    const access_constraints: string[] = [];
    let severity: 'STABLE' | 'DETERIORATING' | 'CRITICAL' = 'STABLE';

    // Assess based on displacement
    if (conflict.displacement.internally_displaced > 1000000) {
      severity = 'CRITICAL';
      needs.push('Emergency shelter and supplies');
    } else if (conflict.displacement.internally_displaced > 100000) {
      severity = 'DETERIORATING';
      needs.push('Humanitarian assistance');
    }

    // Assess based on casualties
    if (conflict.casualties.civilian.killed > 10000) {
      severity = 'CRITICAL';
      needs.push('Emergency medical care');
    }

    // Active combat zones
    if (conflict.status === ConflictStatus.ACTIVE ||
        conflict.status === ConflictStatus.ESCALATING) {
      access_constraints.push('Active combat zones limit access');
      needs.push('Humanitarian corridors');
    }

    // Standard needs
    needs.push('Food and water supplies');
    needs.push('Medical supplies and healthcare');
    needs.push('Protection services');

    if (conflict.duration > 365) {
      needs.push('Long-term development assistance');
      needs.push('Education services');
    }

    return {
      severity,
      needs,
      access_constraints
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(conflict: Conflict): string[] {
    const recommendations: string[] = [];

    // High-risk conflicts
    if (conflict.riskScore >= 70) {
      recommendations.push('Activate crisis management protocols');
      recommendations.push('Increase monitoring to real-time');
      recommendations.push('Alert senior decision-makers');
    }

    // Escalating conflicts
    if (conflict.status === ConflictStatus.ESCALATING) {
      recommendations.push('Engage diplomatic channels immediately');
      recommendations.push('Support de-escalation efforts');
      recommendations.push('Prepare contingency plans');
    }

    // No active negotiations
    if (!conflict.negotiations.some(n => n.status === 'ONGOING')) {
      recommendations.push('Encourage peace negotiations');
      recommendations.push('Offer mediation support');
    }

    // Humanitarian crisis
    if (conflict.displacement.refugees + conflict.displacement.internally_displaced > 100000) {
      recommendations.push('Scale up humanitarian assistance');
      recommendations.push('Support refugee hosting countries');
    }

    // Economic impact
    if (conflict.economicImpact.gdp_loss_percent > 10) {
      recommendations.push('Assess economic exposure and risks');
      recommendations.push('Develop economic recovery plans');
    }

    recommendations.push('Continue monitoring situation closely');
    recommendations.push('Coordinate with international partners');

    return recommendations;
  }
}
