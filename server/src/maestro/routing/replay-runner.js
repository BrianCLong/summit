"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplayRunner = void 0;
const llm_js_1 = require("../../services/llm.js");
const decision_recorder_js_1 = require("./decision-recorder.js");
const llm_decision_router_js_1 = require("./llm-decision-router.js");
class ReplayRunner {
    recorder;
    router;
    provider;
    constructor(recorder = new decision_recorder_js_1.DecisionRecorder(), router = new llm_decision_router_js_1.LLMDecisionRouter(), provider = new llm_js_1.MockLLM()) {
        this.recorder = recorder;
        this.router = router;
        this.provider = provider;
    }
    async replay(decisionId) {
        const record = await this.recorder.load(decisionId);
        if (!record) {
            throw new Error(`Decision record ${decisionId} not found`);
        }
        const { decision } = await this.router.route({
            prompt: record.request.prompt,
            context: record.request.context,
            tenantId: record.request.tenantId || 'unknown',
            userId: record.request.userId,
            features: record.request.features,
            policies: record.request.policies,
            constraints: record.request.constraints,
            redactions: record.outcome.guardrailActions.piiRedactions,
            startedAt: record.meta.decisionStartedAt,
        }, { persist: false, applySideEffects: false });
        const output = [];
        const controller = new AbortController();
        for await (const token of this.provider.stream(record.request.prompt, controller.signal)) {
            output.push(token);
        }
        const matches = decision.selectedModel.provider === record.outcome.provider &&
            decision.selectedModel.id === record.outcome.model;
        return {
            record,
            replayDecision: decision,
            matches,
            renderedOutput: output.join(''),
        };
    }
}
exports.ReplayRunner = ReplayRunner;
