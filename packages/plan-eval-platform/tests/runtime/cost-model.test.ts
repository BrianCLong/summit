import { describe, it, expect, beforeEach } from 'vitest';
import { CostModel, createCostModel, DEFAULT_COST_CONFIG } from '../../src/runtime/cost-model.js';
import type { TraceEvent } from '../../src/types.js';

describe('CostModel', () => {
  let costModel: CostModel;

  beforeEach(() => {
    costModel = new CostModel();
  });

  it('should use default configuration', () => {
    const config = costModel.getConfig();

    expect(config.inputTokenCostPer1k).toBe(DEFAULT_COST_CONFIG.inputTokenCostPer1k);
    expect(config.outputTokenCostPer1k).toBe(DEFAULT_COST_CONFIG.outputTokenCostPer1k);
  });

  it('should estimate cost for tokens', () => {
    const estimate = costModel.estimateCost(1000, 500);

    expect(estimate.inputTokenCost).toBeCloseTo(0.003, 4);
    expect(estimate.outputTokenCost).toBeCloseTo(0.0075, 4);
    expect(estimate.totalCost).toBeGreaterThan(0);
  });

  it('should include tool cost when tool name provided', () => {
    const withoutTool = costModel.estimateCost(1000, 500);
    const withTool = costModel.estimateCost(1000, 500, 'code_interpreter');

    expect(withTool.toolCallCost).toBeGreaterThan(0);
    expect(withTool.totalCost).toBeGreaterThan(withoutTool.totalCost);
  });

  it('should apply latency penalty when provided', () => {
    const withoutLatency = costModel.estimateCost(1000, 500);
    const withLatency = costModel.estimateCost(1000, 500, undefined, 1000);

    expect(withLatency.latencyPenalty).toBeGreaterThan(0);
    expect(withLatency.totalCost).toBeGreaterThan(withoutLatency.totalCost);
  });

  it('should calculate cost from trace events', () => {
    const events: TraceEvent[] = [
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

    expect(estimate.inputTokenCost).toBeGreaterThan(0);
    expect(estimate.outputTokenCost).toBeGreaterThan(0);
    expect(estimate.toolCallCost).toBeGreaterThan(0);
    expect(estimate.totalCost).toBeGreaterThan(0);
  });

  it('should allow setting custom tool costs', () => {
    costModel.setToolCost('custom_tool', 0.05);
    const estimate = costModel.estimateCost(100, 50, 'custom_tool');

    expect(estimate.toolCallCost).toBe(0.05);
  });

  it('should calculate savings between estimates', () => {
    const baseline = costModel.estimateCost(2000, 1000, 'web_browse', 500);
    const optimized = costModel.estimateCost(1000, 500, 'code_interpreter', 200);

    const savings = CostModel.calculateSavings(baseline, optimized);

    expect(savings.absoluteSavings).toBeGreaterThan(0);
    expect(savings.percentageSavings).toBeGreaterThan(0);
    expect(savings.breakdown.inputTokenSavings).toBeGreaterThan(0);
  });
});

describe('createCostModel', () => {
  it('should create budget tier model', () => {
    const model = createCostModel('budget');
    const config = model.getConfig();

    expect(config.inputTokenCostPer1k).toBeLessThan(DEFAULT_COST_CONFIG.inputTokenCostPer1k);
  });

  it('should create standard tier model', () => {
    const model = createCostModel('standard');
    const config = model.getConfig();

    expect(config.inputTokenCostPer1k).toBe(DEFAULT_COST_CONFIG.inputTokenCostPer1k);
  });

  it('should create premium tier model', () => {
    const model = createCostModel('premium');
    const config = model.getConfig();

    expect(config.inputTokenCostPer1k).toBeGreaterThan(DEFAULT_COST_CONFIG.inputTokenCostPer1k);
  });
});
