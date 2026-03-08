"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTrialUpsellWorkflow = runTrialUpsellWorkflow;
// maestro-conductor/src/workflows/trial-upsell-dag.ts
const trial_upsell_1 = require("../../../../../packages/agents/src/upsell/trial-upsell");
/**
 * Trial Upsell DAG
 * 1. Poll Metrics (handled by evaluateUpsell internally for now)
 * 2. Evaluate Upsell logic
 * 3. If triggered: Notify + Log
 */
async function runTrialUpsellWorkflow(tenantId) {
    console.log(`[DAG] Starting Trial Upsell Workflow for tenant: ${tenantId}`);
    const signal = await (0, trial_upsell_1.evaluateUpsell)(tenantId);
    if (signal) {
        console.log(`[DAG] Upsell Triggered for ${tenantId}: ${signal.msg} (Variant: ${signal.variant})`);
        // Simulate notification (Email, Dashboard nudge)
        await notifyTenant(tenantId, signal);
        // Track that we showed the nudge
        await (0, trial_upsell_1.trackUpsellConversion)(tenantId, signal.variant, 'nudge_shown');
        return {
            tenantId,
            status: 'upsell-triggered',
            signal
        };
    }
    console.log(`[DAG] No upsell action needed for tenant: ${tenantId}`);
    return {
        tenantId,
        status: 'no-action'
    };
}
async function notifyTenant(tenantId, signal) {
    // In real world, this would call a notification service
    console.log(`[Notification] To Tenant ${tenantId}: ${signal.msg} [Link: ${signal.link}]`);
    // Graph annotation simulation
    console.log(`[Graph] Adding watermark annotation for ${tenantId}: Upsell Nudge ${signal.variant}`);
}
