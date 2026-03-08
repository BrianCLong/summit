"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const trial_upsell_dag_1 = require("../src/workflows/trial-upsell-dag");
const upsellModule = __importStar(require("../../../../packages/agents/src/upsell/trial-upsell"));
(0, vitest_1.describe)('Trial Upsell Workflow', () => {
    (0, vitest_1.it)('should trigger upsell for high-usage tenants', async () => {
        const tenantId = 'high-usage-tenant';
        // The mock in trial-upsell.ts already returns high usage for 'high-usage' string
        const result = await (0, trial_upsell_dag_1.runTrialUpsellWorkflow)(tenantId);
        (0, vitest_1.expect)(result.status).toBe('upsell-triggered');
        (0, vitest_1.expect)(result.signal).toBeDefined();
        (0, vitest_1.expect)(['A', 'B']).toContain(result.signal.variant);
    });
    (0, vitest_1.it)('should NOT trigger upsell for low-usage tenants', async () => {
        const tenantId = 'low-usage-tenant';
        const result = await (0, trial_upsell_dag_1.runTrialUpsellWorkflow)(tenantId);
        (0, vitest_1.expect)(result.status).toBe('no-action');
        (0, vitest_1.expect)(result.signal).toBeUndefined();
    });
    (0, vitest_1.it)('should track conversion when triggered', async () => {
        const trackSpy = vitest_1.vi.spyOn(upsellModule, 'trackUpsellConversion');
        const tenantId = 'high-usage-tracker';
        await (0, trial_upsell_dag_1.runTrialUpsellWorkflow)(tenantId);
        (0, vitest_1.expect)(trackSpy).toHaveBeenCalledWith(tenantId, vitest_1.expect.stringMatching(/A|B/), 'nudge_shown');
    });
    (0, vitest_1.it)('should respect opt-out', async () => {
        const tenantId = 'high-usage-opt-out';
        upsellModule.optOutTenant(tenantId);
        const result = await (0, trial_upsell_dag_1.runTrialUpsellWorkflow)(tenantId);
        (0, vitest_1.expect)(result.status).toBe('no-action');
    });
    (0, vitest_1.it)('should respect frequency cap', async () => {
        const tenantId = 'high-usage-freq-cap';
        // First run triggers it
        const firstResult = await (0, trial_upsell_dag_1.runTrialUpsellWorkflow)(tenantId);
        (0, vitest_1.expect)(firstResult.status).toBe('upsell-triggered');
        // Second run immediately after should skip
        const secondResult = await (0, trial_upsell_dag_1.runTrialUpsellWorkflow)(tenantId);
        (0, vitest_1.expect)(secondResult.status).toBe('no-action');
    });
    (0, vitest_1.it)('simulation: 20% conversion rate mock', () => {
        const trials = 100;
        let conversions = 0;
        const conversionRate = 0.2;
        for (let i = 0; i < trials; i++) {
            if (Math.random() < conversionRate) {
                conversions++;
            }
        }
        console.log(`[Sim] Total trials: ${trials}, Conversions: ${conversions} (${(conversions / trials) * 100}%)`);
        // Just a simulation log as requested
        (0, vitest_1.expect)(conversions).toBeGreaterThanOrEqual(0);
    });
});
