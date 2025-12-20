// @ts-nocheck
import { BaseProvider } from './base.js';
import { LLMRequest, LLMResponse, ProviderType } from '../types.js';

export class OpenAIProvider extends BaseProvider {
  name: ProviderType = 'openai';

  constructor(private apiKey: string) {
    super();
    this.capabilities = [
      {
        name: 'gpt-4o',
        contextWindow: 128000,
        inputCostPer1k: 0.005,
        outputCostPer1k: 0.015,
        tags: ['smart', 'vision', 'reasoning']
      },
      {
        name: 'gpt-4o-mini',
        contextWindow: 128000,
        inputCostPer1k: 0.00015,
        outputCostPer1k: 0.0006,
        tags: ['fast', 'cheap']
      }
    ];
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    const model = request.model || 'gpt-4o-mini';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        tools: request.tools,
        tool_choice: request.toolChoice
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    // Handle potential null content if tool_calls are present
    const text = choice.message.content || '';
    const toolCalls = choice.message.tool_calls;

    const usage = {
      prompt: data.usage.prompt_tokens,
      completion: data.usage.completion_tokens
    };

    const resp = this.createResponse(request, text, usage, data.model, startTime);
    resp.toolCalls = toolCalls;
    return resp;
  }
}
