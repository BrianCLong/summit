"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAICompatibleClient = void 0;
class OpenAICompatibleClient {
    baseUrl;
    apiKey;
    constructor(baseUrl, apiKey) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.apiKey = apiKey;
    }
    async complete(prompt, options) {
        const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
            },
            body: JSON.stringify({
                model: options.model,
                temperature: options.temperature ?? 0,
                max_tokens: options.maxTokens ?? 512,
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
            }),
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`LLM request failed: ${response.status} ${text}`);
        }
        const payload = (await response.json());
        const content = payload.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error('LLM response missing content');
        }
        return content;
    }
}
exports.OpenAICompatibleClient = OpenAICompatibleClient;
