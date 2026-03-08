"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const random_router_js_1 = require("../../src/routing/random-router.js");
const greedy_cost_router_js_1 = require("../../src/routing/greedy-cost-router.js");
const adaptive_router_js_1 = require("../../src/routing/adaptive-router.js");
const index_js_1 = require("../../src/routing/index.js");
const mockCandidates = [
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
const mockStep = {
    id: 'step-1',
    type: 'prompt',
    allowedTools: ['code_interpreter', 'web_browse', 'file_search'],
};
(0, vitest_1.describe)('RandomRouter', () => {
    let router;
    (0, vitest_1.beforeEach)(() => {
        router = new random_router_js_1.RandomRouter();
    });
    (0, vitest_1.it)('should select a candidate randomly', async () => {
        const decision = await router.route(mockStep, mockCandidates);
        (0, vitest_1.expect)(mockCandidates.map((c) => c.toolId)).toContain(decision.selectedTool);
    });
    (0, vitest_1.it)('should track selection distribution', async () => {
        // Run multiple times to get distribution
        for (let i = 0; i < 100; i++) {
            await router.route(mockStep, mockCandidates);
        }
        const distribution = router.getSelectionDistribution();
        (0, vitest_1.expect)(distribution.size).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('should throw on empty candidates', async () => {
        await (0, vitest_1.expect)(router.route(mockStep, [])).rejects.toThrow('No candidates available');
    });
    (0, vitest_1.it)('should filter by latency budget', async () => {
        const strictRouter = new random_router_js_1.RandomRouter({ latencyBudgetMs: 100 });
        const decision = await strictRouter.route(mockStep, mockCandidates);
        // Should only select file_search (50ms) since others exceed budget
        (0, vitest_1.expect)(decision.selectedTool).toBe('file_search');
    });
});
(0, vitest_1.describe)('GreedyCostRouter', () => {
    let router;
    (0, vitest_1.beforeEach)(() => {
        router = new greedy_cost_router_js_1.GreedyCostRouter({ costWeight: 0.5 });
    });
    (0, vitest_1.it)('should select highest scored candidate', async () => {
        const decision = await router.route(mockStep, mockCandidates);
        (0, vitest_1.expect)(decision.selectedTool).toBeDefined();
        (0, vitest_1.expect)(decision.score).toBeDefined();
        (0, vitest_1.expect)(decision.reasoning.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('should prefer quality when costWeight is 0', async () => {
        const qualityRouter = new greedy_cost_router_js_1.GreedyCostRouter({ costWeight: 0 });
        const decision = await qualityRouter.route(mockStep, mockCandidates);
        // code_interpreter has highest quality (0.9)
        (0, vitest_1.expect)(decision.selectedTool).toBe('code_interpreter');
    });
    (0, vitest_1.it)('should prefer cost when costWeight is 1', async () => {
        const costRouter = new greedy_cost_router_js_1.GreedyCostRouter({ costWeight: 1 });
        const decision = await costRouter.route(mockStep, mockCandidates);
        // file_search has lowest cost (0.0005)
        (0, vitest_1.expect)(decision.selectedTool).toBe('file_search');
    });
    (0, vitest_1.it)('should record outcomes for calibration', async () => {
        router.recordOutcome('code_interpreter', 0.95, 0.0012, 160);
        router.recordOutcome('code_interpreter', 0.88, 0.001, 140);
        const stats = router.getCalibrationStats();
        (0, vitest_1.expect)(stats.has('code_interpreter')).toBe(true);
        (0, vitest_1.expect)(stats.get('code_interpreter').samples).toBe(2);
    });
    (0, vitest_1.it)('should include alternatives in decision', async () => {
        const decision = await router.route(mockStep, mockCandidates);
        (0, vitest_1.expect)(decision.alternatives.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(decision.alternatives[0].toolId).toBeDefined();
        (0, vitest_1.expect)(decision.alternatives[0].reason).toBeDefined();
    });
});
(0, vitest_1.describe)('AdaptiveRouter', () => {
    let router;
    (0, vitest_1.beforeEach)(() => {
        router = new adaptive_router_js_1.AdaptiveRouter({ learningRate: 0.2 });
    });
    (0, vitest_1.it)('should route with adaptive scoring', async () => {
        const decision = await router.route(mockStep, mockCandidates, {
            category: 'code_correction',
        });
        (0, vitest_1.expect)(decision.selectedTool).toBeDefined();
        (0, vitest_1.expect)(decision.reasoning).toContain('Adaptive routing (learned weights)');
    });
    (0, vitest_1.it)('should learn from outcomes', async () => {
        // Record successful outcomes for code_interpreter
        for (let i = 0; i < 10; i++) {
            router.recordEvalOutcome('code_interpreter', 'code_correction', true, 0.001, 150, 0.9);
        }
        const weights = router.getLearnedWeights();
        (0, vitest_1.expect)(weights.toolWeights.get('code_interpreter')).toBeGreaterThan(1);
    });
    (0, vitest_1.it)('should maintain category-specific weights', async () => {
        router.recordEvalOutcome('code_interpreter', 'code_correction', true, 0.001, 150, 0.9);
        router.recordEvalOutcome('web_browse', 'data_analysis', true, 0.002, 500, 0.85);
        const weights = router.getLearnedWeights();
        (0, vitest_1.expect)(weights.categoryWeights.has('code_correction')).toBe(true);
        (0, vitest_1.expect)(weights.categoryWeights.has('data_analysis')).toBe(true);
    });
    (0, vitest_1.it)('should export and import model', async () => {
        router.recordEvalOutcome('code_interpreter', 'test', true, 0.001, 100, 0.9);
        const exported = router.exportModel();
        (0, vitest_1.expect)(exported).toBeDefined();
        const newRouter = new adaptive_router_js_1.AdaptiveRouter();
        newRouter.importModel(exported);
        const weights = newRouter.getLearnedWeights();
        (0, vitest_1.expect)(weights.toolWeights.has('code_interpreter')).toBe(true);
    });
    (0, vitest_1.it)('should adapt cost weight based on performance', async () => {
        // Record many failures to trigger cost weight reduction
        for (let i = 0; i < 50; i++) {
            router.recordEvalOutcome('tool', 'cat', false, 0.01, 1000, 0.3);
        }
        const initialWeight = router.getConfig().costWeight;
        router.adaptCostWeight();
        const adaptedWeight = router.getConfig().costWeight;
        // Should decrease cost weight when success rate is low
        (0, vitest_1.expect)(adaptedWeight).toBeLessThan(initialWeight);
    });
});
(0, vitest_1.describe)('createRouter factory', () => {
    (0, vitest_1.it)('should create random router', () => {
        const router = (0, index_js_1.createRouter)('random');
        (0, vitest_1.expect)(router.getType()).toBe('random');
    });
    (0, vitest_1.it)('should create greedy cost router', () => {
        const router = (0, index_js_1.createRouter)('greedy_cost');
        (0, vitest_1.expect)(router.getType()).toBe('greedy_cost');
    });
    (0, vitest_1.it)('should create adaptive router', () => {
        const router = (0, index_js_1.createRouter)('adaptive');
        (0, vitest_1.expect)(router.getType()).toBe('adaptive');
    });
    (0, vitest_1.it)('should create quality-first router (greedy with costWeight=0)', () => {
        const router = (0, index_js_1.createRouter)('quality_first');
        (0, vitest_1.expect)(router.getConfig().costWeight).toBe(0);
    });
    (0, vitest_1.it)('should throw on unknown type', () => {
        (0, vitest_1.expect)(() => (0, index_js_1.createRouter)('unknown')).toThrow('Unknown router type');
    });
});
