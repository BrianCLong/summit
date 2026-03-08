"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAILLM = void 0;
class OpenAILLM {
    apiKey;
    costMeter;
    constructor(apiKey, costMeter) {
        this.apiKey = apiKey;
        this.costMeter = costMeter;
    }
    async callCompletion(runId, taskId, params, metadata = {}) {
        const modelName = params.model.replace(/^openai:/, '');
        const raw = await this.fakeOpenAIChatCompletion({ ...params, model: modelName });
        const usage = {
            model: modelName,
            vendor: 'openai',
            inputTokens: raw.usage.prompt_tokens,
            outputTokens: raw.usage.completion_tokens,
        };
        const sample = await this.costMeter.record(runId, taskId, usage, metadata);
        const message = raw.choices[0].message;
        return {
            content: message.content || '',
            tool_calls: message.tool_calls,
            usage,
            costUSD: sample.cost,
            feature: metadata.feature,
            tenantId: metadata.tenantId,
            environment: metadata.environment,
        };
    }
    // Helper method to simulate OpenAI call
    async fakeOpenAIChatCompletion(params) {
        const lastUserMessage = params.messages.filter(m => m.role === 'user').pop()?.content || '';
        let content = 'This is a simulated response from OpenAI.';
        let tool_calls = undefined;
        // Simulate tool usage if requested and relevant
        if (params.tools && (lastUserMessage.toLowerCase().includes('simulate') || lastUserMessage.toLowerCase().includes('verify'))) {
            const tool = params.tools.find(t => t.function?.name === 'narrative.simulate');
            if (tool) {
                content = 'I will run a simulation to verify the narrative impact.';
                tool_calls = [{
                        id: 'call_' + Math.random().toString(36).substring(7),
                        type: 'function',
                        function: {
                            name: 'narrative.simulate',
                            arguments: JSON.stringify({ rootId: 'node-123', ticks: 5 })
                        }
                    }];
            }
        }
        return {
            id: 'chatcmpl-123',
            object: 'chat.completion',
            created: Date.now(),
            model: params.model,
            choices: [
                {
                    index: 0,
                    message: {
                        role: 'assistant',
                        content,
                        tool_calls
                    },
                    finish_reason: tool_calls ? 'tool_calls' : 'stop',
                },
            ],
            usage: {
                prompt_tokens: 10,
                completion_tokens: 20,
                total_tokens: 30,
            },
        };
    }
}
exports.OpenAILLM = OpenAILLM;
