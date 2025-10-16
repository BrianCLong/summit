// Maestro Conductor v0.4 - Main orchestration engine with risk-aware autonomous release train

import { RiskScorer } from './risk/scorer';
import { CapabilityRouter } from './routing/capability-router';
import { CriticAgent } from './agents/critic';
import { FixerAgent } from './agents/fixer';
import { PolicyEngine } from './policy/engine';
import { BuildGraph } from './build/graph';
import { TestSharding } from './testing/sharding';
import { Provenance } from './security/provenance';

export interface MaestroV4Config {
  targetMetrics: {
    ciP95WallClock: number; // ≤ 10.6m (25% reduction from v0.3)
    cacheHitRate: number; // ≥ 85%
    flakeRate: number; // < 0.5%
    autonomousPRsPerWeek: number; // ≥ 20
    reviewerOverride: number; // < 10%
    llmCostPerPR: number; // ≤ $2.24 (35% reduction)
    promptCacheHitRate: number; // ≥ 60%
  };
  budgetLimits: {
    maxUsdPerPR: number;
    maxPromptTokens: number;
  };
  riskThresholds: {
    requireReviewer: number; // ≥ 0.70
    warnLevel: number;
  };
}

export class MaestroConductorV4 {
  private riskScorer: RiskScorer;
  private capabilityRouter: CapabilityRouter;
  private criticAgent: CriticAgent;
  private fixerAgent: FixerAgent;
  private policyEngine: PolicyEngine;
  private buildGraph: BuildGraph;
  private testSharding: TestSharding;
  private provenance: Provenance;

  constructor(private config: MaestroV4Config) {
    this.riskScorer = new RiskScorer();
    this.capabilityRouter = new CapabilityRouter(config.budgetLimits);
    this.criticAgent = new CriticAgent();
    this.fixerAgent = new FixerAgent();
    this.policyEngine = new PolicyEngine();
    this.buildGraph = new BuildGraph();
    this.testSharding = new TestSharding();
    this.provenance = new Provenance();
  }

  /**
   * Main autonomous merge pipeline: Planner → Implementer → Critic → Fixer → Tester → Reviewer
   */
  async processAutonomousMerge(
    prId: string,
    changes: any[],
  ): Promise<{
    success: boolean;
    riskScore: number;
    costToDate: number;
    evidenceBundle: any;
    requiresHumanReview: boolean;
  }> {
    const startTime = Date.now();
    let totalCost = 0;

    try {
      // 1. Risk Assessment
      const riskScore = await this.riskScorer.computeRiskScore(changes);

      // 2. Policy Check
      const policyResult = await this.policyEngine.validate(changes);
      if (!policyResult.allowed) {
        return {
          success: false,
          riskScore,
          costToDate: totalCost,
          evidenceBundle: { policyViolation: policyResult.reason },
          requiresHumanReview: true,
        };
      }

      // 3. Build affected-only targets
      const affectedTargets =
        await this.buildGraph.computeAffectedTargets(changes);
      const buildResult = await this.buildGraph.buildTargets(affectedTargets);

      if (!buildResult.success) {
        return {
          success: false,
          riskScore,
          costToDate: totalCost,
          evidenceBundle: { buildFailure: buildResult.errors },
          requiresHumanReview: true,
        };
      }

      // 4. Dynamic test sharding
      const testShards =
        await this.testSharding.allocateShards(affectedTargets);
      const testResult = await this.testSharding.runShards(testShards);

      if (!testResult.success) {
        return {
          success: false,
          riskScore,
          costToDate: totalCost,
          evidenceBundle: { testFailures: testResult.failures },
          requiresHumanReview: true,
        };
      }

      // 5. Critic Agent Analysis
      const remainingBudget = this.config.budgetLimits.maxUsdPerPR - totalCost;
      const criticModel = this.capabilityRouter.pickModel(
        {
          tokens: 5000,
          risk: riskScore,
        },
        remainingBudget,
      );

      const criticResult = await this.criticAgent.analyze(changes, criticModel);
      totalCost += criticResult.cost;

      // 6. Fixer Agent (if needed)
      if (criticResult.needsFixes) {
        const fixerModel = this.capabilityRouter.pickModel(
          {
            tokens: 8000,
            risk: riskScore,
          },
          this.config.budgetLimits.maxUsdPerPR - totalCost,
        );

        const fixerResult = await this.fixerAgent.generateFixes(
          criticResult.issues,
          fixerModel,
        );
        totalCost += fixerResult.cost;

        if (!fixerResult.success) {
          return {
            success: false,
            riskScore,
            costToDate: totalCost,
            evidenceBundle: { fixerFailure: fixerResult.error },
            requiresHumanReview: true,
          };
        }
      }

      // 7. SLSA Provenance
      const provenanceData = await this.provenance.generateProvenance({
        prId,
        changes,
        buildResult,
        testResult,
        riskScore,
        cost: totalCost,
      });

      // 8. Evidence Bundle
      const evidenceBundle = {
        riskScore,
        costToDate: totalCost,
        buildArtifacts: buildResult.artifacts,
        testResults: testResult.results,
        staticAnalysis: criticResult.staticAnalysis,
        provenance: provenanceData,
        processingTime: Date.now() - startTime,
      };

      const requiresHumanReview =
        riskScore >= this.config.riskThresholds.requireReviewer;

      return {
        success: true,
        riskScore,
        costToDate: totalCost,
        evidenceBundle,
        requiresHumanReview,
      };
    } catch (error) {
      return {
        success: false,
        riskScore: 1.0, // Max risk on error
        costToDate: totalCost,
        evidenceBundle: { processingError: error },
        requiresHumanReview: true,
      };
    }
  }

  /**
   * Health check for the conductor system
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: any;
    issues: string[];
  }> {
    const issues: string[] = [];
    const metrics: any = {};

    try {
      // Check build system
      const buildHealth = await this.buildGraph.healthCheck();
      if (!buildHealth.healthy) {
        issues.push(`Build system: ${buildHealth.error}`);
      }
      metrics.buildSystem = buildHealth;

      // Check test sharding
      const testHealth = await this.testSharding.healthCheck();
      if (!testHealth.healthy) {
        issues.push(`Test sharding: ${testHealth.error}`);
      }
      metrics.testSharding = testHealth;

      // Check cache hit rates
      const cacheStats = await this.capabilityRouter.getCacheStats();
      if (cacheStats.hitRate < this.config.targetMetrics.promptCacheHitRate) {
        issues.push(`Cache hit rate below target: ${cacheStats.hitRate}%`);
      }
      metrics.cacheStats = cacheStats;

      const status =
        issues.length === 0
          ? 'healthy'
          : issues.length <= 2
            ? 'degraded'
            : 'unhealthy';

      return { status, metrics, issues };
    } catch (error) {
      return {
        status: 'unhealthy',
        metrics: {},
        issues: [`Health check failed: ${error}`],
      };
    }
  }

  /**
   * Get current system metrics
   */
  async getMetrics(): Promise<any> {
    return {
      version: '0.4.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      config: this.config,
      components: {
        riskScorer: await this.riskScorer.getStats(),
        capabilityRouter: await this.capabilityRouter.getStats(),
        buildGraph: await this.buildGraph.getStats(),
        testSharding: await this.testSharding.getStats(),
        provenance: await this.provenance.getStats(),
      },
    };
  }
}
