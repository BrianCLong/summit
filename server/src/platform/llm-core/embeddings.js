"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockEmbeddingsService = void 0;
class MockEmbeddingsService {
    async embedText(input, opts) {
        const inputs = Array.isArray(input) ? input : [input];
        return inputs.map(text => ({
            vector: Array(1536).fill(0).map(() => Math.random()), // 1536 dim mock
            model: 'mock-embedding-v1',
            usage: {
                promptTokens: text.length / 4,
                totalTokens: text.length / 4
            }
        }));
    }
}
exports.MockEmbeddingsService = MockEmbeddingsService;
