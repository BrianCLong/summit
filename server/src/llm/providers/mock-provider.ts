
import { LlmProvider, ProviderId, ChatCompletionRequest, ChatCompletionResult } from '../types';

export class MockProvider implements LlmProvider {
  id: ProviderId = 'mock';

  supports(): boolean {
    return true;
  }

  async chat(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
    return {
      provider: 'mock',
      model: 'mock-model',
      content: 'This is a mock response from the MockProvider.',
      usage: {
        inputTokens: 10,
        outputTokens: 10,
        totalTokens: 20,
        costUsd: 0,
      },
    };
  }
}
