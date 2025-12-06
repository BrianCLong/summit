import { describe, expect, it } from 'vitest';
import { buildCopilotCostPreview } from '../src/costPreview.js';
import type { ModelPricing } from '../src/costPreview.js';

const BASE_MODELS: ModelPricing[] = [
  {
    modelId: 'graphai-copilot-lite',
    contextWindow: 4000,
    inputCostPer1kTokens: 0.001,
    outputCostPer1kTokens: 0.002,
  },
  {
    modelId: 'graphai-copilot-pro',
    contextWindow: 16000,
    inputCostPer1kTokens: 0.003,
    outputCostPer1kTokens: 0.004,
    expectedLatencyMs: 950,
  },
];

describe('buildCopilotCostPreview', () => {
  it('provides token projections, cost impact, and guardrail decision', () => {
    const preview = buildCopilotCostPreview({
      prompt: 'Find connections between Alice Chen and Bob Martinez at TechCorp.',
      cypher:
        'MATCH (p:Person)-[r:WORKS_WITH]->(c:Company) RETURN p, r, c LIMIT 25',
      costEstimate: {
        anticipatedRows: 40,
        estimatedLatencyMs: 240,
        estimatedRru: 24,
      },
      models: BASE_MODELS,
    });

    expect(preview.tokens.promptTokens).toBeGreaterThan(0);
    expect(preview.tokens.completionTokens).toBeGreaterThan(0);
    expect(preview.modelImpact.estimatedCostUSD).toBeGreaterThan(0);
    expect(preview.budget.decision.action).toBe('allow');
    expect(preview.budget.plan.operations).toBeGreaterThan(0);
  });

  it('selects a larger context model when the prompt pressure is high', () => {
    const longPrompt = 'broaden the search scope across geographies and entities '.repeat(400);
    const preview = buildCopilotCostPreview({
      prompt: longPrompt,
      cypher: 'MATCH (n) RETURN n LIMIT 5',
      costEstimate: {
        anticipatedRows: 5,
        estimatedLatencyMs: 120,
        estimatedRru: 6,
      },
      models: [
        {
          modelId: 'graphai-copilot-compact',
          contextWindow: 600,
          inputCostPer1kTokens: 0.0008,
          outputCostPer1kTokens: 0.0015,
        },
        {
          modelId: 'graphai-copilot-context-king',
          contextWindow: 8000,
          inputCostPer1kTokens: 0.0025,
          outputCostPer1kTokens: 0.0035,
        },
      ],
    });

    expect(preview.tokens.totalTokens).toBeGreaterThan(800);
    expect(preview.modelImpact.selectedModel.modelId).toBe(
      'graphai-copilot-context-king',
    );
    expect(
      preview.modelImpact.notes.some((note) =>
        note.toLowerCase().includes('context'),
      ),
    ).toBe(true);
  });

  it('flags plans that breach tenant budgets before execution', () => {
    const preview = buildCopilotCostPreview({
      prompt:
        'Fan out across the entire relationship graph to find deeply connected entities.',
      cypher: 'MATCH (a)-[r*6]->(b) RETURN a, b LIMIT 250',
      costEstimate: {
        anticipatedRows: 5000,
        estimatedLatencyMs: 2600,
        estimatedRru: 420,
      },
      models: BASE_MODELS,
      tenantProfile: {
        tenantId: 'tenant-critical',
        maxRru: 60,
        maxLatencyMs: 600,
        concurrencyLimit: 1,
      },
      activeQueries: 3,
      recentLatencyP95: 1400,
    });

    expect(preview.budget.plan.containsCartesianProduct).toBe(true);
    expect(preview.budget.decision.action).toBe('kill');
  });
});
