"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const intentTranslator_js_1 = require("../../src/gen-actions/intentTranslator.js");
const knowledge_graph_1 = require("@ga-graphai/knowledge-graph");
const ALLOW = {
    allowed: true,
    effect: 'allow',
    matchedRules: ['policy-1'],
    reasons: [],
    obligations: [],
    trace: [],
};
const DENY = {
    allowed: false,
    effect: 'deny',
    matchedRules: ['policy-deny'],
    reasons: ['Denied by policy-deny'],
    obligations: [],
    trace: [],
};
(0, vitest_1.describe)('GenerativeActionTranslator', () => {
    let knowledgeGraph;
    let policyEvaluator;
    let auditSink;
    let approvalQueue;
    let baseContext;
    (0, vitest_1.beforeEach)(async () => {
        knowledgeGraph = new knowledge_graph_1.OrchestrationKnowledgeGraph();
        const serviceConnector = {
            loadServices: vitest_1.vi.fn().mockResolvedValue([
                { id: 'svc-api', name: 'API', dependencies: [], tier: 'tier-0' },
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
                    id: 'pipeline-1',
                    name: 'Deploy API',
                    stages: [
                        {
                            id: 'stage-build',
                            name: 'Build',
                            pipelineId: 'pipeline-1',
                            serviceId: 'svc-api',
                            environmentId: 'env-prod',
                            capability: 'build',
                        },
                    ],
                },
            ]),
        };
        const incidentConnector = {
            loadIncidents: vitest_1.vi.fn().mockResolvedValue([
                {
                    id: 'incident-1',
                    serviceId: 'svc-api',
                    environmentId: 'env-prod',
                    severity: 'critical',
                    occurredAt: new Date().toISOString(),
                    status: 'open',
                },
            ]),
        };
        const policyConnector = {
            loadPolicies: vitest_1.vi.fn().mockResolvedValue([
                {
                    id: 'policy-1',
                    description: 'Prod deploy guardrail',
                    effect: 'allow',
                    actions: ['orchestration.deploy'],
                    resources: ['service:svc-api'],
                    conditions: [],
                    obligations: [],
                    tags: ['high-risk'],
                },
            ]),
        };
        knowledgeGraph.registerServiceConnector(serviceConnector);
        knowledgeGraph.registerEnvironmentConnector(environmentConnector);
        knowledgeGraph.registerPipelineConnector(pipelineConnector);
        knowledgeGraph.registerIncidentConnector(incidentConnector);
        knowledgeGraph.registerPolicyConnector(policyConnector);
        await knowledgeGraph.refresh();
        policyEvaluator = vitest_1.vi.fn().mockReturnValue(ALLOW);
        auditSink = { record: vitest_1.vi.fn() };
        approvalQueue = { enqueue: vitest_1.vi.fn() };
        baseContext = { tenantId: 'tenant', userId: 'user', roles: ['developer'] };
    });
    (0, vitest_1.it)('produces plan with approval requirement when risk high', () => {
        const translator = new intentTranslator_js_1.GenerativeActionTranslator({
            knowledgeGraph,
            policyEvaluator,
            auditSink,
            approvalQueue,
        });
        const intent = {
            type: 'deploy',
            targetServiceId: 'svc-api',
            environmentId: 'env-prod',
            requestedBy: baseContext,
        };
        const plan = translator.translate(intent);
        (0, vitest_1.expect)(plan.guardrail.requiresApproval).toBe(true);
        (0, vitest_1.expect)(approvalQueue.enqueue).toHaveBeenCalledWith(plan);
        (0, vitest_1.expect)(auditSink.record).toHaveBeenCalled();
        (0, vitest_1.expect)(plan.steps).toHaveLength(2);
        (0, vitest_1.expect)(plan.steps[0].command).toContain('orchestrator validate');
    });
    (0, vitest_1.it)('infers environment when not provided and builds rollback intent', () => {
        const translator = new intentTranslator_js_1.GenerativeActionTranslator({
            knowledgeGraph,
            policyEvaluator,
            auditSink,
        });
        const intent = {
            type: 'rollback',
            targetServiceId: 'svc-api',
            requestedBy: baseContext,
            riskTolerance: 'high',
        };
        const plan = translator.translate(intent);
        (0, vitest_1.expect)(plan.intent.environmentId).toBe('env-prod');
        (0, vitest_1.expect)(plan.steps[0].command).toContain('rollback');
        (0, vitest_1.expect)(plan.guardrail.requiresApproval).toBe(false);
    });
    (0, vitest_1.it)('throws when policy denies action', () => {
        const translator = new intentTranslator_js_1.GenerativeActionTranslator({
            knowledgeGraph,
            policyEvaluator: vitest_1.vi.fn().mockReturnValue(DENY),
        });
        (0, vitest_1.expect)(() => translator.translate({
            type: 'scale',
            targetServiceId: 'svc-api',
            environmentId: 'env-prod',
            desiredCapacity: 3,
            requestedBy: baseContext,
        })).toThrow(/policy denied action/);
    });
});
