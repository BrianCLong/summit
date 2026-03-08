"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autonomicRouter = void 0;
const express_1 = require("express");
const signals_service_js_1 = require("../signals/signals-service.js");
const slo_policy_engine_js_1 = require("../policy/slo-policy-engine.js");
const reliability_loop_js_1 = require("../loops/reliability-loop.js");
const cost_loop_js_1 = require("../loops/cost-loop.js");
const governance_engine_js_1 = require("../governance/governance-engine.js");
const experimentation_service_js_1 = require("../experiments/experimentation-service.js");
const healing_executor_js_1 = require("../healing/healing-executor.js");
// Composition Root (Singleton-ish for demo)
const signalsService = new signals_service_js_1.SignalsService();
const policyEngine = new slo_policy_engine_js_1.SLOPolicyEngine(signalsService);
const governanceEngine = new governance_engine_js_1.GovernanceEngine();
const experimentationService = new experimentation_service_js_1.ExperimentationService();
const healingExecutor = new healing_executor_js_1.HealingExecutor();
const reliabilityLoop = new reliability_loop_js_1.ReliabilityLoop();
const costLoop = new cost_loop_js_1.CostOptimizationLoop();
const router = (0, express_1.Router)();
router.get('/health', (req, res) => {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    const snapshot = signalsService.generateHealthSnapshot(tenantId);
    res.json(snapshot);
});
router.get('/slo', (req, res) => {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    const alerts = policyEngine.evaluate(tenantId);
    // Ideally also return status of all budgets
    res.json({ alerts });
});
router.post('/simulate', async (req, res) => {
    const { tenantId, signalOverride } = req.body;
    // Create a hypothetical health snapshot
    // This requires refactoring monitor() to accept snapshot, which we did.
    const snapshot = signalsService.generateHealthSnapshot(tenantId || 'default');
    if (signalOverride) {
        // Apply overrides deep merge style (simplified)
        if (signalOverride.systemStatus)
            snapshot.system.status = signalOverride.systemStatus;
    }
    // Run loops against it
    const relPlan = await reliabilityLoop.monitor(snapshot, []).then(() => reliabilityLoop.plan());
    const costPlan = await costLoop.monitor(snapshot, []).then(() => costLoop.plan());
    const plans = [relPlan, costPlan].filter(p => p !== null);
    // Check governance
    const governedResults = [];
    for (const p of plans) {
        if (p) {
            const decisions = await governanceEngine.reviewPlan(p);
            governedResults.push({ plan: p, decisions });
        }
    }
    res.json({ simulatedPlans: governedResults });
});
router.get('/experiments/:id/results', (req, res) => {
    // Mock result
    res.json({ experimentId: req.params.id, status: 'ACTIVE', results: {} });
});
exports.autonomicRouter = router;
