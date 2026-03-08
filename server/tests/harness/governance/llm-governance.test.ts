import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { LLMRouter } from '../llm/router.js';
import { MockProvider } from '../llm/providers/mock.js';
import { CostControlPolicy } from '../llm/policies/index.js';
import { LLMRequest, ProviderType } from '../llm/types.js';

class FastProvider extends MockProvider {
  name: ProviderType = 'mock';

  constructor() {
    super();
    (this as unknown as { capabilities: unknown[] }).capabilities = [
      {
        name: 'mock-fast',
        contextWindow: 4000,
        inputCostPer1k: 0,
        outputCostPer1k: 0,
        tags: ['fast'],
        avgLatencyMs: 20,
      },
    ];
  }

  async generate(request: LLMRequest) {
    return {
      id: 'fast-resp',
      requestId: request.id,
      provider: this.name,
      model: 'mock-fast',
      text: 'fast-ok',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, cost: 0 },
      latencyMs: 10,
      cached: false,
      ok: true,
    };
  }
}

class PremiumProvider extends MockProvider {
  name: ProviderType = 'openai';

  constructor() {
    super();
    (this as any).capabilities = [
      {
        name: 'mock-premium',
        contextWindow: 4000,
        inputCostPer1k: 1,
        outputCostPer1k: 1,
        tags: ['premium'],
        avgLatencyMs: 100,
      },
    ];
  }

  estimateCost(): number {
    return 5;
  }

  async generate(request: LLMRequest) {
    return {
      id: 'premium-resp',
      requestId: request.id,
      provider: this.name,
      model: 'mock-premium',
      text: 'premium-ok',
      usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30, cost: 5 },
      latencyMs: 50,
      cached: false,
      ok: true,
    };
  }
}

const baseRequest: Partial<LLMRequest> = {
  tenantId: 'test',
  messages: [{ role: 'user', content: 'hi' }],
  budget: { maxCost: 0.05 },
};

describe('LLM governance router', () => {
  it('routes to the cheapest provider within budget', async () => {
    const router = new LLMRouter({
      providers: [new FastProvider(), new PremiumProvider()],
      policies: [new CostControlPolicy()],
    });

    const response = await router.route({ ...baseRequest, id: 'policy-ok' });
    expect((response as any).ok).toBe(true);
    expect(response.provider).toBe('mock');
  });

  it('routes to premium when requested via tags and budget allows', async () => {
    const router = new LLMRouter({
      providers: [new FastProvider(), new PremiumProvider()],
      policies: [new CostControlPolicy(10)],
    });

    const response = await router.route({
      ...baseRequest,
      id: 'premium-ok',
      tags: ['premium'],
      budget: { maxCost: 10 },
    });

    expect((response as any).ok).toBe(true);
    expect(response.provider).toBe('openai');
  });

  it('rejects when all providers are filtered by budget', async () => {
    const router = new LLMRouter({
      providers: [new PremiumProvider()],
      policies: [new CostControlPolicy(0.1)],
    });

    await expect(
      router.route({
        ...baseRequest,
        id: 'budget-blocked',
        tags: ['premium'],
        budget: { maxCost: 0 },
      }),
    ).rejects.toThrow('All providers filtered out by policies');
  });
});
