"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIChatAdapter = void 0;
class OpenAIChatAdapter {
    name = 'openai:chat-completions';
    defaultModel;
    defaultSystemPrompt;
    constructor(options = {}) {
        this.defaultModel = options.model ?? 'gpt-4.1-mini';
        this.defaultSystemPrompt = options.systemPrompt;
    }
    format(compiled, options = {}) {
        const overrideModel = typeof options.model === 'string' ? options.model : undefined;
        const overrideSystem = typeof options.systemPrompt === 'string'
            ? options.systemPrompt
            : undefined;
        return {
            model: overrideModel ?? this.defaultModel,
            messages: buildMessages(compiled, overrideSystem ?? this.defaultSystemPrompt),
            metadata: {
                template: compiled.name,
                slots: Object.keys(compiled.slots),
                values: compiled.values,
            },
        };
    }
}
exports.OpenAIChatAdapter = OpenAIChatAdapter;
function buildMessages(compiled, systemPrompt) {
    const messages = [];
    if (systemPrompt ?? compiled.metadata?.systemPrompt) {
        messages.push({
            role: 'system',
            content: String(systemPrompt ?? compiled.metadata?.systemPrompt),
        });
    }
    else if (compiled.description) {
        messages.push({ role: 'system', content: compiled.description });
    }
    messages.push({ role: 'user', content: compiled.rendered });
    return messages;
}
