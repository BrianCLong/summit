import { IntelGraphClient } from '../intelgraph/client.js';
import { RunCostSummary, CostSample } from './types.js';

export class CostMeter {
  constructor(
    private ig: IntelGraphClient,
    private rates: Record<string, { inputPer1K: number; outputPer1K: number }>
  ) {}

  async record(runId: string, model: string, inputTokens: number, outputTokens: number, taskId?: string): Promise<void> {
    const rate = this.rates[model] || { inputPer1K: 0, outputPer1K: 0 };
    const costUSD = (inputTokens / 1000) * rate.inputPer1K + (outputTokens / 1000) * rate.outputPer1K;

    const sample: CostSample = {
      runId,
      taskId,
      model,
      inputTokens,
      outputTokens,
      costUSD,
      createdAt: new Date().toISOString()
    };

    await this.ig.recordCostSample(sample);
  }
}
