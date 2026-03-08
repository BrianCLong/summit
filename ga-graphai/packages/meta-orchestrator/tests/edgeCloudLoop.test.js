"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
const config = {
    perceptionSloMs: 200,
    planSloMs: 800,
    governanceBacklogThreshold: 5,
    cloudQueueBackpressurePct: 70,
    mergeThreshold: 82,
    targetUpliftPercent: 40,
};
function controller() {
    return new index_js_1.EdgeCloudLoopController(config);
}
(0, vitest_1.describe)('EdgeCloudLoopController', () => {
    (0, vitest_1.it)('prefers edge for simple, low-latency work', () => {
        const signal = {
            perceptionLatencyMs: 120,
            planningLatencyMs: 400,
            cloudQueueDepthPct: 30,
            governancePending: 1,
            changeComplexity: 'low',
            complianceRisk: 'low',
        };
        const decision = controller().chooseExecutionTier(signal);
        (0, vitest_1.expect)(decision.tier).toBe('edge');
        (0, vitest_1.expect)(decision.reasons.some((reason) => reason.includes('edge preference'))).toBe(true);
    });
    (0, vitest_1.it)('promotes to cloud when latency or compliance risk is high', () => {
        const signal = {
            perceptionLatencyMs: 250,
            planningLatencyMs: 900,
            cloudQueueDepthPct: 20,
            governancePending: 0,
            changeComplexity: 'medium',
            complianceRisk: 'high',
        };
        const decision = controller().chooseExecutionTier(signal);
        (0, vitest_1.expect)(decision.tier).toBe('cloud');
        (0, vitest_1.expect)(decision.reasons).toContain('perception latency breach');
        (0, vitest_1.expect)(decision.reasons).toContain('high compliance risk');
    });
    (0, vitest_1.it)('avoids cloud when queue is saturated even if complexity is high', () => {
        const signal = {
            perceptionLatencyMs: 150,
            planningLatencyMs: 600,
            cloudQueueDepthPct: 90,
            governancePending: 0,
            changeComplexity: 'high',
            complianceRisk: 'medium',
        };
        const decision = controller().chooseExecutionTier(signal);
        (0, vitest_1.expect)(decision.tier).toBe('edge');
        (0, vitest_1.expect)(decision.reasons.some((reason) => reason.includes('cloud queue saturated'))).toBe(true);
    });
    (0, vitest_1.it)('declares merge-ready when uplift, governance, and score targets are met', () => {
        const metrics = {
            round: 3,
            deltaQuality: 50,
            deltaVelocity: 45,
            governanceScore: 0.9,
            incidentsOpen: 0,
        };
        const evaluation = controller().evaluateRound(metrics);
        (0, vitest_1.expect)(evaluation.mergeReady).toBe(true);
        (0, vitest_1.expect)(evaluation.requiresRollback).toBe(false);
        (0, vitest_1.expect)(evaluation.overallScore).toBeGreaterThanOrEqual(82);
    });
    (0, vitest_1.it)('triggers rollback guidance when incidents are open', () => {
        const metrics = {
            round: 7,
            deltaQuality: 10,
            deltaVelocity: 5,
            governanceScore: 0.55,
            incidentsOpen: 1,
            rollbackRef: 'metric-6',
        };
        const evaluation = controller().evaluateRound(metrics);
        (0, vitest_1.expect)(evaluation.mergeReady).toBe(false);
        (0, vitest_1.expect)(evaluation.requiresRollback).toBe(true);
        (0, vitest_1.expect)(evaluation.reasons.some((reason) => reason.includes('rollback'))).toBe(true);
    });
    (0, vitest_1.it)('emits Neo4j-friendly telemetry snapshot', () => {
        const metrics = {
            round: 5,
            deltaQuality: 30,
            deltaVelocity: 20,
            governanceScore: 0.88,
            incidentsOpen: 0,
        };
        const evaluation = controller().evaluateRound(metrics);
        const decision = controller().chooseExecutionTier({
            perceptionLatencyMs: 100,
            planningLatencyMs: 400,
            cloudQueueDepthPct: 15,
            governancePending: 0,
            changeComplexity: 'low',
            complianceRisk: 'low',
        });
        const snapshot = controller().buildTelemetrySnapshot(metrics, evaluation, decision);
        (0, vitest_1.expect)(snapshot.nodes.find((node) => node.id === 'metric-5')).toBeDefined();
        (0, vitest_1.expect)(snapshot.nodes.find((node) => node.id === 'governance-5')).toBeDefined();
        (0, vitest_1.expect)(snapshot.nodes.find((node) => node.id === 'decision-5')).toBeDefined();
        (0, vitest_1.expect)(snapshot.edges.length).toBeGreaterThanOrEqual(2);
    });
});
