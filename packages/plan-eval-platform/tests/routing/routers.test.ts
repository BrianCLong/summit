import { describe, it, expect, beforeEach } from 'vitest';
import { RandomRouter, createRandomRouter } from '../../src/routing/random-router.js';
import { GreedyCostRouter, createGreedyCostRouter } from '../../src/routing/greedy-cost-router.js';
import { AdaptiveRouter, createAdaptiveRouter } from '../../src/routing/adaptive-router.js';
import { createRouter } from '../../src/routing/index.js';
import type { ToolCandidate, ScenarioStep } from '../../src/types.js';

const mockCandidates: ToolCandidate[] = [
  {
    toolId: 'code_interpreter',
    estimatedCost: 0.001,
    estimatedLatencyMs: 150,
    estimatedQuality: 0.9,
    capabilities: ['execute_code'],
  },
  {
    toolId: 'web_browse',
    estimatedCost: 0.002,
    estimatedLatencyMs: 500,
    estimatedQuality: 0.85,
    capabilities: ['web_search'],
  },
  {
    toolId: 'file_search',
    estimatedCost: 0.0005,
    estimatedLatencyMs: 50,
    estimatedQuality: 0.7,
    capabilities: ['search'],
  },
];

const mockStep: ScenarioStep = {
  id: 'step-1',
  type: 'prompt',
  allowedTools: ['code_interpreter', 'web_browse', 'file_search'],
};

describe('RandomRouter', () => {
  let router: RandomRouter;

  beforeEach(() => {
    router = new RandomRouter();
  });

  it('should select a candidate randomly', async () => {
    const decision = await router.route(mockStep, mockCandidates);

    expect(mockCandidates.map((c) => c.toolId)).toContain(decision.selectedTool);
  });

  it('should track selection distribution', async () => {
    // Run multiple times to get distribution
    for (let i = 0; i < 100; i++) {
      await router.route(mockStep, mockCandidates);
    }

    const distribution = router.getSelectionDistribution();
    expect(distribution.size).toBeGreaterThan(0);
  });

  it('should throw on empty candidates', async () => {
    await expect(router.route(mockStep, [])).rejects.toThrow('No candidates available');
  });

  it('should filter by latency budget', async () => {
    const strictRouter = new RandomRouter({ latencyBudgetMs: 100 });
    const decision = await strictRouter.route(mockStep, mockCandidates);

    // Should only select file_search (50ms) since others exceed budget
    expect(decision.selectedTool).toBe('file_search');
  });
});

describe('GreedyCostRouter', () => {
  let router: GreedyCostRouter;

  beforeEach(() => {
    router = new GreedyCostRouter({ costWeight: 0.5 });
  });

  it('should select highest scored candidate', async () => {
    const decision = await router.route(mockStep, mockCandidates);

    expect(decision.selectedTool).toBeDefined();
    expect(decision.score).toBeDefined();
    expect(decision.reasoning.length).toBeGreaterThan(0);
  });

  it('should prefer quality when costWeight is 0', async () => {
    const qualityRouter = new GreedyCostRouter({ costWeight: 0 });
    const decision = await qualityRouter.route(mockStep, mockCandidates);

    // code_interpreter has highest quality (0.9)
    expect(decision.selectedTool).toBe('code_interpreter');
  });

  it('should prefer cost when costWeight is 1', async () => {
    const costRouter = new GreedyCostRouter({ costWeight: 1 });
    const decision = await costRouter.route(mockStep, mockCandidates);

    // file_search has lowest cost (0.0005)
    expect(decision.selectedTool).toBe('file_search');
  });

  it('should record outcomes for calibration', async () => {
    router.recordOutcome('code_interpreter', 0.95, 0.0012, 160);
    router.recordOutcome('code_interpreter', 0.88, 0.001, 140);

    const stats = router.getCalibrationStats();
    expect(stats.has('code_interpreter')).toBe(true);
    expect(stats.get('code_interpreter')!.samples).toBe(2);
  });

  it('should include alternatives in decision', async () => {
    const decision = await router.route(mockStep, mockCandidates);

    expect(decision.alternatives.length).toBeGreaterThan(0);
    expect(decision.alternatives[0].toolId).toBeDefined();
    expect(decision.alternatives[0].reason).toBeDefined();
  });
});

describe('AdaptiveRouter', () => {
  let router: AdaptiveRouter;

  beforeEach(() => {
    router = new AdaptiveRouter({ learningRate: 0.2 });
  });

  it('should route with adaptive scoring', async () => {
    const decision = await router.route(mockStep, mockCandidates, {
      category: 'code_correction',
    });

    expect(decision.selectedTool).toBeDefined();
    expect(decision.reasoning).toContain('Adaptive routing (learned weights)');
  });

  it('should learn from outcomes', async () => {
    // Record successful outcomes for code_interpreter
    for (let i = 0; i < 10; i++) {
      router.recordEvalOutcome('code_interpreter', 'code_correction', true, 0.001, 150, 0.9);
    }

    const weights = router.getLearnedWeights();
    expect(weights.toolWeights.get('code_interpreter')).toBeGreaterThan(1);
  });

  it('should maintain category-specific weights', async () => {
    router.recordEvalOutcome('code_interpreter', 'code_correction', true, 0.001, 150, 0.9);
    router.recordEvalOutcome('web_browse', 'data_analysis', true, 0.002, 500, 0.85);

    const weights = router.getLearnedWeights();
    expect(weights.categoryWeights.has('code_correction')).toBe(true);
    expect(weights.categoryWeights.has('data_analysis')).toBe(true);
  });

  it('should export and import model', async () => {
    router.recordEvalOutcome('code_interpreter', 'test', true, 0.001, 100, 0.9);

    const exported = router.exportModel();
    expect(exported).toBeDefined();

    const newRouter = new AdaptiveRouter();
    newRouter.importModel(exported);

    const weights = newRouter.getLearnedWeights();
    expect(weights.toolWeights.has('code_interpreter')).toBe(true);
  });

  it('should adapt cost weight based on performance', async () => {
    // Record many failures to trigger cost weight reduction
    for (let i = 0; i < 50; i++) {
      router.recordEvalOutcome('tool', 'cat', false, 0.01, 1000, 0.3);
    }

    const initialWeight = router.getConfig().costWeight;
    router.adaptCostWeight();
    const adaptedWeight = router.getConfig().costWeight;

    // Should decrease cost weight when success rate is low
    expect(adaptedWeight).toBeLessThan(initialWeight);
  });
});

describe('createRouter factory', () => {
  it('should create random router', () => {
    const router = createRouter('random');
    expect(router.getType()).toBe('random');
  });

  it('should create greedy cost router', () => {
    const router = createRouter('greedy_cost');
    expect(router.getType()).toBe('greedy_cost');
  });

  it('should create adaptive router', () => {
    const router = createRouter('adaptive');
    expect(router.getType()).toBe('adaptive');
  });

  it('should create quality-first router (greedy with costWeight=0)', () => {
    const router = createRouter('quality_first');
    expect(router.getConfig().costWeight).toBe(0);
  });

  it('should throw on unknown type', () => {
    expect(() => createRouter('unknown' as any)).toThrow('Unknown router type');
  });
});
