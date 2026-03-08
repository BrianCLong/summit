"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratedSummarizationService = void 0;
const orchestrator_js_1 = require("../orchestrator.js");
const registry_js_1 = require("../prompts/registry.js");
class OrchestratedSummarizationService {
    orchestrator;
    constructor() {
        this.orchestrator = new orchestrator_js_1.SummitLlmOrchestrator();
    }
    async summarizeText(tenantId, text) {
        // 1. Render Prompt
        const { messages } = await registry_js_1.promptService.render('summarize.text', { text });
        // 2. Call Orchestrator
        const result = await this.orchestrator.chat({
            tenantId,
            purpose: 'summarization',
            riskLevel: 'low',
            messages
        });
        return result.content || 'Failed to generate summary.';
    }
}
exports.OrchestratedSummarizationService = OrchestratedSummarizationService;
