
import { LLMProvider, LLMRequest, LLMResult, ProviderConfig } from '../interfaces.js';

export class MockProvider implements LLMProvider {
  name = 'mock';

  supports(taskType: string): boolean {
    return true;
  }

  estimate(taskType: string, inputTokens: number): { costUsd: number; p95ms: number } {
    return { costUsd: 0, p95ms: 10 };
  }

  async call(request: LLMRequest, config?: ProviderConfig): Promise<LLMResult> {
    const model = config?.models?.[request.taskType] || 'mock-model';

    // Simulate latency
    await new Promise(resolve => setTimeout(resolve, 50));

    // Simulate error if requested via metadata
    if (request.metadata?.mockError) {
        return { ok: false, error: 'Simulated mock error', provider: this.name, model };
    }

    return {
      ok: true,
      text: `Mock response for: ${request.prompt || 'no prompt'}. Task: ${request.taskType}`,
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      model,
      provider: this.name,
    };
  }
}
