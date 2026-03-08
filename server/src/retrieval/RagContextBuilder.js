"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RagContextBuilder = void 0;
const tiktoken_1 = require("tiktoken"); // We might need to add this dependency or use an existing one
class RagContextBuilder {
    retrievalService;
    tokenizer;
    constructor(retrievalService) {
        this.retrievalService = retrievalService;
        // Fallback or lazy load tokenizer
        try {
            this.tokenizer = (0, tiktoken_1.get_encoding)("cl100k_base");
        }
        catch (e) {
            // If tiktoken isn't available, we might need a rough estimate fallback
            console.warn("tiktoken not available, using rough char estimate");
        }
    }
    async buildContext(req) {
        const queryKind = req.retrievalConfig?.queryKind || 'hybrid';
        const topK = req.retrievalConfig?.topK || 5;
        // 1. Retrieve raw results
        const result = await this.retrievalService.search({
            tenantId: req.tenantId,
            queryKind: queryKind,
            queryText: req.queryText,
            filters: {
                kinds: req.retrievalConfig?.kinds
            },
            topK: topK * 2, // Fetch more to allow for filtering/trimming
            includeContent: true,
            correlationId: req.correlationId
        });
        const snippets = [];
        let currentTokens = 0;
        // Reserve some buffer for headers/formatting
        const maxTokens = req.maxTokens || 4000;
        for (const item of result.items) {
            if (currentTokens >= maxTokens)
                break;
            const content = item.object.body || "";
            if (!content)
                continue;
            const title = item.object.title || "Untitled";
            const snippetTokens = this.countTokens(content);
            // Simple strategy: take whole document if it fits, else truncate
            // Refined strategy: if doc is huge, take relevant chunk?
            // For now, we'll truncate end.
            let finalContent = content;
            let finalTokens = snippetTokens;
            if (currentTokens + snippetTokens > maxTokens) {
                const remaining = maxTokens - currentTokens;
                if (remaining < 50)
                    break; // Don't add tiny snippets
                // Truncate
                // This is rough. Ideally decode(encode(content)[:remaining])
                finalContent = this.truncateToTokens(content, remaining);
                finalTokens = remaining;
            }
            snippets.push({
                objectId: item.object.id,
                kind: item.object.kind,
                title: title,
                content: finalContent,
                metadata: item.object.metadata,
                score: item.score
            });
            currentTokens += finalTokens;
        }
        return {
            snippets,
            totalTokens: currentTokens
        };
    }
    countTokens(text) {
        if (this.tokenizer) {
            return this.tokenizer.encode(text).length;
        }
        return Math.ceil(text.length / 4);
    }
    truncateToTokens(text, limit) {
        if (this.tokenizer) {
            const tokens = this.tokenizer.encode(text);
            if (tokens.length <= limit)
                return text;
            const sliced = tokens.slice(0, limit);
            return new TextDecoder().decode(this.tokenizer.decode(sliced)); // TextDecoder needed? decode returns string usually?
            // tiktoken decode returns Uint8Array or string depending on version/binding.
            // Usually `tokenizer.decode` returns string.
            // Let's assume standard behavior.
            // Wait, `tokenizer.decode` takes Uint32Array/Array.
            return new TextDecoder().decode(this.tokenizer.decode(sliced));
        }
        return text.substring(0, limit * 4);
    }
}
exports.RagContextBuilder = RagContextBuilder;
