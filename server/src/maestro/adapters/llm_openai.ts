import { CostMeter, LLMUsage } from '../cost_meter';

export interface LLMResult {
  content: string;
  usage: LLMUsage;
}

export class OpenAILLM {
  constructor(
    private apiKey: string,
    private costMeter: CostMeter,
  ) {}

  async callCompletion(
    runId: string,
    taskId: string,
    params: { model: string; messages: any[] },
  ): Promise<string> {
    // Strip prefix if present, e.g. "openai:gpt-4" -> "gpt-4"
    const modelName = params.model.replace(/^openai:/, '');

    // pseudo-code — plug in real OpenAI client
    const raw = await this.fakeOpenAIChatCompletion({ ...params, model: modelName });

    const usage: LLMUsage = {
      model: modelName,
      vendor: 'openai',
      inputTokens: raw.usage.prompt_tokens,
      outputTokens: raw.usage.completion_tokens,
    };

    await this.costMeter.record(runId, taskId, usage);

    return raw.choices[0].message.content;
  }

  // Helper method to simulate OpenAI call
  private async fakeOpenAIChatCompletion(params: { model: string; messages: any[] }) {
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
            content: 'This is a simulated response from OpenAI.',
          },
          finish_reason: 'stop',
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
