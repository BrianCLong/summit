"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
class OpenAIProvider {
    name = 'openai';
    supports(taskType) {
        return true; // Supports most tasks
    }
    estimate(taskType, inputTokens) {
        return { costUsd: 0.0000025 * inputTokens, p95ms: 800 }; // Rough estimate
    }
    async call(request, config) {
        const apiKey = process.env[config?.apiKeyEnv || 'OPENAI_API_KEY'];
        if (!apiKey) {
            return { ok: false, error: `Missing API Key for ${this.name}` };
        }
        const model = config?.models?.[request.taskType] || 'gpt-4o-mini';
        const messages = request.messages || (request.prompt ? [{ role: 'user', content: request.prompt }] : []);
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model,
                    messages,
                    // TODO: Add more options like temperature, max_tokens based on config or request
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                return { ok: false, error: data.error?.message || response.statusText, provider: this.name, model };
            }
            return {
                ok: true,
                text: data.choices?.[0]?.message?.content,
                usage: data.usage,
                model: data.model,
                provider: this.name,
            };
        }
        catch (error) {
            return { ok: false, error: error.message, provider: this.name, model };
        }
    }
}
exports.OpenAIProvider = OpenAIProvider;
