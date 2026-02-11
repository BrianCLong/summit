
import { LLMProvider, LLMRequest, LLMResult, ProviderConfig } from '../interfaces.js';

export class OpenAIProvider implements LLMProvider {
  name = 'openai';

  supports(taskType: string): boolean {
    return true; // Supports most tasks
  }

  estimate(taskType: string, inputTokens: number): { costUsd: number; p95ms: number } {
    return { costUsd: 0.0000025 * inputTokens, p95ms: 800 }; // Rough estimate
  }

  async call(request: LLMRequest, config?: ProviderConfig): Promise<LLMResult> {
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
          temperature: request.metadata?.temperature ?? 0,
          max_tokens: request.metadata?.maxTokens,
          seed: request.metadata?.seed ?? 42, // Default seed for determinism
          response_format: request.metadata?.responseFormat === 'json' ? { type: 'json_object' } : undefined,
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
    } catch (error: any) {
      return { ok: false, error: error.message, provider: this.name, model };
    }
  }
}
