"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutonomicLayer = void 0;
const signals_service_js_1 = require("./signals/signals-service.js");
const slo_policy_engine_js_1 = require("./policy/slo-policy-engine.js");
const governance_engine_js_1 = require("./governance/governance-engine.js");
const healing_executor_js_1 = require("./healing/healing-executor.js");
const experimentation_service_js_1 = require("./experiments/experimentation-service.js");
const adaptive_routing_js_1 = require("./optimization/adaptive-routing.js");
const feedback_service_js_1 = require("./feedback/feedback-service.js");
const reliability_loop_js_1 = require("./loops/reliability-loop.js");
const cost_loop_js_1 = require("./loops/cost-loop.js");
const types_js_1 = require("./signals/types.js");
class AutonomicLayer {
    signals;
    policy;
    governance;
    healing;
    experiments;
    routing;
    feedback;
    loops = [];
    loopIntervalMs = 60000; // 1 min
    intervalId = null;
    constructor() {
        this.signals = new signals_service_js_1.SignalsService();
        this.policy = new slo_policy_engine_js_1.SLOPolicyEngine(this.signals);
        this.governance = new governance_engine_js_1.GovernanceEngine();
        this.healing = new healing_executor_js_1.HealingExecutor();
        this.experiments = new experimentation_service_js_1.ExperimentationService();
        this.routing = new adaptive_routing_js_1.AdaptiveRoutingService();
        this.feedback = new feedback_service_js_1.FeedbackService();
        // Initialize loops
        this.loops = [
            new reliability_loop_js_1.ReliabilityLoop(),
            new cost_loop_js_1.CostOptimizationLoop()
        ];
    }
    start() {
        if (this.intervalId)
            return;
        console.log('[AutonomicLayer] Starting control loops...');
        this.intervalId = setInterval(() => this.runControlLoops(), this.loopIntervalMs);
    }
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    async runControlLoops() {
        try {
            // For MVP, we iterate specific tenants or just a 'system' context
            const tenantId = 'system';
            // 1. Gather Context
            const health = this.signals.generateHealthSnapshot(tenantId);
            const alerts = this.policy.evaluate(tenantId);
            // 2. Healing (reactive, fast)
            // We'd need to fetch recent signals for healing evaluation
            const recentSignals = this.signals.getSignals(types_js_1.SignalType.TASK_LATENCY, 'system-core', new Date(Date.now() - 60000)); // Last min
            await this.healing.evaluateAndExecute(recentSignals);
            // 3. Strategic Loops (deliberative, slower)
            for (const loop of this.loops) {
                await loop.monitor(health, alerts);
                if (await loop.analyze()) {
                    const plan = await loop.plan();
                    if (plan) {
                        const governedActions = await this.governance.reviewPlan(plan);
                        const approvedActions = governedActions.filter(ga => ga.status === 'APPROVED');
                        if (approvedActions.length > 0) {
                            // Construct approved plan subset
                            const approvedPlan = { ...plan, actions: approvedActions.map(ga => ({ type: ga.actionType, payload: ga.payload })) };
                            await loop.execute(approvedPlan);
                        }
                        else {
                            console.log(`[Autonomic] Plan from ${loop.name} was fully denied by governance.`);
                        }
                    }
                }
            }
        }
        catch (err) {
            console.error('[AutonomicLayer] Error in control loop cycle:', err);
        }
    }
}
exports.AutonomicLayer = AutonomicLayer;
