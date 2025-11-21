// Simple UUID v4 generator for cross-platform compatibility
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
import {
  WellbeingPrediction,
  ResourceAllocation,
  WellbeingDomain,
  CohortAnalysis,
  RiskLevel,
} from './types.js';

interface AllocationConfig {
  minAllocationPercent: number;
  maxAllocationPercent: number;
  reservePercent: number;
}

const DEFAULT_CONFIG: AllocationConfig = {
  minAllocationPercent: 0.05,
  maxAllocationPercent: 0.35,
  reservePercent: 0.10,
};

/**
 * AI-driven resource allocation optimizer for citizen wellbeing programs
 */
export class ResourceAllocator {
  private config: AllocationConfig;

  constructor(config: Partial<AllocationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate optimal resource allocation for a region
   */
  allocate(
    predictions: WellbeingPrediction[],
    totalBudget: number,
    region: string
  ): ResourceAllocation {
    const availableBudget = totalBudget * (1 - this.config.reservePercent);
    const domainNeeds = this.calculateDomainNeeds(predictions);
    const allocations = this.optimizeAllocation(domainNeeds, availableBudget);
    const populationAtRisk = predictions.filter(
      (p) => p.riskLevel === 'critical' || p.riskLevel === 'high'
    ).length;

    return {
      allocationId: generateUUID(),
      region,
      timestamp: new Date().toISOString(),
      totalBudget,
      allocations,
      populationAtRisk,
      projectedImpact: {
        citizensServed: this.estimateCitizensServed(predictions, allocations),
        wellbeingImprovement: this.estimateWellbeingImprovement(predictions, allocations),
      },
    };
  }

  /**
   * Analyze a cohort of citizens
   */
  analyzeCohort(
    predictions: WellbeingPrediction[],
    criteria: Record<string, unknown>
  ): CohortAnalysis {
    const avgScore =
      predictions.reduce((sum, p) => sum + p.overallWellbeingScore, 0) /
      predictions.length;

    const riskDistribution = this.calculateRiskDistribution(predictions);
    const topRiskFactors = this.aggregateRiskFactors(predictions);
    const interventions = this.identifyTopInterventions(predictions);

    return {
      cohortId: generateUUID(),
      criteria,
      populationSize: predictions.length,
      averageWellbeingScore: Math.round(avgScore * 100) / 100,
      riskDistribution,
      topRiskFactors,
      recommendedInterventions: interventions,
      projectedOutcomes: {
        withIntervention: Math.min(100, avgScore + 15),
        withoutIntervention: Math.max(0, avgScore - 5),
      },
    };
  }

  /**
   * Compare allocation scenarios
   */
  compareScenarios(
    predictions: WellbeingPrediction[],
    budgets: number[],
    region: string
  ): ResourceAllocation[] {
    return budgets.map((budget) => this.allocate(predictions, budget, region));
  }

  private calculateDomainNeeds(
    predictions: WellbeingPrediction[]
  ): Map<WellbeingDomain, { avgScore: number; atRiskCount: number; severity: number }> {
    const needs = new Map<WellbeingDomain, { totalScore: number; count: number; atRisk: number }>();

    for (const prediction of predictions) {
      for (const [domain, score] of Object.entries(prediction.domainScores) as [WellbeingDomain, number][]) {
        const current = needs.get(domain) || { totalScore: 0, count: 0, atRisk: 0 };
        current.totalScore += score;
        current.count++;
        if (score < 50) current.atRisk++;
        needs.set(domain, current);
      }
    }

    const result = new Map<WellbeingDomain, { avgScore: number; atRiskCount: number; severity: number }>();
    for (const [domain, stats] of needs) {
      const avgScore = stats.totalScore / stats.count;
      result.set(domain, {
        avgScore,
        atRiskCount: stats.atRisk,
        severity: (100 - avgScore) * (stats.atRisk / stats.count),
      });
    }

    return result;
  }

  private optimizeAllocation(
    needs: Map<WellbeingDomain, { avgScore: number; atRiskCount: number; severity: number }>,
    budget: number
  ): ResourceAllocation['allocations'] {
    const totalSeverity = Array.from(needs.values()).reduce((sum, n) => sum + n.severity, 0);
    const allocations: ResourceAllocation['allocations'] = [];

    for (const [domain, stats] of needs) {
      const rawPercent = totalSeverity > 0 ? stats.severity / totalSeverity : 1 / needs.size;
      const percent = Math.max(
        this.config.minAllocationPercent,
        Math.min(this.config.maxAllocationPercent, rawPercent)
      );
      const amount = Math.round(budget * percent);

      allocations.push({
        domain,
        amount,
        rationale: this.generateAllocationRationale(domain, stats, percent),
        expectedOutcomes: this.generateExpectedOutcomes(domain, stats.atRiskCount),
      });
    }

    return allocations.sort((a, b) => b.amount - a.amount);
  }

  private generateAllocationRationale(
    domain: WellbeingDomain,
    stats: { avgScore: number; atRiskCount: number; severity: number },
    percent: number
  ): string {
    return `${Math.round(percent * 100)}% allocation for ${domain.replace('_', ' ')} ` +
      `based on avg score of ${Math.round(stats.avgScore)}% and ${stats.atRiskCount} citizens at risk.`;
  }

  private generateExpectedOutcomes(domain: WellbeingDomain, atRiskCount: number): string[] {
    const outcomes: Record<WellbeingDomain, string[]> = {
      health: ['Improved healthcare access', 'Reduced emergency visits', 'Better chronic disease management'],
      economic: ['Increased financial stability', 'Reduced debt burden', 'Improved credit scores'],
      educational: ['Higher literacy rates', 'Increased job readiness', 'Digital skills improvement'],
      social: ['Reduced isolation', 'Stronger community ties', 'Improved support networks'],
      housing: ['Stable housing placements', 'Reduced homelessness', 'Better living conditions'],
      mental_health: ['Reduced crisis incidents', 'Improved mental health scores', 'Better coping skills'],
      food_security: ['Reduced food insecurity', 'Improved nutrition', 'Stable food access'],
      employment: ['Reduced unemployment', 'Higher job retention', 'Increased income levels'],
    };
    return outcomes[domain].slice(0, 2).map((o) => `${o} for ~${Math.round(atRiskCount * 0.6)} citizens`);
  }

  private estimateCitizensServed(
    predictions: WellbeingPrediction[],
    allocations: ResourceAllocation['allocations']
  ): number {
    const totalAllocation = allocations.reduce((sum, a) => sum + a.amount, 0);
    const avgCostPerCitizen = 1500;
    return Math.min(predictions.length, Math.round(totalAllocation / avgCostPerCitizen));
  }

  private estimateWellbeingImprovement(
    predictions: WellbeingPrediction[],
    _allocations: ResourceAllocation['allocations']
  ): number {
    const currentAvg = predictions.reduce((sum, p) => sum + p.overallWellbeingScore, 0) / predictions.length;
    return Math.round(Math.min(100, currentAvg * 1.15) * 100) / 100;
  }

  private calculateRiskDistribution(
    predictions: WellbeingPrediction[]
  ): Record<RiskLevel, number> {
    const distribution: Record<RiskLevel, number> = {
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
      minimal: 0,
    };

    for (const p of predictions) {
      distribution[p.riskLevel]++;
    }

    return distribution;
  }

  private aggregateRiskFactors(
    predictions: WellbeingPrediction[]
  ): CohortAnalysis['topRiskFactors'] {
    const factorMap = new Map<string, { count: number; totalImpact: number }>();

    for (const prediction of predictions) {
      for (const factor of prediction.contributingFactors) {
        const current = factorMap.get(factor.factor) || { count: 0, totalImpact: 0 };
        current.count++;
        current.totalImpact += Math.abs(factor.impact);
        factorMap.set(factor.factor, current);
      }
    }

    return Array.from(factorMap.entries())
      .map(([factor, stats]) => ({
        factor,
        prevalence: stats.count / predictions.length,
        averageImpact: stats.totalImpact / stats.count,
      }))
      .sort((a, b) => b.prevalence * b.averageImpact - a.prevalence * a.averageImpact)
      .slice(0, 10);
  }

  private identifyTopInterventions(predictions: WellbeingPrediction[]): string[] {
    const domainCounts = new Map<WellbeingDomain, number>();

    for (const prediction of predictions) {
      for (const [domain, score] of Object.entries(prediction.domainScores) as [WellbeingDomain, number][]) {
        if (score < 50) {
          domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
        }
      }
    }

    const interventionMap: Record<WellbeingDomain, string> = {
      housing: 'Housing Stability Programs',
      food_security: 'Food Assistance & Nutrition',
      employment: 'Job Training & Placement',
      mental_health: 'Mental Health Services',
      health: 'Healthcare Access Programs',
      social: 'Community Connection Initiatives',
      educational: 'Education & Skills Development',
      economic: 'Financial Stability Support',
    };

    return Array.from(domainCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([domain]) => interventionMap[domain]);
  }
}
