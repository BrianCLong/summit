"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const engagement_cascade_js_1 = require("./mocks/engagement-cascade.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('engagementCascade', () => {
    (0, globals_1.it)('reduces latency compared to the baseline plan', () => {
        const plan = (0, engagement_cascade_js_1.engagementCascade)();
        (0, globals_1.expect)(plan.summary).toMatch(/speculative decoding/i);
        (0, globals_1.expect)(plan.speculativeCascade.expectedLatencyMs).toBeLessThan(plan.baseline.latencyMs);
        (0, globals_1.expect)(plan.speculativeCascade.expectedComputeUnits).toBeLessThan(plan.baseline.computeUnits);
    });
    (0, globals_1.it)('improves hit rate and speedup with higher amplification', () => {
        const baselinePlan = (0, engagement_cascade_js_1.engagementCascade)();
        const tunedPlan = (0, engagement_cascade_js_1.engagementCascade)({
            engagementAmplification: 120,
            influenceIntensity: 1.6,
        });
        (0, globals_1.expect)(tunedPlan.speculativeCascade.speculativeHitRate).toBeGreaterThan(baselinePlan.speculativeCascade.speculativeHitRate);
        (0, globals_1.expect)(tunedPlan.speculativeCascade.speedup).toBeGreaterThan(baselinePlan.speculativeCascade.speedup);
    });
    (0, globals_1.it)('keeps guardrail and tier metrics within sensible ranges', () => {
        const plan = (0, engagement_cascade_js_1.engagementCascade)({
            engagementAmplification: 20,
            globalDataSync: false,
        });
        (0, globals_1.expect)(plan.guardrails.fallbackRate).toBeGreaterThanOrEqual(0);
        (0, globals_1.expect)(plan.guardrails.fallbackRate).toBeLessThanOrEqual(1);
        (0, globals_1.expect)(plan.guardrails.minimumConfidence).toBeGreaterThan(0.7);
        (0, globals_1.expect)(plan.guardrails.minimumConfidence).toBeLessThanOrEqual(1);
        plan.speculativeCascade.tiers.forEach((tier) => {
            (0, globals_1.expect)(tier.latencyMs).toBeGreaterThan(0);
            (0, globals_1.expect)(tier.acceptanceThreshold).toBeGreaterThan(0);
            (0, globals_1.expect)(tier.acceptanceThreshold).toBeLessThanOrEqual(1);
        });
    });
});
