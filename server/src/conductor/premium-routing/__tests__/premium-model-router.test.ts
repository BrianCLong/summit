import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { PremiumModelRouter } from '../premium-model-router.js';

const baseRequest = {
  query: 'Analyze recent events and provide a concise summary.',
  context: {
    userId: 'user-1',
    tenantId: 'tenant-1',
    taskType: 'analysis',
    complexity: 0.4,
    budget: 10,
    urgency: 'medium' as const,
    qualityRequirement: 0.7,
    expectedOutputLength: 512,
  },
  constraints: {},
};

describe('PremiumModelRouter', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, DATABASE_URL: '', REDIS_URL: '' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('constructs and connects without throwing', async () => {
    const router = new PremiumModelRouter();
    await router.connect();
    expect(true).toBe(true);
  });

  test('returns a routing decision with required fields', async () => {
    const router = new PremiumModelRouter();
    const decision = await router.routeToOptimalModel(baseRequest);

    expect(decision.selectedModel).toBeDefined();
    expect(typeof decision.confidence).toBe('number');
    expect(decision.routingStrategy).toBeDefined();
    expect(Array.isArray(decision.fallbackModels)).toBe(true);
    expect(decision.fallbackModels.length).toBeGreaterThan(0);
  });

  test('basic mode returns deterministic default when env vars are missing', async () => {
    const router = new PremiumModelRouter();
    const decision = await router.routeToOptimalModel(baseRequest);

    expect(decision.selectedModel.id).toBe('gpt-4o');
    expect(decision.routingStrategy).toBe('basic-default');
    expect(decision.reasoning).toMatch(/default premium model/i);
  });
});
