"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const dx_guidance_js_1 = require("../src/dx-guidance.js");
const policy_1 = require("@ga-graphai/policy");
const knowledge_graph_1 = require("@ga-graphai/knowledge-graph");
const allowRule = {
    id: 'allow-deploy',
    description: 'Allow deploy',
    effect: 'allow',
    actions: ['orchestration.deploy'],
    resources: ['service:svc-api'],
    conditions: [],
    obligations: [],
};
const actor = {
    tenantId: 'tenant',
    userId: 'dev',
    roles: ['developer'],
};
(0, vitest_1.describe)('DeveloperExperienceGuide', () => {
    let knowledgeGraph;
    let guide;
    (0, vitest_1.beforeEach)(async () => {
        knowledgeGraph = new knowledge_graph_1.OrchestrationKnowledgeGraph();
        const serviceConnector = {
            loadServices: vitest_1.vi.fn().mockResolvedValue([
                { id: 'svc-api', name: 'API' },
            ]),
        };
        const environmentConnector = {
            loadEnvironments: vitest_1.vi.fn().mockResolvedValue([
                { id: 'env-prod', name: 'Prod', stage: 'prod', region: 'us-east-1' },
            ]),
        };
        const pipelineConnector = {
            loadPipelines: vitest_1.vi.fn().mockResolvedValue([
                {
                    id: 'pipe-1',
                    name: 'Deploy',
                    stages: [
                        {
                            id: 'stage-1',
                            name: 'Deploy',
                            pipelineId: 'pipe-1',
                            serviceId: 'svc-api',
                            environmentId: 'env-prod',
                            capability: 'deploy',
                        },
                    ],
                },
            ]),
        };
        knowledgeGraph.registerServiceConnector(serviceConnector);
        knowledgeGraph.registerEnvironmentConnector(environmentConnector);
        knowledgeGraph.registerPipelineConnector(pipelineConnector);
        await knowledgeGraph.refresh();
        const policyEngine = new policy_1.PolicyEngine([allowRule]);
        const policyGateway = new policy_1.GuardedPolicyGateway({ engine: policyEngine, riskThreshold: 0.8 });
        guide = new dx_guidance_js_1.DeveloperExperienceGuide({ knowledgeGraph, policyGateway });
    });
    (0, vitest_1.it)('recommends golden path with guardrails', () => {
        const recommendation = guide.recommendGoldenPath('svc-api', 'feature-dev', {
            actor,
            guardContext: { riskScore: 0.2 },
        });
        (0, vitest_1.expect)(recommendation).toBeDefined();
        (0, vitest_1.expect)(recommendation?.steps.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(recommendation?.guardrails.requiresApproval).toBe(false);
    });
    (0, vitest_1.it)('aggregates telemetry metrics', () => {
        guide.recordEvent({
            id: '1',
            persona: 'feature-dev',
            channel: 'cli',
            command: 'deploy',
            durationMs: 1200,
            success: true,
            satisfactionScore: 4.5,
            timestamp: new Date().toISOString(),
        });
        guide.recordEvent({
            id: '2',
            persona: 'feature-dev',
            channel: 'ui',
            command: 'rollback',
            durationMs: 800,
            success: false,
            frictionTags: ['policy-block'],
            timestamp: new Date().toISOString(),
        });
        const summary = guide.telemetrySummary();
        (0, vitest_1.expect)(summary.totalEvents).toBe(2);
        (0, vitest_1.expect)(summary.successRate).toBeCloseTo(0.5, 1);
        (0, vitest_1.expect)(summary.averageSatisfaction).toBeGreaterThan(0);
        (0, vitest_1.expect)(summary.frictionHotspots['policy-block']).toBe(1);
    });
});
