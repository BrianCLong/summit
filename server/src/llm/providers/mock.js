"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockProvider = void 0;
const base_js_1 = require("./base.js");
class MockProvider extends base_js_1.BaseProvider {
    name = 'mock';
    constructor() {
        super();
        this.capabilities = [
            {
                name: 'mock-model',
                contextWindow: 1000,
                inputCostPer1k: 0,
                outputCostPer1k: 0,
                tags: ['test', 'fast']
            }
        ];
    }
    async generate(request) {
        const startTime = Date.now();
        const model = 'mock-model';
        // Simulate latency
        await new Promise(resolve => setTimeout(resolve, 50));
        const text = "This is a mock response.";
        const usage = { prompt: 10, completion: 5 };
        return this.createResponse(request, text, usage, model, startTime);
    }
}
exports.MockProvider = MockProvider;
