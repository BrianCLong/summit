"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenAwareRetriever = void 0;
const utils_js_1 = require("./utils.js");
const DEFAULT_MIN_RELEVANCE = 0.5;
class TokenAwareRetriever {
    embed;
    tokenBudget;
    tokenEstimator;
    minimumRelevance;
    constructor(options) {
        this.embed = options.embed;
        this.tokenBudget = options.tokenBudget;
        this.tokenEstimator = options.estimateTokens ?? utils_js_1.defaultTokenEstimator;
        this.minimumRelevance = options.minimumRelevance ?? DEFAULT_MIN_RELEVANCE;
    }
    async retrieve(query, documents) {
        const queryVector = await this.embed(query);
        const scored = [];
        for (const document of documents) {
            const vector = await this.embed(document.text);
            const saliency = (0, utils_js_1.clampValue)((0, utils_js_1.cosineSimilarity)(queryVector, vector), 0, 1);
            const tokenEstimate = this.tokenEstimator(document.text);
            if (saliency >= this.minimumRelevance) {
                scored.push({ ...document, saliency, tokenEstimate });
            }
        }
        scored.sort((a, b) => b.saliency - a.saliency);
        const selected = [];
        let usedTokens = 0;
        for (const document of scored) {
            if (usedTokens + document.tokenEstimate > this.tokenBudget) {
                continue;
            }
            usedTokens += document.tokenEstimate;
            selected.push(document);
            if (usedTokens >= this.tokenBudget) {
                break;
            }
        }
        return { documents: selected, usedTokens };
    }
}
exports.TokenAwareRetriever = TokenAwareRetriever;
