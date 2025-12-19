import {
  ProviderAdapter,
  LLMRequest,
  LLMResponse,
  ModelCapability,
  ProviderType,
} from '../types.js';
import { randomUUID } from 'crypto';

export abstract class BaseProvider implements ProviderAdapter {
  abstract name: ProviderType;

  protected capabilities: ModelCapability[] = [];

  abstract generate(request: LLMRequest): Promise<LLMResponse>;

  isHealthy(): boolean {
    return true; // Simplified for now
  }

  supports(model: string): boolean {
    return this.capabilities.some(c => c.name === model);
  }

  estimateCost(request: LLMRequest): number {
    const model = request.model || this.capabilities[0].name;
    const capability = this.capabilities.find((c) => c.name === model);
    if (!capability) return Infinity;

    const inputLength = request.messages.reduce((acc, m) => acc + (m.content?.length || 0), 0);
    const inputTokens = inputLength / 4;
    const outputTokens = request.maxTokens || 100;

    return (
      (inputTokens / 1000) * capability.inputCostPer1k +
      (outputTokens / 1000) * capability.outputCostPer1k
    );
  }

  getCapabilities(): ModelCapability[] {
    return this.capabilities;
  }

  protected createResponse(
    request: LLMRequest,
    text: string,
    usage: { prompt: number; completion: number },
    model: string,
    startTime: number
  ): LLMResponse {
    const latencyMs = Date.now() - startTime;
    const capability = this.capabilities.find(c => c.name === model);
    let cost = 0;

    if (capability) {
        cost = (usage.prompt / 1000) * capability.inputCostPer1k + (usage.completion / 1000) * capability.outputCostPer1k;
    }

    return {
      id: randomUUID(),
      requestId: request.id,
      provider: this.name,
      model: model,
      text: text,
      usage: {
        promptTokens: usage.prompt,
        completionTokens: usage.completion,
        totalTokens: usage.prompt + usage.completion,
        cost
      },
      latencyMs,
      cached: false,
      ok: true
    };
  }
}
