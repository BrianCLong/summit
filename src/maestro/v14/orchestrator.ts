/**
 * Program Orchestrator - Aligns agents to program-level OKRs and budgets
 */

import { EventEmitter } from 'events';

export interface OKRMapping {
  filePattern: RegExp;
  okrId: string;
  weight: number;
}

export interface BudgetEnvelope {
  llmUSD: number;
  ciMinutes: number;
  carbonGCO2e: number;
  weeklySpent: {
    llmUSD: number;
    ciMinutes: number;
    carbonGCO2e: number;
  };
}

export interface OKRRegistry {
  [okrId: string]: {
    id: string;
    objective: string;
    keyResults: Array<{
      id: string;
      metric: string;
      targetRel?: number;
      targetAbs?: number;
      current?: number;
    }>;
    progress: number;
  };
}

export class ProgramOrchestrator extends EventEmitter {
  private okrRegistry: OKRRegistry = {};
  private okrMappings: OKRMapping[] = [];
  private budgetEnvelope: BudgetEnvelope;
  private historicalData: Map<string, number[]> = new Map();

  constructor(config: any) {
    super();
    this.budgetEnvelope = {
      llmUSD: config.budgets.llmUSD,
      ciMinutes: config.budgets.ciMinutes,
      carbonGCO2e: config.budgets.carbonGCO2e,
      weeklySpent: { llmUSD: 0, ciMinutes: 0, carbonGCO2e: 0 },
    };

    this.initializeOKRs();
    this.initializeMappings();
  }

  private initializeOKRs(): void {
    // Initialize default OKRs
    this.okrRegistry = {
      'OKR-Q3-LATENCY': {
        id: 'OKR-Q3-LATENCY',
        objective: 'Reduce p95 API latency by 20%',
        keyResults: [
          {
            id: 'KR1',
            metric: 'api_p95_ms',
            targetRel: -0.2,
            current: 250,
          },
          {
            id: 'KR2',
            metric: 'cache_hit_rate',
            targetAbs: 0.96,
            current: 0.91,
          },
        ],
        progress: 0.45,
      },
      'OKR-QA-ROBUST': {
        id: 'OKR-QA-ROBUST',
        objective: 'Improve test robustness by 15%',
        keyResults: [
          {
            id: 'KR1',
            metric: 'flake_rate',
            targetRel: -0.15,
            current: 0.08,
          },
          {
            id: 'KR2',
            metric: 'mutation_score',
            targetAbs: 0.75,
            current: 0.68,
          },
        ],
        progress: 0.6,
      },
      'OKR-SEC-POSTURE': {
        id: 'OKR-SEC-POSTURE',
        objective: 'Reduce security backlog by 30%',
        keyResults: [
          {
            id: 'KR1',
            metric: 'critical_vulns',
            targetAbs: 0,
            current: 3,
          },
          {
            id: 'KR2',
            metric: 'policy_violations',
            targetRel: -0.3,
            current: 12,
          },
        ],
        progress: 0.25,
      },
    };
  }

  private initializeMappings(): void {
    // OKR mapping rules
    this.okrMappings = [
      { filePattern: /server\/api\//, okrId: 'OKR-Q3-LATENCY', weight: 1.0 },
      { filePattern: /tests\//, okrId: 'OKR-QA-ROBUST', weight: 1.0 },
      {
        filePattern: /security\/|auth\//,
        okrId: 'OKR-SEC-POSTURE',
        weight: 1.0,
      },
      { filePattern: /policy\//, okrId: 'OKR-SEC-POSTURE', weight: 0.8 },
      { filePattern: /cache\//, okrId: 'OKR-Q3-LATENCY', weight: 0.6 },
    ];
  }

  /**
   * Map files to relevant OKRs
   */
  async mapToOKRs(files: string[]): Promise<string[]> {
    const okrSet = new Set<string>();

    for (const file of files) {
      for (const mapping of this.okrMappings) {
        if (mapping.filePattern.test(file)) {
          okrSet.add(mapping.okrId);
        }
      }
    }

    const okrs = Array.from(okrSet);

    // Emit OKR update events
    for (const okr of okrs) {
      const impact = await this.calculateOKRImpact(okr, files);
      this.emit('okrUpdate', okr, impact);
    }

    return okrs;
  }

  /**
   * Check if changes are within budget envelope
   */
  async checkBudgetEnvelope(
    okrMappings: string[],
  ): Promise<{ approved: boolean; reason?: string }> {
    // Calculate estimated cost for this PR
    const estimatedCost = this.estimatePRCost(okrMappings);

    // Check budget constraints
    if (
      this.budgetEnvelope.weeklySpent.llmUSD + estimatedCost.llmUSD >
      this.budgetEnvelope.llmUSD
    ) {
      return {
        approved: false,
        reason: `LLM budget exceeded: ${this.budgetEnvelope.weeklySpent.llmUSD + estimatedCost.llmUSD} > ${this.budgetEnvelope.llmUSD}`,
      };
    }

    if (
      this.budgetEnvelope.weeklySpent.ciMinutes + estimatedCost.ciMinutes >
      this.budgetEnvelope.ciMinutes
    ) {
      return {
        approved: false,
        reason: `CI budget exceeded: ${this.budgetEnvelope.weeklySpent.ciMinutes + estimatedCost.ciMinutes} > ${this.budgetEnvelope.ciMinutes}`,
      };
    }

    if (
      this.budgetEnvelope.weeklySpent.carbonGCO2e + estimatedCost.carbonGCO2e >
      this.budgetEnvelope.carbonGCO2e
    ) {
      return {
        approved: false,
        reason: `Carbon budget exceeded: ${this.budgetEnvelope.weeklySpent.carbonGCO2e + estimatedCost.carbonGCO2e} > ${this.budgetEnvelope.carbonGCO2e}`,
      };
    }

    // Calculate value-weighted priority
    const valueScore = await this.calculateValueScore(okrMappings);
    const idleBudget = this.calculateIdleBudget();

    if (idleBudget > 0.03) {
      // 3% idle budget threshold
      return {
        approved: false,
        reason: `High idle budget detected: ${(idleBudget * 100).toFixed(1)}% - prioritizing higher value work`,
      };
    }

    return { approved: true };
  }

  private estimatePRCost(okrMappings: string[]): {
    llmUSD: number;
    ciMinutes: number;
    carbonGCO2e: number;
  } {
    // Base costs
    let llmUSD = 0.33; // Target: ≤ $0.33
    let ciMinutes = 12;
    let carbonGCO2e = 0.8;

    // Adjust based on OKR complexity
    for (const okr of okrMappings) {
      const registry = this.okrRegistry[okr];
      if (registry) {
        // More complex OKRs require more resources
        const complexityMultiplier = 1 + (1 - registry.progress) * 0.2;
        llmUSD *= complexityMultiplier;
        ciMinutes *= complexityMultiplier;
        carbonGCO2e *= complexityMultiplier;
      }
    }

    return { llmUSD, ciMinutes, carbonGCO2e };
  }

  private async calculateOKRImpact(
    okr: string,
    files: string[],
  ): Promise<number> {
    const registry = this.okrRegistry[okr];
    if (!registry) return 0;

    // Calculate impact based on file changes and OKR progress
    const relevantFiles = files.filter((f) =>
      this.okrMappings.some((m) => m.okrId === okr && m.filePattern.test(f)),
    );

    const impact = relevantFiles.length * 0.02 * (1 - registry.progress);
    return Math.min(0.1, impact); // Cap at 10% impact
  }

  private async calculateValueScore(okrMappings: string[]): Promise<number> {
    let totalValue = 0;

    for (const okr of okrMappings) {
      const registry = this.okrRegistry[okr];
      if (registry) {
        // Value = progress potential * business impact
        const progressPotential = 1 - registry.progress;
        const businessImpact = registry.keyResults.length * 0.3; // Mock business impact
        totalValue += progressPotential * businessImpact;
      }
    }

    return totalValue;
  }

  private calculateIdleBudget(): number {
    const utilization = {
      llm: this.budgetEnvelope.weeklySpent.llmUSD / this.budgetEnvelope.llmUSD,
      ci:
        this.budgetEnvelope.weeklySpent.ciMinutes /
        this.budgetEnvelope.ciMinutes,
      carbon:
        this.budgetEnvelope.weeklySpent.carbonGCO2e /
        this.budgetEnvelope.carbonGCO2e,
    };

    const avgUtilization =
      (utilization.llm + utilization.ci + utilization.carbon) / 3;
    return Math.max(0, 1 - avgUtilization);
  }

  /**
   * Get historical OKR impact for value estimation
   */
  async getHistoricalOKRImpact(okr: string): Promise<number> {
    const history = this.historicalData.get(okr) || [];
    if (history.length === 0) return 0.05; // Default impact

    return history.reduce((sum, val) => sum + val, 0) / history.length;
  }

  /**
   * Update budget spending
   */
  updateBudgetSpending(spent: {
    llmUSD?: number;
    ciMinutes?: number;
    carbonGCO2e?: number;
  }): void {
    if (spent.llmUSD) this.budgetEnvelope.weeklySpent.llmUSD += spent.llmUSD;
    if (spent.ciMinutes)
      this.budgetEnvelope.weeklySpent.ciMinutes += spent.ciMinutes;
    if (spent.carbonGCO2e)
      this.budgetEnvelope.weeklySpent.carbonGCO2e += spent.carbonGCO2e;
  }

  /**
   * Get current budget utilization
   */
  async getBudgetUtilization(): Promise<Record<string, number>> {
    return {
      llmUtilization:
        this.budgetEnvelope.weeklySpent.llmUSD / this.budgetEnvelope.llmUSD,
      ciUtilization:
        this.budgetEnvelope.weeklySpent.ciMinutes /
        this.budgetEnvelope.ciMinutes,
      carbonUtilization:
        this.budgetEnvelope.weeklySpent.carbonGCO2e /
        this.budgetEnvelope.carbonGCO2e,
      idleBudget: this.calculateIdleBudget(),
    };
  }

  /**
   * Get OKR registry
   */
  getOKRRegistry(): OKRRegistry {
    return this.okrRegistry;
  }

  /**
   * Update OKR progress
   */
  updateOKRProgress(okrId: string, progress: number): void {
    if (this.okrRegistry[okrId]) {
      this.okrRegistry[okrId].progress = Math.min(1, Math.max(0, progress));
      this.emit('okrProgressUpdated', okrId, progress);
    }
  }
}

export default ProgramOrchestrator;
