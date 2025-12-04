import { CostSample, RunCostSummary } from './types';
import { IntelGraphClient } from '../intelgraph/client';

export interface LLMUsage {
  model: string;
  vendor: 'openai' | 'anthropic' | 'google' | 'local';
  inputTokens: number;
  outputTokens: number;
}

export class CostMeter {
  constructor(
    private ig: IntelGraphClient,
    private pricingTable: Record<string, {  // e.g. "openai:gpt-4.1"
      inputPer1K: number; // USD
      outputPer1K: number;
    }>
  ) {}

  estimateCost(usage: LLMUsage): number {
    const key = `${usage.vendor}:${usage.model}`;
    const pricing = this.pricingTable[key];
    if (!pricing) return 0;

    const inCost = (usage.inputTokens / 1000) * pricing.inputPer1K;
    const outCost = (usage.outputTokens / 1000) * pricing.outputPer1K;
    return inCost + outCost;
  }

  async record(
    runId: string,
    taskId: string,
    usage: LLMUsage,
  ): Promise<CostSample> {
    const cost = this.estimateCost(usage);
    const sample: CostSample = {
      id: crypto.randomUUID(),
      runId,
      taskId,
      model: usage.model,
      vendor: usage.vendor,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      currency: 'USD',
      cost,
      createdAt: new Date().toISOString(),
    };

    await this.ig.recordCostSample(sample);
    return sample;
  }

  async summarize(runId: string): Promise<RunCostSummary> {
    return this.ig.getRunCostSummary(runId);
  }
}
