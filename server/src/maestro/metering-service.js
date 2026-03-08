"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meteringService = exports.MeteringService = void 0;
// server/src/maestro/metering-service.ts
const cost_meter_js_1 = require("./cost_meter.js");
// Mock IntelGraphClient for CostMeter dependency
const mockIgClient = {
    recordCostSample: async () => { },
    getRunCostSummary: async () => ({})
};
// Mock pricing table
const pricingTable = {
    'openai:gpt-4': { inputPer1K: 0.03, outputPer1K: 0.06 },
    'openai:gpt-3.5-turbo': { inputPer1K: 0.0015, outputPer1K: 0.002 }
};
class MeteringService {
    static instance;
    costMeter;
    constructor() {
        this.costMeter = new cost_meter_js_1.CostMeter(mockIgClient, pricingTable);
    }
    static getInstance() {
        if (!MeteringService.instance) {
            MeteringService.instance = new MeteringService();
        }
        return MeteringService.instance;
    }
    async trackRunUsage(tenantId, runId, units) {
        // Custom tracking logic for 'run_units'
        // For now, we reuse the cost meter structure but log it as a specific "model" type
        // or we just emit a metric
        console.log(`[Metering] Tenant ${tenantId} Run ${runId}: ${units} run_units`);
    }
    async trackStepUsage(tenantId, runId, stepId, usage) {
        await this.costMeter.record(runId, stepId, usage, { tenantId });
    }
}
exports.MeteringService = MeteringService;
exports.meteringService = MeteringService.getInstance();
