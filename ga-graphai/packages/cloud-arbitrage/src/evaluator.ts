import { ArbitrageAgent } from './agent.js';
import type {
  CompositeMarketSnapshot,
  EvaluationReport,
  HeadToHeadResult,
  StrategySummary,
  WorkloadProfile
} from './types.js';

export interface BaselineRun {
  tool: HeadToHeadResult['baselineTool'];
  workload: WorkloadProfile;
  baselineSavings: number;
}

export class HeadToHeadEvaluator {
  constructor(private readonly agent = new ArbitrageAgent()) {}

  run(snapshot: CompositeMarketSnapshot, baselines: BaselineRun[]): EvaluationReport {
    const results = baselines.map(baseline => this.evaluateOne(snapshot, baseline));
    const aggregateNetBenefit = results.reduce((sum, result) => sum + result.netBenefit, 0);
    return {
      generatedAt: new Date().toISOString(),
      results,
      aggregateNetBenefit
    };
  }

  private evaluateOne(snapshot: CompositeMarketSnapshot, baseline: BaselineRun): HeadToHeadResult {
    const agentSummaries = this.agent.recommendPortfolio(snapshot, baseline.workload, {
      topN: 1,
      minScore: 0.5
    });
    const agentSummary: StrategySummary =
      agentSummaries[0] ?? {
        strategy: 'unavailable',
        provider: 'n/a',
        region: 'n/a',
        blendedUnitPrice: 0,
        estimatedSavings: 0,
        consumerScore: 0,
        collectibleScore: 0,
        predictionScore: 0,
        cryptoScore: 0,
        forexScore: 0,
        derivativesScore: 0,
        commodityScore: 0,
        sportsScore: 0,
        exoticScore: 0,
        metaSignalScore: 0,
        cascadeScore: 0,
        frontRunConfidence: 0,
        crossMarketScore: 0,
        arbitrageStrength: 0,
        hedgeStrength: 0,
        confidence: 0
      };
    const agentSavings = agentSummary.estimatedSavings;
    const netBenefit = agentSavings - baseline.baselineSavings;
    return {
      baselineTool: baseline.tool,
      workloadId: baseline.workload.id,
      agentSummary,
      baselineSavings: baseline.baselineSavings,
      agentSavings,
      netBenefit
    };
  }
}
