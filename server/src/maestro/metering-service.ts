// server/src/maestro/metering-service.ts
import { CostMeter, LLMUsage } from './cost_meter.js';

// Mock IntelGraphClient for CostMeter dependency
const mockIgClient = {
  recordCostSample: async () => {},
  getRunCostSummary: async () => ({})
};

// Mock pricing table
const pricingTable = {
  'openai:gpt-4': { inputPer1K: 0.03, outputPer1K: 0.06 },
  'openai:gpt-3.5-turbo': { inputPer1K: 0.0015, outputPer1K: 0.002 }
};

export class MeteringService {
  private static instance: MeteringService;
  private costMeter: CostMeter;

  private constructor() {
    this.costMeter = new CostMeter(mockIgClient as any, pricingTable);
  }

  static getInstance(): MeteringService {
    if (!MeteringService.instance) {
      MeteringService.instance = new MeteringService();
    }
    return MeteringService.instance;
  }

  async trackRunUsage(tenantId: string, runId: string, units: number) {
    // Custom tracking logic for 'run_units'
    // For now, we reuse the cost meter structure but log it as a specific "model" type
    // or we just emit a metric
    console.log(`[Metering] Tenant ${tenantId} Run ${runId}: ${units} run_units`);
  }

  async trackStepUsage(tenantId: string, runId: string, stepId: string, usage: LLMUsage) {
    await this.costMeter.record(runId, stepId, usage, { tenantId });
  }
}

export const meteringService = MeteringService.getInstance();
