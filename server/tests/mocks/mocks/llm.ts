export interface LlmRequest {
  prompt: string;
  model?: string;
  temperature?: number;
}

export interface LlmResponse {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class MockLlmProvider {
  private scenarios: Array<{ pattern: RegExp; response: string }> = [];

  constructor() {
    // Default fallback
    this.addScenario(/.*/, 'I am a mock LLM. This is a default response.');
  }

  addScenario(pattern: RegExp, response: string) {
    // Add to beginning so it takes precedence
    this.scenarios.unshift({ pattern, response });
  }

  async generate(request: LlmRequest): Promise<LlmResponse> {
    const match = this.scenarios.find((s) => s.pattern.test(request.prompt));
    const text = match ? match.response : 'No matching mock scenario found.';

    return {
      text,
      usage: {
        promptTokens: request.prompt.length / 4,
        completionTokens: text.length / 4,
        totalTokens: (request.prompt.length + text.length) / 4,
      },
    };
  }

  reset() {
    this.scenarios = [];
    this.addScenario(/.*/, 'I am a mock LLM. This is a default response.');
  }
}

export const mockLlmProvider = new MockLlmProvider();
