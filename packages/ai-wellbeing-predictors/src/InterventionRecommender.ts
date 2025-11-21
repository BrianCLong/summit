import { randomUUID } from 'crypto';
import {
  WellbeingPrediction,
  InterventionRecommendation,
  InterventionType,
  WellbeingDomain,
  RiskLevel,
} from './types.js';

interface InterventionTemplate {
  type: InterventionType;
  targetDomains: WellbeingDomain[];
  programs: string[];
  baseCost: number;
  staffHours: number;
  duration: string;
}

const INTERVENTION_TEMPLATES: Record<string, InterventionTemplate> = {
  housing_crisis: {
    type: 'immediate_crisis',
    targetDomains: ['housing'],
    programs: ['Emergency Shelter', 'Rapid Rehousing', 'Housing Voucher Program'],
    baseCost: 5000,
    staffHours: 40,
    duration: '30 days',
  },
  food_assistance: {
    type: 'resource_allocation',
    targetDomains: ['food_security', 'health'],
    programs: ['SNAP Enrollment', 'Food Bank Referral', 'Nutrition Education'],
    baseCost: 500,
    staffHours: 4,
    duration: '90 days',
  },
  employment_support: {
    type: 'skills_training',
    targetDomains: ['employment', 'economic', 'educational'],
    programs: ['Job Training', 'Resume Workshop', 'Career Counseling', 'GED Program'],
    baseCost: 2000,
    staffHours: 20,
    duration: '120 days',
  },
  mental_health_crisis: {
    type: 'immediate_crisis',
    targetDomains: ['mental_health', 'health'],
    programs: ['Crisis Hotline', 'Emergency Counseling', 'Psychiatric Evaluation'],
    baseCost: 1500,
    staffHours: 8,
    duration: '7 days',
  },
  mental_health_support: {
    type: 'case_management',
    targetDomains: ['mental_health', 'social'],
    programs: ['Therapy Referral', 'Support Group', 'Medication Management'],
    baseCost: 1200,
    staffHours: 12,
    duration: '180 days',
  },
  healthcare_access: {
    type: 'program_enrollment',
    targetDomains: ['health'],
    programs: ['Medicaid Enrollment', 'Community Health Center', 'Prescription Assistance'],
    baseCost: 300,
    staffHours: 6,
    duration: '60 days',
  },
  social_connection: {
    type: 'community_connection',
    targetDomains: ['social', 'mental_health'],
    programs: ['Community Center Programs', 'Senior Services', 'Peer Support Network'],
    baseCost: 200,
    staffHours: 8,
    duration: '90 days',
  },
  digital_literacy: {
    type: 'skills_training',
    targetDomains: ['educational'],
    programs: ['Computer Classes', 'Digital Skills Workshop', 'Library Programs'],
    baseCost: 400,
    staffHours: 10,
    duration: '60 days',
  },
  preventive_health: {
    type: 'health_screening',
    targetDomains: ['health'],
    programs: ['Annual Checkup', 'Chronic Disease Management', 'Vaccination Program'],
    baseCost: 500,
    staffHours: 4,
    duration: '30 days',
  },
  economic_stability: {
    type: 'case_management',
    targetDomains: ['economic', 'housing'],
    programs: ['Financial Counseling', 'Benefits Enrollment', 'Utility Assistance'],
    baseCost: 800,
    staffHours: 16,
    duration: '90 days',
  },
};

/**
 * Generates intervention recommendations based on wellbeing predictions
 */
export class InterventionRecommender {
  private validityDays: number;

  constructor(validityDays: number = 30) {
    this.validityDays = validityDays;
  }

  /**
   * Generate intervention recommendations for a prediction
   */
  recommend(prediction: WellbeingPrediction): InterventionRecommendation[] {
    const recommendations: InterventionRecommendation[] = [];
    const lowScoreDomains = this.identifyLowScoreDomains(prediction);
    const contributingFactors = prediction.contributingFactors;

    // Generate recommendations based on risk level and domains
    for (const domain of lowScoreDomains) {
      const intervention = this.selectIntervention(
        domain,
        prediction.riskLevel,
        contributingFactors
      );
      if (intervention) {
        recommendations.push(
          this.createRecommendation(prediction, intervention, domain)
        );
      }
    }

    // Add crisis intervention if critical risk
    if (prediction.riskLevel === 'critical') {
      const crisisIntervention = this.getCrisisIntervention(prediction);
      if (crisisIntervention) {
        recommendations.unshift(crisisIntervention);
      }
    }

    // Sort by priority and deduplicate
    return this.prioritizeAndDeduplicate(recommendations);
  }

  /**
   * Batch recommendations for multiple predictions
   */
  recommendBatch(
    predictions: WellbeingPrediction[]
  ): Map<string, InterventionRecommendation[]> {
    const results = new Map<string, InterventionRecommendation[]>();
    for (const prediction of predictions) {
      results.set(prediction.citizenId, this.recommend(prediction));
    }
    return results;
  }

  /**
   * Get population-level intervention priorities
   */
  getPopulationPriorities(
    predictions: WellbeingPrediction[]
  ): Array<{ domain: WellbeingDomain; affectedCount: number; avgScore: number; priority: string }> {
    const domainStats = new Map<WellbeingDomain, { total: number; count: number }>();

    for (const prediction of predictions) {
      for (const [domain, score] of Object.entries(prediction.domainScores)) {
        const current = domainStats.get(domain as WellbeingDomain) || { total: 0, count: 0 };
        current.total += score;
        current.count++;
        domainStats.set(domain as WellbeingDomain, current);
      }
    }

    const priorities = Array.from(domainStats.entries())
      .map(([domain, stats]) => ({
        domain,
        affectedCount: predictions.filter(
          (p) => p.domainScores[domain] < 50
        ).length,
        avgScore: Math.round(stats.total / stats.count),
        priority: this.determineDomainPriority(stats.total / stats.count),
      }))
      .sort((a, b) => a.avgScore - b.avgScore);

    return priorities;
  }

  private identifyLowScoreDomains(prediction: WellbeingPrediction): WellbeingDomain[] {
    return (Object.entries(prediction.domainScores) as [WellbeingDomain, number][])
      .filter(([, score]) => score < 50)
      .sort((a, b) => a[1] - b[1])
      .map(([domain]) => domain);
  }

  private selectIntervention(
    domain: WellbeingDomain,
    riskLevel: RiskLevel,
    _factors: WellbeingPrediction['contributingFactors']
  ): InterventionTemplate | null {
    const templateMap: Partial<Record<WellbeingDomain, string>> = {
      housing: 'housing_crisis',
      food_security: 'food_assistance',
      employment: 'employment_support',
      mental_health: riskLevel === 'critical' ? 'mental_health_crisis' : 'mental_health_support',
      health: 'healthcare_access',
      social: 'social_connection',
      educational: 'digital_literacy',
      economic: 'economic_stability',
    };

    const templateKey = templateMap[domain];
    return templateKey ? INTERVENTION_TEMPLATES[templateKey] : null;
  }

  private createRecommendation(
    prediction: WellbeingPrediction,
    template: InterventionTemplate,
    primaryDomain: WellbeingDomain
  ): InterventionRecommendation {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.validityDays * 24 * 60 * 60 * 1000);

    return {
      recommendationId: randomUUID(),
      citizenId: prediction.citizenId,
      predictionId: prediction.predictionId,
      interventionType: template.type,
      priority: this.mapRiskToPriority(prediction.riskLevel),
      targetDomains: template.targetDomains,
      suggestedPrograms: template.programs,
      estimatedImpact: this.estimateImpact(prediction, primaryDomain),
      resourceRequirements: {
        estimatedCost: template.baseCost,
        staffHours: template.staffHours,
        duration: template.duration,
      },
      rationale: this.generateRationale(prediction, primaryDomain, template),
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  }

  private getCrisisIntervention(
    prediction: WellbeingPrediction
  ): InterventionRecommendation | null {
    const lowestDomain = this.identifyLowScoreDomains(prediction)[0];
    if (!lowestDomain) return null;

    const now = new Date();
    return {
      recommendationId: randomUUID(),
      citizenId: prediction.citizenId,
      predictionId: prediction.predictionId,
      interventionType: 'immediate_crisis',
      priority: 'urgent',
      targetDomains: [lowestDomain],
      suggestedPrograms: ['Crisis Response Team', 'Emergency Services Coordination'],
      estimatedImpact: 30,
      resourceRequirements: {
        estimatedCost: 3000,
        staffHours: 24,
        duration: '48 hours',
      },
      rationale: `Critical risk level detected with ${lowestDomain} domain at ${prediction.domainScores[lowestDomain]}%. Immediate intervention required.`,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  private mapRiskToPriority(risk: RiskLevel): 'urgent' | 'high' | 'medium' | 'low' {
    const mapping: Record<RiskLevel, 'urgent' | 'high' | 'medium' | 'low'> = {
      critical: 'urgent',
      high: 'high',
      moderate: 'medium',
      low: 'low',
      minimal: 'low',
    };
    return mapping[risk];
  }

  private estimateImpact(prediction: WellbeingPrediction, domain: WellbeingDomain): number {
    const currentScore = prediction.domainScores[domain];
    const potentialGain = 100 - currentScore;
    // Estimate 30-60% improvement potential based on intervention
    return Math.round(potentialGain * (0.3 + Math.random() * 0.3));
  }

  private generateRationale(
    prediction: WellbeingPrediction,
    domain: WellbeingDomain,
    template: InterventionTemplate
  ): string {
    const score = prediction.domainScores[domain];
    return `${domain.replace('_', ' ')} domain score of ${score}% indicates need for ${template.type.replace('_', ' ')} intervention. ` +
      `Recommended programs target ${template.targetDomains.join(', ')} with expected improvement within ${template.duration}.`;
  }

  private determineDomainPriority(avgScore: number): string {
    if (avgScore < 30) return 'critical';
    if (avgScore < 50) return 'high';
    if (avgScore < 70) return 'moderate';
    return 'low';
  }

  private prioritizeAndDeduplicate(
    recommendations: InterventionRecommendation[]
  ): InterventionRecommendation[] {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    const seen = new Set<string>();

    return recommendations
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      .filter((rec) => {
        const key = `${rec.interventionType}-${rec.targetDomains.sort().join(',')}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }
}
