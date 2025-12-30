
import { LLMProvider, LLMRequest, LLMResult, ProviderConfig } from '../interfaces.js';

export class AnthropicProvider implements LLMProvider {
  name = 'anthropic';

  supports(taskType: string): boolean {
    return true;
  }

  estimate(taskType: string, inputTokens: number): { costUsd: number; p95ms: number } {
    return { costUsd: 0.000003 * inputTokens, p95ms: 1200 };
  }

  async call(request: LLMRequest, config?: ProviderConfig): Promise<LLMResult> {
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
        ? data.content.map((chunk: any) => chunk?.text || '').join('\n')
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
    } catch (error: any) {
      return { ok: false, error: error.message, provider: this.name, model };
    }
  }
}
