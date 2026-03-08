"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalSchema = void 0;
exports.getMetrics = getMetrics;
exports.optOutTenant = optOutTenant;
exports.evaluateUpsell = evaluateUpsell;
exports.trackUpsellConversion = trackUpsellConversion;
const zod_1 = require("zod");
exports.SignalSchema = zod_1.z.object({
    type: zod_1.z.literal('poc-upsell'),
    msg: zod_1.z.string(),
    link: zod_1.z.string(),
    variant: zod_1.z.enum(['A', 'B']),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
// Mock metrics retriever - in real world this would hit Prometheus/Postgres
async function getMetrics(tenantId) {
    // Mocking usage based on tenantId for testing
    // In a real implementation, this would query a database
    if (tenantId.includes('high-usage')) {
        return { scans: 15, driftFixes: 5, daysActive: 3 };
    }
    return { scans: 2, driftFixes: 0, daysActive: 1 };
}
// Simple in-memory storage for opt-outs and last nudge timestamps
// In production, this would be in Redis or Postgres
const optOuts = new Set();
const lastNudgeAt = new Map();
function optOutTenant(tenantId) {
    optOuts.add(tenantId);
}
async function evaluateUpsell(tenantId) {
    // 1. Check Opt-out
    if (optOuts.has(tenantId)) {
        console.log(`[Upsell] Tenant ${tenantId} has opted out. Skipping.`);
        return null;
    }
    // 2. Frequency Cap (e.g., max once every 24 hours)
    const lastNudge = lastNudgeAt.get(tenantId);
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (lastNudge && Date.now() - lastNudge < oneDayMs) {
        console.log(`[Upsell] Tenant ${tenantId} was nudged recently. Skipping (Freq Cap).`);
        return null;
    }
    const usage = await getMetrics(tenantId);
    const threshold = 10;
    const driftThreshold = 3;
    if (usage.scans > threshold || usage.driftFixes > driftThreshold) {
        // A/B testing logic
        const variant = Math.random() > 0.5 ? 'A' : 'B';
        let msg = '';
        let metadata = { usage };
        if (variant === 'A') {
            // Variant A: Price anchor
            msg = `You've performed ${usage.scans} scans. Unlock unlimited scans for just $499/mo!`;
        }
        else {
            // Variant B: ROI calc
            const savedTime = usage.driftFixes * 2; // Assume 2 hours saved per drift fix
            msg = `Your ${usage.driftFixes} drift fixes saved you ~${savedTime} hours. Enterprise RBAC next?`;
        }
        // Record that we are showing a nudge (for frequency cap)
        lastNudgeAt.set(tenantId, Date.now());
        return {
            type: 'poc-upsell',
            msg,
            link: '/billing',
            variant,
            metadata,
        };
    }
    return null;
}
async function trackUpsellConversion(tenantId, variant, event) {
    console.log(`[Metrics] Tenant: ${tenantId}, Variant: ${variant}, Event: ${event}, Timestamp: ${new Date().toISOString()}`);
    if (event === 'click' || event === 'signup') {
        // If they interact, maybe we don't nudge them again too soon or we change the frequency?
        // For now, freq cap is handled by lastNudgeAt in evaluateUpsell
    }
}
