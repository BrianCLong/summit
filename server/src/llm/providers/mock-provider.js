"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockProvider = void 0;
class MockProvider {
    id = 'mock';
    supports() {
        return true;
    }
    async chat(request) {
        return {
            provider: 'mock',
            model: 'mock-model',
            content: 'This is a mock response from the MockProvider.',
            usage: {
                inputTokens: 10,
                outputTokens: 10,
                totalTokens: 20,
                costUsd: 0,
            },
        };
    }
}
exports.MockProvider = MockProvider;
