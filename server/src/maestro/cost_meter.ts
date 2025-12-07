import { CostSample, RunCostSummary } from './types';
import { IntelGraphClient } from '../intelgraph/client';
import UsageMeteringService from '../services/UsageMeteringService.js';
import PricingEngine from '../services/PricingEngine.js';

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
    // Deprecated method, kept for compatibility if needed, but new logic should use PricingEngine
    // For now, mirroring the old logic to keep it simple or redirect to PricingEngine if possible.
    // However, PricingEngine needs tenantId which CostMeter might not have in this method signature.

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
    tenantId?: string // Added optional tenantId
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

    // Original IntelGraph recording
    await this.ig.recordCostSample(sample);

    // New UsageMetering recording
    if (tenantId) {
        await UsageMeteringService.record({
            tenantId,
            kind: 'llm.tokens',
            quantity: usage.inputTokens + usage.outputTokens,
            unit: 'tokens',
            metadata: {
                model: usage.model,
                vendor: usage.vendor,
                runId,
                taskId,
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
                estimatedCost: cost
            }
        });
    }

    return sample;
  }

  async summarize(runId: string): Promise<RunCostSummary> {
    return this.ig.getRunCostSummary(runId);
  }
}
