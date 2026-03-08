"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evidenceFusionService = exports.EvidenceFusionService = void 0;
const events_1 = require("events");
const LLMService_js_1 = __importDefault(require("./LLMService.js"));
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class EvidenceFusionService extends events_1.EventEmitter {
    llmService;
    constructor() {
        super();
        this.llmService = new LLMService_js_1.default();
        logger_js_1.default.info('[EvidenceFusion] Service initialized');
    }
    /**
     * Synthesize a timeline from a set of evidence.
     */
    async synthesizeTimeline(evidenceList) {
        if (!evidenceList || evidenceList.length === 0) {
            return { timeline: [] };
        }
        const prompt = `
      You are an expert Investigator.
      Analyze the following evidence items and construct a chronological timeline.
      Identify causal links between events (e.g., Event A caused Event B).

      Evidence:
      ${JSON.stringify(evidenceList)}

      Return a JSON object with:
      - 'timeline': Array of { timestamp, eventDescription, evidenceRefId }
      - 'gaps': List of missing information or logical gaps.
    `;
        try {
            const response = await this.llmService.complete(prompt, {
                temperature: 0.2,
                maxTokens: 1500
            });
            // Try parsing JSON, fallback to raw text wrapped
            try {
                return JSON.parse(response);
            }
            catch {
                return { raw: response };
            }
        }
        catch (e) {
            logger_js_1.default.error('[EvidenceFusion] Timeline synthesis failed', e instanceof Error ? e.message : String(e));
            throw e;
        }
    }
    /**
     * Generate hypotheses explaining the observed evidence.
     */
    async generateHypotheses(evidenceList, context) {
        const prompt = `
      Based on the provided evidence, generate 3 plausible hypotheses to explain the situation.
      Each hypothesis should be distinct and ranked by likelihood.

      Context: ${context || 'General Investigation'}
      Evidence: ${JSON.stringify(evidenceList.map(e => ({ id: e.id, content: e.content, time: e.timestamp })))}

      For each hypothesis, cite the evidence IDs that support it and those that contradict it.
      Return a JSON array of Hypothesis objects.
    `;
        try {
            const response = await this.llmService.complete(prompt, {
                temperature: 0.4,
                maxTokens: 2000
            });
            try {
                // Assume the LLM returns the JSON array or an object containing it
                const parsed = JSON.parse(response);
                return Array.isArray(parsed) ? parsed : (parsed.hypotheses || []);
            }
            catch {
                logger_js_1.default.warn('[EvidenceFusion] Failed to parse hypotheses JSON');
                return [];
            }
        }
        catch (e) {
            logger_js_1.default.error('[EvidenceFusion] Hypothesis generation failed', e instanceof Error ? e.message : String(e));
            throw e;
        }
    }
    /**
     * Link evidence items semantically (mocking GraphRAG integration).
     * In a full implementation, this would query the GraphRAG service.
     */
    async linkEvidence(items) {
        // Simple O(N^2) comparison for the mock
        // In prod, this uses vector search / GraphRAG
        if (items.length < 2)
            return [];
        const links = [];
        // Just a mock implementation returning a fixed link for demonstration
        links.push({
            source: items[0].id,
            target: items[1]?.id || items[0].id,
            relation: 'RELATED_TO (Semantic Similarity)'
        });
        return links;
    }
}
exports.EvidenceFusionService = EvidenceFusionService;
exports.evidenceFusionService = new EvidenceFusionService();
