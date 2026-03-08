"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
function expectGraphConnectivity(result, stageId) {
    (0, vitest_1.expect)(result.graphSnapshot.nodes.find((node) => node.id === `stage:${stageId}`)).toBeDefined();
    (0, vitest_1.expect)(result.graphSnapshot.edges.find((edge) => edge.id === `pipeline:${result.plan.pipelineId}:CONTAINS:stage:${stageId}`)).toBeDefined();
}
(0, vitest_1.describe)('reference workflows', () => {
    (0, vitest_1.it)('runs the Hello-World workflow through orchestrator and IntelGraph', async () => {
        const result = await (0, index_js_1.runHelloWorldWorkflow)();
        expectGraphConnectivity(result, 'hello-world-stage');
        (0, vitest_1.expect)(result.plan.steps[0].primary.provider).toBe('azure');
        (0, vitest_1.expect)(result.outcome.trace[0].status).toBe('success');
        (0, vitest_1.expect)(result.telemetry.throughputPerMinute).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.auditTrail.some((entry) => entry.category === 'plan')).toBe(true);
        (0, vitest_1.expect)(result.auditTrail.some((entry) => entry.category === 'execution')).toBe(true);
    });
    (0, vitest_1.it)('runs the Hello-Case workflow and exercises fallback plus risk scoring', async () => {
        const result = await (0, index_js_1.runHelloCaseWorkflow)();
        expectGraphConnectivity(result, 'hello-case-triage');
        (0, vitest_1.expect)(result.plan.steps[0].fallbacks).not.toHaveLength(0);
        (0, vitest_1.expect)(result.outcome.trace[0].status).toBe('recovered');
        (0, vitest_1.expect)(result.outcome.trace[0].provider).toBe('aws');
        (0, vitest_1.expect)(result.telemetry.selfHealingRate).toBeGreaterThan(0);
        const serviceRisk = result.graphSnapshot.serviceRisk['service-hello-case'];
        (0, vitest_1.expect)(serviceRisk.score).toBeGreaterThan(0.3);
        (0, vitest_1.expect)(result.auditTrail.some((entry) => entry.category === 'fallback')).toBe(true);
        (0, vitest_1.expect)(result.auditTrail.some((entry) => entry.category === 'reward-update')).toBe(true);
    });
    (0, vitest_1.it)('runs the payments and credit orchestration with PCI/PSD2 guardrails', async () => {
        const result = await (0, index_js_1.runPaymentsAndCreditWorkflow)();
        (0, vitest_1.expect)(result.plan.steps).toHaveLength(3);
        (0, vitest_1.expect)(result.stages.find((stage) => stage.id === 'pci-ingest')?.complianceTags).toEqual(vitest_1.expect.arrayContaining(['pci', 'aml', 'gdpr']));
        const recovered = result.outcome.trace.find((entry) => entry.stageId === 'fraud-decision' && entry.status === 'recovered');
        (0, vitest_1.expect)(recovered).toBeDefined();
        (0, vitest_1.expect)(result.telemetry.costPerThroughputUnit).toBeLessThanOrEqual(0.1);
        (0, vitest_1.expect)(result.telemetry.auditCompleteness).toBeGreaterThan(0.5);
        (0, vitest_1.expect)(result.auditTrail.some((entry) => entry.category === 'execution')).toBe(true);
    });
});
