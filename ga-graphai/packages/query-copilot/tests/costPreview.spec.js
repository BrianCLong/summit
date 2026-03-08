"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const costPreview_js_1 = require("../src/costPreview.js");
const BASE_MODELS = [
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
(0, vitest_1.describe)('buildCopilotCostPreview', () => {
    (0, vitest_1.it)('provides token projections, cost impact, and guardrail decision', () => {
        const preview = (0, costPreview_js_1.buildCopilotCostPreview)({
            prompt: 'Find connections between Alice Chen and Bob Martinez at TechCorp.',
            cypher: 'MATCH (p:Person)-[r:WORKS_WITH]->(c:Company) RETURN p, r, c LIMIT 25',
            costEstimate: {
                anticipatedRows: 40,
                estimatedLatencyMs: 240,
                estimatedRru: 24,
            },
            models: BASE_MODELS,
        });
        (0, vitest_1.expect)(preview.tokens.promptTokens).toBeGreaterThan(0);
        (0, vitest_1.expect)(preview.tokens.completionTokens).toBeGreaterThan(0);
        (0, vitest_1.expect)(preview.modelImpact.estimatedCostUSD).toBeGreaterThan(0);
        (0, vitest_1.expect)(preview.budget.decision.action).toBe('allow');
        (0, vitest_1.expect)(preview.budget.plan.operations).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('selects a larger context model when the prompt pressure is high', () => {
        const longPrompt = 'broaden the search scope across geographies and entities '.repeat(400);
        const preview = (0, costPreview_js_1.buildCopilotCostPreview)({
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
        (0, vitest_1.expect)(preview.tokens.totalTokens).toBeGreaterThan(800);
        (0, vitest_1.expect)(preview.modelImpact.selectedModel.modelId).toBe('graphai-copilot-context-king');
        (0, vitest_1.expect)(preview.modelImpact.notes.some((note) => note.toLowerCase().includes('context'))).toBe(true);
    });
    (0, vitest_1.it)('flags plans that breach tenant budgets before execution', () => {
        const preview = (0, costPreview_js_1.buildCopilotCostPreview)({
            prompt: 'Fan out across the entire relationship graph to find deeply connected entities.',
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
        (0, vitest_1.expect)(preview.budget.plan.containsCartesianProduct).toBe(true);
        (0, vitest_1.expect)(preview.budget.decision.action).toBe('kill');
    });
});
