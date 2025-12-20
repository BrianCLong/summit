import { RouterService } from '../../platform/llm-core/router.js';
import { ModelProfile, RoutingRule, CostEvent } from '../../platform/llm-core/types.js';
import { describe, test, expect, jest } from '@jest/globals';

describe('LLM Router', () => {
  const mockProfile: ModelProfile = {
    id: 'gpt-4o',
    provider: 'openai',
    modelName: 'gpt-4o',
    maxTokens: 128000,
    costPer1KTokensInput: 0.005,
    costPer1KTokensOutput: 0.015,
    strengths: ['reasoning'],
    weaknesses: [],
    safetyConstraints: []
  };

  const mockRule: RoutingRule = {
    id: 'rule-1',
    taskCategory: 'PLANNING',
    preferredModels: ['gpt-4o'],
    fallbackModels: [],
    governanceConstraints: []
  };

  // Mock collector
  const mockRecord = jest.fn(async (event: CostEvent) => { return Promise.resolve(); });
  const mockCollector = { record: mockRecord };

  const router = new RouterService([mockProfile], [mockRule], mockCollector);

  test('should route to preferred model for allowed category', async () => {
    const profile = await router.selectModel({
      taskCategory: 'PLANNING',
      tenantId: 't1',
      riskLevel: 'LOW'
    });
    expect(profile.id).toBe('gpt-4o');
  });

  test('should estimate cost correctly', () => {
    const cost = router.estimateCost(mockProfile, 1000, 1000);
    expect(cost).toBeCloseTo(0.02);
  });

  test('should emit cost event when selecting model', async () => {
    await router.selectModel({
      taskCategory: 'PLANNING',
      tenantId: 't1',
      riskLevel: 'LOW'
    });
    expect(mockCollector.record).toHaveBeenCalled();
  });

  test('should throw if no rule exists', async () => {
    await expect(router.selectModel({
      taskCategory: 'CODING' as any,
      tenantId: 't1',
      riskLevel: 'LOW'
    })).rejects.toThrow();
  });
});
