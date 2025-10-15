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
    const defaultOptions = { topN: 1, minScore: 0.5 } as const;
    let agentSummaries = this.agent.recommendPortfolio(snapshot, baseline.workload, {
      ...defaultOptions
    });

    if (agentSummaries.length === 0) {
      agentSummaries = this.agent.recommendPortfolio(snapshot, baseline.workload, {
        ...defaultOptions,
        minScore: 0
      });
    }

    const agentSummary =
      agentSummaries[0] ?? this.synthesizeNeutralSummary(baseline);

    const agentSavings = agentSummary.estimatedSavings ?? 0;
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

  private synthesizeNeutralSummary(baseline: BaselineRun): StrategySummary {
    return {
      strategy: 'data-unavailable',
      provider: 'n/a',
      region: 'n/a',
      blendedUnitPrice: baseline.baselineSavings,
      estimatedSavings: 0,
      confidence: 0.1
    };
  }
}
