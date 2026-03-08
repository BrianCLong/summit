"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockLlmProvider = exports.MockLlmProvider = void 0;
class MockLlmProvider {
    scenarios = [];
    constructor() {
        // Default fallback
        this.addScenario(/.*/, 'I am a mock LLM. This is a default response.');
    }
    addScenario(pattern, response) {
        // Add to beginning so it takes precedence
        this.scenarios.unshift({ pattern, response });
    }
    async generate(request) {
        const match = this.scenarios.find((s) => s.pattern.test(request.prompt));
        const text = match ? match.response : 'No matching mock scenario found.';
        return {
            text,
            usage: {
                promptTokens: request.prompt.length / 4,
                completionTokens: text.length / 4,
                totalTokens: (request.prompt.length + text.length) / 4,
            },
        };
    }
    reset() {
        this.scenarios = [];
        this.addScenario(/.*/, 'I am a mock LLM. This is a default response.');
    }
}
exports.MockLlmProvider = MockLlmProvider;
exports.mockLlmProvider = new MockLlmProvider();
