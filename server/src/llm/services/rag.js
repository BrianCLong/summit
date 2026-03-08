"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestratedRagService = void 0;
const orchestrator_js_1 = require("../orchestrator.js");
const registry_js_1 = require("../prompts/registry.js");
class OrchestratedRagService {
    orchestrator;
    constructor() {
        this.orchestrator = new orchestrator_js_1.SummitLlmOrchestrator();
    }
    async answerQuestion(tenantId, question, context) {
        // 1. Format Context
        const contextStr = context.documents.join('\n\n');
        // 2. Render Prompt
        const { messages } = await registry_js_1.promptService.render('rag.answer', {
            context: contextStr,
            question
        });
        // 3. Call Orchestrator
        const result = await this.orchestrator.chat({
            tenantId,
            purpose: 'rag_answer',
            riskLevel: 'medium',
            messages
        });
        return result.content || 'I could not answer based on the provided context.';
    }
}
exports.OrchestratedRagService = OrchestratedRagService;
