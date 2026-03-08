"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicProvider = void 0;
class AnthropicProvider {
    name = 'anthropic';
    supports(taskType) {
        return true;
    }
    estimate(taskType, inputTokens) {
        return { costUsd: 0.000003 * inputTokens, p95ms: 1200 };
    }
    async call(request, config) {
        const apiKey = process.env[config?.apiKeyEnv || 'ANTHROPIC_API_KEY'];
        if (!apiKey) {
            return { ok: false, error: `Missing API Key for ${this.name}` };
        }
        const model = config?.models?.[request.taskType] || 'claude-3-haiku-20240307';
        const messages = request.messages || (request.prompt ? [{ role: 'user', content: request.prompt }] : []);
        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model,
                    messages,
                    max_tokens: 1024, // Default
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                return { ok: false, error: data.error?.message || response.statusText, provider: this.name, model };
            }
            const text = Array.isArray(data.content)
                ? data.content.map((chunk) => chunk?.text || '').join('\n')
                : data.content?.[0]?.text;
            return {
                ok: true,
                text,
                usage: {
                    prompt_tokens: data.usage?.input_tokens || 0,
                    completion_tokens: data.usage?.output_tokens || 0,
                    total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
                },
                model: data.model,
                provider: this.name,
            };
        }
        catch (error) {
            return { ok: false, error: error.message, provider: this.name, model };
        }
    }
}
exports.AnthropicProvider = AnthropicProvider;
