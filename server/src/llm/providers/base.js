"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseProvider = void 0;
const crypto_1 = require("crypto");
class BaseProvider {
    capabilities = [];
    isHealthy() {
        return true; // Simplified for now
    }
    supports(model) {
        return this.capabilities.some(c => c.name === model);
    }
    estimateCost(request) {
        // Basic estimation
        const model = request.model || this.capabilities[0].name;
        const capability = this.capabilities.find(c => c.name === model);
        if (!capability)
            return Infinity;
        // Very rough estimate of input tokens
        const inputLength = request.messages.reduce((acc, m) => acc + m.content.length, 0);
        const inputTokens = inputLength / 4;
        // Estimate output tokens (rough guess or use maxTokens)
        const outputTokens = request.maxTokens || 100;
        return (inputTokens / 1000) * capability.inputCostPer1k + (outputTokens / 1000) * capability.outputCostPer1k;
    }
    getCapabilities() {
        return this.capabilities;
    }
    createResponse(request, text, usage, model, startTime) {
        const latencyMs = Date.now() - startTime;
        const capability = this.capabilities.find(c => c.name === model);
        let cost = 0;
        if (capability) {
            cost = (usage.prompt / 1000) * capability.inputCostPer1k + (usage.completion / 1000) * capability.outputCostPer1k;
        }
        return {
            id: (0, crypto_1.randomUUID)(),
            requestId: request.id,
            provider: this.name,
            model: model,
            text: text,
            usage: {
                promptTokens: usage.prompt,
                completionTokens: usage.completion,
                totalTokens: usage.prompt + usage.completion,
                cost
            },
            latencyMs,
            cached: false
        };
    }
}
exports.BaseProvider = BaseProvider;
