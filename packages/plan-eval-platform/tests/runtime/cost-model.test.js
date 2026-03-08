"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const cost_model_js_1 = require("../../src/runtime/cost-model.js");
(0, vitest_1.describe)('CostModel', () => {
    let costModel;
    (0, vitest_1.beforeEach)(() => {
        costModel = new cost_model_js_1.CostModel();
    });
    (0, vitest_1.it)('should use default configuration', () => {
        const config = costModel.getConfig();
        (0, vitest_1.expect)(config.inputTokenCostPer1k).toBe(cost_model_js_1.DEFAULT_COST_CONFIG.inputTokenCostPer1k);
        (0, vitest_1.expect)(config.outputTokenCostPer1k).toBe(cost_model_js_1.DEFAULT_COST_CONFIG.outputTokenCostPer1k);
    });
    (0, vitest_1.it)('should estimate cost for tokens', () => {
        const estimate = costModel.estimateCost(1000, 500);
        (0, vitest_1.expect)(estimate.inputTokenCost).toBeCloseTo(0.003, 4);
        (0, vitest_1.expect)(estimate.outputTokenCost).toBeCloseTo(0.0075, 4);
        (0, vitest_1.expect)(estimate.totalCost).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('should include tool cost when tool name provided', () => {
        const withoutTool = costModel.estimateCost(1000, 500);
        const withTool = costModel.estimateCost(1000, 500, 'code_interpreter');
        (0, vitest_1.expect)(withTool.toolCallCost).toBeGreaterThan(0);
        (0, vitest_1.expect)(withTool.totalCost).toBeGreaterThan(withoutTool.totalCost);
    });
    (0, vitest_1.it)('should apply latency penalty when provided', () => {
        const withoutLatency = costModel.estimateCost(1000, 500);
        const withLatency = costModel.estimateCost(1000, 500, undefined, 1000);
        (0, vitest_1.expect)(withLatency.latencyPenalty).toBeGreaterThan(0);
        (0, vitest_1.expect)(withLatency.totalCost).toBeGreaterThan(withoutLatency.totalCost);
    });
    (0, vitest_1.it)('should calculate cost from trace events', () => {
        const events = [
            {
                id: '1',
                traceId: 'trace-1',
                timestamp: '2024-01-01T00:00:00Z',
                type: 'request_start',
                name: 'test',
                metrics: {
                    inputTokens: 500,
                    outputTokens: 200,
                    latencyMs: 100,
                },
            },
            {
                id: '2',
                traceId: 'trace-1',
                timestamp: '2024-01-01T00:00:00Z',
                type: 'tool_call_end',
                name: 'tool:code_interpreter',
                metrics: {
                    inputTokens: 100,
                    outputTokens: 50,
                },
            },
        ];
        const estimate = costModel.calculateFromEvents(events);
        (0, vitest_1.expect)(estimate.inputTokenCost).toBeGreaterThan(0);
        (0, vitest_1.expect)(estimate.outputTokenCost).toBeGreaterThan(0);
        (0, vitest_1.expect)(estimate.toolCallCost).toBeGreaterThan(0);
        (0, vitest_1.expect)(estimate.totalCost).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('should allow setting custom tool costs', () => {
        costModel.setToolCost('custom_tool', 0.05);
        const estimate = costModel.estimateCost(100, 50, 'custom_tool');
        (0, vitest_1.expect)(estimate.toolCallCost).toBe(0.05);
    });
    (0, vitest_1.it)('should calculate savings between estimates', () => {
        const baseline = costModel.estimateCost(2000, 1000, 'web_browse', 500);
        const optimized = costModel.estimateCost(1000, 500, 'code_interpreter', 200);
        const savings = cost_model_js_1.CostModel.calculateSavings(baseline, optimized);
        (0, vitest_1.expect)(savings.absoluteSavings).toBeGreaterThan(0);
        (0, vitest_1.expect)(savings.percentageSavings).toBeGreaterThan(0);
        (0, vitest_1.expect)(savings.breakdown.inputTokenSavings).toBeGreaterThan(0);
    });
});
(0, vitest_1.describe)('createCostModel', () => {
    (0, vitest_1.it)('should create budget tier model', () => {
        const model = (0, cost_model_js_1.createCostModel)('budget');
        const config = model.getConfig();
        (0, vitest_1.expect)(config.inputTokenCostPer1k).toBeLessThan(cost_model_js_1.DEFAULT_COST_CONFIG.inputTokenCostPer1k);
    });
    (0, vitest_1.it)('should create standard tier model', () => {
        const model = (0, cost_model_js_1.createCostModel)('standard');
        const config = model.getConfig();
        (0, vitest_1.expect)(config.inputTokenCostPer1k).toBe(cost_model_js_1.DEFAULT_COST_CONFIG.inputTokenCostPer1k);
    });
    (0, vitest_1.it)('should create premium tier model', () => {
        const model = (0, cost_model_js_1.createCostModel)('premium');
        const config = model.getConfig();
        (0, vitest_1.expect)(config.inputTokenCostPer1k).toBeGreaterThan(cost_model_js_1.DEFAULT_COST_CONFIG.inputTokenCostPer1k);
    });
});
