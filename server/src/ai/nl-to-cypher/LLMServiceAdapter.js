"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMServiceAdapter = void 0;
class LLMServiceAdapter {
    llmService;
    constructor(llmService) {
        this.llmService = llmService;
    }
    async generate(prompt) {
        // complete() takes prompt first, then options
        return this.llmService.complete(prompt, {
            temperature: 0,
            // Default model is handled by LLMService config if not specified
            // but we can specify 'gpt-4' or similar if needed.
            // We'll leave it to default or config to be more flexible.
        });
    }
}
exports.LLMServiceAdapter = LLMServiceAdapter;
