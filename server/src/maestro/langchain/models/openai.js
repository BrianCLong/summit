"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIAdapter = void 0;
class OpenAIAdapter {
    apiKey;
    baseUrl;
    constructor(apiKey, baseUrl) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
    }
    async chat(messages, opts = {}) {
        // Scaffold: integrate provider SDK here; respect opts.schema/tools/stream.
        return {
            id: `mock-${Date.now()}`,
            content: 'OK',
            usage: { tokens: 0, costUSD: 0 },
        };
    }
}
exports.OpenAIAdapter = OpenAIAdapter;
