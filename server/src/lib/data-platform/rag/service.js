"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RagService = void 0;
const service_js_1 = require("../retrieval/service.js");
const LLMService_js_1 = __importDefault(require("../../../services/LLMService.js"));
class RagService {
    retrievalService;
    llmService;
    constructor() {
        this.retrievalService = new service_js_1.RetrievalService();
        this.llmService = new LLMService_js_1.default();
    }
    async answer(question) {
        const start = Date.now();
        // 1. Retrieve
        const retrievalRes = await this.retrievalService.retrieve(question.retrieval);
        // 2. Build Context
        const contextText = retrievalRes.chunks.map((c, i) => `[${i + 1}] ${c.text}`).join('\n\n');
        // 3. Prompt
        const systemPrompt = `You are a helpful assistant for the Summit platform.
Use the provided context to answer the user's question.
If the answer is not in the context, say you don't know.
Cite sources using [1], [2] notation.`;
        const userPrompt = `Context:
${contextText}

Question: ${question.question}

Answer:`;
        // 4. Generate
        let answerText = "";
        try {
            const result = await this.llmService.complete({
                systemMessage: systemPrompt,
                prompt: userPrompt,
                model: question.generationConfig?.model || 'gpt-4o',
                maxTokens: question.generationConfig?.maxTokens || 1000,
                temperature: question.generationConfig?.temperature || 0.1
            });
            answerText = result;
        }
        catch (e) {
            console.error("LLM Error", e);
            answerText = "Error generating answer: " + e.message;
        }
        // 5. Build Response
        const citations = retrievalRes.chunks.map((c, i) => ({
            chunkId: c.chunkId,
            documentId: c.documentId,
            collectionId: c.collectionId,
            score: c.score,
            snippet: c.text.substring(0, 100) + "..."
        }));
        return {
            answer: answerText,
            citations,
            retrieval: retrievalRes,
            metrics: {
                tokensInput: 0,
                tokensOutput: 0,
                costEstimate: 0,
                latencyMs: Date.now() - start
            },
            safety: {
                policyOk: true,
                flags: []
            }
        };
    }
}
exports.RagService = RagService;
