"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RagContextBuilder = void 0;
exports.getRagContext = getRagContext;
const RetrievalService_js_1 = require("./RetrievalService.js");
class RagContextBuilder {
    async buildContext(query, retrievalResult) {
        const { chunks, entities } = retrievalResult;
        let context = `Context for Query: "${query}"\n\n`;
        if (entities.length > 0) {
            context += `Related Entities:\n`;
            for (const e of entities) {
                context += `- ${e.kind.toUpperCase()}: ${e.properties.name || e.id} (${(e.labels || []).join(', ')})\n`;
            }
            context += `\n`;
        }
        if (chunks.length > 0) {
            context += `Relevant Document Snippets:\n`;
            for (const c of chunks) {
                context += `--- Source: ${c.metadata?.source || c.documentId} ---\n`;
                context += `${c.text}\n\n`;
            }
        }
        if (chunks.length === 0 && entities.length === 0) {
            context += `No relevant information found.\n`;
        }
        return context;
    }
}
exports.RagContextBuilder = RagContextBuilder;
// Wrapper for existing consumers
async function getRagContext(query, tenantId, embedding) {
    const retrieval = new RetrievalService_js_1.RetrievalService();
    const results = await retrieval.retrieve(query, tenantId, { embedding });
    const builder = new RagContextBuilder();
    return builder.buildContext(query, results);
}
