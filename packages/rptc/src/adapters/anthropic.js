"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicAdapter = void 0;
class AnthropicAdapter {
    name = 'anthropic:messages';
    defaultModel;
    defaultSystemPrompt;
    constructor(options = {}) {
        this.defaultModel = options.model ?? 'claude-3-5-sonnet-20241022';
        this.defaultSystemPrompt = options.systemPrompt;
    }
    format(compiled, options = {}) {
        const system = options.systemPrompt ??
            this.defaultSystemPrompt ??
            compiled.description;
        const model = options.model ?? this.defaultModel;
        return {
            model,
            system,
            messages: [
                {
                    role: 'user',
                    content: [{ type: 'text', text: compiled.rendered }],
                },
            ],
            metadata: {
                template: compiled.name,
                slots: compiled.slots,
                values: compiled.values,
            },
        };
    }
}
exports.AnthropicAdapter = AnthropicAdapter;
