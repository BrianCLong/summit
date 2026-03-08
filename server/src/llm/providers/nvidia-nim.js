"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NvidiaNimProvider = void 0;
const log_redaction_js_1 = require("../safety/log_redaction.js");
class NvidiaNimProvider {
    id = 'nvidia-nim';
    apiKey;
    baseUrl;
    defaultModel;
    modeDefault;
    enableMultimodal;
    constructor(config) {
        this.apiKey = config.apiKey || process.env.NVIDIA_NIM_API_KEY || '';
        this.baseUrl = config.baseUrl || 'https://integrate.api.nvidia.com/v1';
        this.defaultModel = config.model || 'moonshotai/kimi-k2.5';
        this.modeDefault = config.modeDefault || 'instant';
        this.enableMultimodal = config.enableMultimodal || false;
    }
    supports(model) {
        return model === this.defaultModel || model.startsWith('moonshotai/');
    }
    async chat(request) {
        if (!this.apiKey) {
            throw new Error('Missing NVIDIA_NIM_API_KEY');
        }
        const url = `${this.baseUrl.replace(/\/$/, '')}/chat/completions`;
        const messages = request.messages.map(m => {
            if (Array.isArray(m.content)) {
                if (!this.enableMultimodal) {
                    throw new Error('Multimodal content is disabled for NVIDIA NIM provider');
                }
                return {
                    role: m.role,
                    content: m.content
                };
            }
            return {
                role: m.role,
                content: m.content
            };
        });
        const body = {
            model: request.model || this.defaultModel,
            messages,
            max_tokens: 1024,
            temperature: request.temperature ?? 0.7,
        };
        // Mode handling: default to config default unless requested
        const mode = request.mode ?? this.modeDefault;
        if (mode === 'instant') {
            body.extra_body = { thinking: { type: 'disabled' } };
        }
        if (request.jsonMode) {
            body.response_format = { type: 'json_object' };
        }
        if (request.tools && request.tools.length > 0) {
            body.tools = request.tools.map(t => ({
                type: 'function',
                function: {
                    name: t.name,
                    description: t.description,
                    parameters: t.inputSchema
                }
            }));
        }
        let response;
        let retries = 0;
        const maxRetries = 3;
        let lastError = null;
        while (retries <= maxRetries) {
            try {
                response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },
                    body: JSON.stringify(body)
                });
                if (response.ok) {
                    const data = await response.json();
                    const choice = data.choices?.[0];
                    return {
                        provider: 'nvidia-nim',
                        model: data.model || request.model,
                        content: choice?.message?.content || null,
                        toolCalls: choice?.message?.tool_calls?.map((tc) => ({
                            toolName: tc.function.name,
                            args: JSON.parse(tc.function.arguments),
                            id: tc.id
                        })),
                        usage: {
                            inputTokens: data.usage?.prompt_tokens || 0,
                            outputTokens: data.usage?.completion_tokens || 0,
                            totalTokens: data.usage?.total_tokens || 0,
                            costUsd: 0 // Free trial
                        },
                        raw: data
                    };
                }
                const isRetryable = response.status === 429 || (response.status >= 500 && response.status <= 504);
                if (!isRetryable || retries === maxRetries) {
                    const errorText = await response.text();
                    throw new Error((0, log_redaction_js_1.redactSecrets)(`NVIDIA NIM error ${response.status}: ${errorText}`));
                }
                // Handle Retry-After header
                let delay = Math.pow(2, retries) * 1000;
                const retryAfter = response.headers.get('Retry-After');
                if (retryAfter) {
                    const parsed = parseInt(retryAfter, 10);
                    if (!isNaN(parsed)) {
                        delay = parsed * 1000;
                    }
                }
                retries++;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            catch (e) {
                lastError = e;
                if (retries === maxRetries || (e instanceof Error && !e.message.includes('NVIDIA NIM error'))) {
                    throw e;
                }
                retries++;
                const delay = Math.pow(2, retries - 1) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw lastError || new Error('Max retries exceeded');
    }
}
exports.NvidiaNimProvider = NvidiaNimProvider;
