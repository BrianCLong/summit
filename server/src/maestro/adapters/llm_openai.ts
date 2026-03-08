import { CostMeter, LLMCallMetadata, LLMUsage } from '../cost_meter.js';

export interface LLMResult {
  content: string;
  usage: LLMUsage;
  costUSD: number;
  feature?: string;
  tenantId?: string;
  environment?: string;
}

export class OpenAILLM {
  constructor(
    private apiKey: string,
    private costMeter: CostMeter,
  ) { }

  async callCompletion(
    runId: string,
    taskId: string,
    params: { model: string; messages: any[]; tools?: any[] },
    metadata: LLMCallMetadata = {},
  ): Promise<LLMResult> {
    const modelName = params.model.replace(/^openai:/, '');

    const raw = await this.fakeOpenAIChatCompletion({ ...params, model: modelName });

    const usage: LLMUsage = {
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
  private async fakeOpenAIChatCompletion(params: { model: string; messages: any[]; tools?: any[] }) {
    const lastUserMessage = params.messages.filter(m => m.role === 'user').pop()?.content || '';
    let content = 'This is a simulated response from OpenAI.';
    let tool_calls: any[] | undefined = undefined;

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

export interface LLMResult {
  content: string;
  tool_calls?: any[];
  usage: LLMUsage;
  costUSD: number;
  feature?: string;
  tenantId?: string;
  environment?: string;
}
