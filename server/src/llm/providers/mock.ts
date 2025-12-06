import { ProviderAdapter, LLMRequest, LLMResponse, ProviderType } from '../types.js';
import { BaseProvider } from './base.js';

export class MockProvider extends BaseProvider {
  name: ProviderType = 'mock';

  constructor() {
    super();
    this.capabilities = [
      {
        name: 'mock-model',
        contextWindow: 1000,
        inputCostPer1k: 0,
        outputCostPer1k: 0,
        tags: ['test', 'fast']
      }
    ];
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    const model = 'mock-model';

    // Simulate latency
    await new Promise(resolve => setTimeout(resolve, 50));

    const text = "This is a mock response.";
    const usage = { prompt: 10, completion: 5 };

    return this.createResponse(request, text, usage, model, startTime);
  }
}
