"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockProvider = void 0;
class MockProvider {
    name = 'mock';
    supports(taskType) {
        return true;
    }
    estimate(taskType, inputTokens) {
        return { costUsd: 0, p95ms: 10 };
    }
    async call(request, config) {
        const model = config?.models?.[request.taskType] || 'mock-model';
        // Simulate latency
        await new Promise(resolve => setTimeout(resolve, 50));
        // Simulate error if requested via metadata
        if (request.metadata?.mockError) {
            return { ok: false, error: 'Simulated mock error', provider: this.name, model };
        }
        return {
            ok: true,
            text: `Mock response for: ${request.prompt || 'no prompt'}. Task: ${request.taskType}`,
            usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
            model,
            provider: this.name,
        };
    }
}
exports.MockProvider = MockProvider;
