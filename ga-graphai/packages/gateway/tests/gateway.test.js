"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_1 = require("../src/index");
const prov_ledger_1 = require("@ga-graphai/prov-ledger");
const index_js_1 = require("../src/index.js");
const gateway = new index_1.GatewayRuntime({
    seedEntries: [
        {
            id: 'seed-1',
            category: 'deployment',
            actor: 'ci-bot',
            action: 'promote',
            resource: 'api',
            payload: { version: '1.0.0' },
        },
    ],
});
(0, vitest_1.describe)('GatewayRuntime', () => {
    (0, vitest_1.it)('lists ledger entries through GraphQL', async () => {
        const result = await gateway.execute(`query Entries($category: String) {
        ledgerEntries(category: $category) {
          id
          category
          actor
        }
      }`, { category: 'deployment' });
        (0, vitest_1.expect)(result.errors).toBeUndefined();
        const entries = result.data
            .ledgerEntries;
        (0, vitest_1.expect)(entries.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(entries[0].id).toBe('seed-1');
    });
    (0, vitest_1.it)('appends ledger entries via mutation', async () => {
        const result = await gateway.execute(`mutation AddEntry($input: LedgerEntryInput!) {
        appendLedgerEntry(input: $input) {
          id
          hash
        }
      }`, {
            input: {
                id: 'change-1',
                category: 'policy',
                actor: 'compliance',
                action: 'approve',
                resource: 'llm',
                payload: { ticket: 'SEC-1' },
            },
        });
        (0, vitest_1.expect)(result.errors).toBeUndefined();
        const data = result.data;
        (0, vitest_1.expect)(data.appendLedgerEntry.id).toBe('change-1');
        (0, vitest_1.expect)(data.appendLedgerEntry.hash).toBeTruthy();
    });
    (0, vitest_1.it)('simulates policy decisions', async () => {
        const result = await gateway.execute(`mutation Sim($input: PolicyEvaluationInput!) {
        simulatePolicy(input: $input) {
          allowed
          effect
          matchedRules
        }
      }`, {
            input: {
                action: 'intent:read',
                resource: 'intent',
                tenantId: 'tenant-1',
                userId: 'user-1',
                roles: ['product-manager'],
                region: 'allowed-region',
            },
        });
        (0, vitest_1.expect)(result.errors).toBeUndefined();
        const data = result.data;
        (0, vitest_1.expect)(data.simulatePolicy.allowed).toBe(true);
        (0, vitest_1.expect)(data.simulatePolicy.effect).toBe('ALLOW');
        (0, vitest_1.expect)(data.simulatePolicy.matchedRules.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('submits work orders through GraphQL', async () => {
        const runtime = new index_1.GatewayRuntime({
            workcell: {
                tools: [
                    {
                        name: 'analysis',
                        minimumAuthority: 1,
                        handler: (task) => ({
                            summary: `analysis for ${task.payload.intent ?? 'unknown'}`,
                        }),
                    },
                ],
                agents: [
                    {
                        name: 'agent-a',
                        authority: 2,
                        allowedTools: ['analysis'],
                        roles: ['developer'],
                    },
                ],
            },
        });
        const submitResult = await runtime.execute(`mutation Submit($input: WorkOrderInput!) {
        submitWorkOrder(input: $input) {
          orderId
          status
          tasks {
            taskId
            status
          }
        }
      }`, {
            input: {
                orderId: 'order-1',
                submittedBy: 'architect',
                tenantId: 'tenant-1',
                userId: 'user-1',
                agentName: 'agent-a',
                roles: ['developer'],
                region: 'allowed-region',
                tasks: [
                    {
                        taskId: 'task-1',
                        tool: 'analysis',
                        action: 'workcell:execute',
                        resource: 'analysis',
                        payload: { intent: 'ship feature' },
                    },
                ],
            },
        });
        (0, vitest_1.expect)(submitResult.errors).toBeUndefined();
        const submission = submitResult.data;
        (0, vitest_1.expect)(submission.submitWorkOrder.status).toBe('COMPLETED');
        (0, vitest_1.expect)(submission.submitWorkOrder.tasks[0].status).toBe('SUCCESS');
        const ordersResult = await runtime.execute(`{ workOrders { orderId status } }`);
        (0, vitest_1.expect)(ordersResult.errors).toBeUndefined();
        const orders = ordersResult.data.workOrders;
        (0, vitest_1.expect)(orders.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(orders[0].orderId).toBe('order-1');
    });
    (0, vitest_1.it)('enforces policy on work order submission', async () => {
        const runtime = new index_1.GatewayRuntime({
            rules: [
                {
                    id: 'deny-risk',
                    description: 'deny high risk analysis orders',
                    effect: 'deny',
                    actions: ['workcell:execute'],
                    resources: ['analysis'],
                    conditions: [{ attribute: 'risk', operator: 'eq', value: 'high' }],
                },
            ],
            workcell: {
                tools: [
                    {
                        name: 'analysis',
                        handler: () => ({ complete: true }),
                    },
                ],
                agents: [
                    {
                        name: 'agent-a',
                        authority: 2,
                        allowedTools: ['analysis'],
                        roles: ['developer'],
                    },
                ],
            },
        });
        const submitResult = await runtime.execute(`mutation Submit($input: WorkOrderInput!) {
        submitWorkOrder(input: $input) {
          status
          tasks { status }
        }
      }`, {
            input: {
                orderId: 'order-2',
                submittedBy: 'architect',
                tenantId: 'tenant-1',
                userId: 'user-1',
                agentName: 'agent-a',
                roles: ['developer'],
                region: 'allowed-region',
                attributes: { risk: 'high' },
                tasks: [
                    {
                        taskId: 'task-1',
                        tool: 'analysis',
                        action: 'workcell:execute',
                        resource: 'analysis',
                        payload: { intent: 'ship feature' },
                    },
                ],
            },
        });
        (0, vitest_1.expect)(submitResult.errors).toBeUndefined();
        const submission = submitResult.data;
        (0, vitest_1.expect)(submission.submitWorkOrder.status).toBe('REJECTED');
        (0, vitest_1.expect)(submission.submitWorkOrder.tasks[0].status).toBe('REJECTED');
    });
});
const defaultPolicy = {
    purpose: 'engineering',
    retention: 'standard-365d',
    licenseClass: 'MIT-OK',
    pii: false,
};
const defaultConstraints = {
    latencyP95Ms: 900,
    budgetUSD: 5,
    contextTokensMax: 8000,
};
function createNormalizer() {
    return new index_js_1.TicketNormalizer({
        defaultPolicy,
        defaultConstraints,
    });
}
function createMockProfile(id, skills, overrides = {}) {
    return {
        id,
        displayName: id,
        type: 'foundation',
        skills,
        costUSDPer1kTokens: 0.02,
        latencyMsP95: 500,
        contextWindowTokens: 16000,
        safety: 'high',
        residency: 'global',
        maxConcurrency: 4,
        reliabilityScore: 0.9,
        ...overrides,
    };
}
function registerMockResource(registry, id, skills, handler, options = {}) {
    registry.register({
        profile: createMockProfile(id, skills),
        bid() {
            return {
                modelId: id,
                est: {
                    quality: options.bid?.quality ?? 0.8,
                    latencyMs: options.bid?.latencyMs ?? 400,
                    costUSD: options.bid?.costUSD ?? 0.2,
                },
                confidence: 0.7,
                fitTags: options.bid?.fitTags ?? ['engineering'],
                rationale: `skills:${skills.join(',')}`,
            };
        },
        async generate({ prompt }) {
            return {
                content: handler(prompt),
                evidence: [
                    { id: `${id}-evidence`, description: 'mock', uri: `memory://${id}` },
                ],
            };
        },
        critique: options.critique
            ? async (artifact) => [
                {
                    axis: 'accuracy',
                    score: options.critique(artifact),
                    rationale: 'cross-eval',
                },
            ]
            : undefined,
        evaluate: options.evaluate
            ? async (artifact) => [
                {
                    axis: 'accuracy',
                    score: options.evaluate(artifact),
                    rationale: 'adjudication',
                },
            ]
            : undefined,
        runWorkbook: options.workbook
            ? async () => ({
                id: `${id}-workbook`,
                commands: [],
                status: 'passed',
                artifacts: options.workbook(),
                startedAt: new Date().toISOString(),
                completedAt: new Date().toISOString(),
            })
            : undefined,
    });
}
(0, vitest_1.describe)('Ticket normalizer', () => {
    (0, vitest_1.it)('produces structured TaskSpecs and clarifying questions', () => {
        const normalizer = createNormalizer();
        const normalized = normalizer.normalize({
            ticketId: 'T-1',
            tenantId: 'tenant',
            title: 'Improve latency',
            body: `Goal: Reduce API latency.\n\nP95 must be <= 350 ms.\nBudget: $2 USD.\nRisk: rollout regression.\nEvidence: https://intelgraph.example/report.\n` +
                `Out of scope: UI work.\nAcceptance: Ensure AC-1 passes.\n` +
                `Maybe adjust caches later.`,
        });
        (0, vitest_1.expect)(normalized.taskSpec.goal).toContain('Reduce API latency');
        (0, vitest_1.expect)(normalized.taskSpec.acceptanceCriteria.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(normalized.clarifyingQuestions.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(normalized.ticket.ambiguities).toContain('maybe');
    });
});
(0, vitest_1.describe)('Policy router', () => {
    (0, vitest_1.it)('selects value dense resources and chooses cooperation mode', () => {
        const registry = new index_js_1.CapabilityRegistry();
        registerMockResource(registry, 'model-a', ['engineering', 'typescript'], () => 'Spec draft', {
            bid: {
                quality: 0.92,
                latencyMs: 300,
                costUSD: 0.3,
                fitTags: ['engineering'],
            },
        });
        registerMockResource(registry, 'model-b', ['risk', 'testing'], () => 'Test draft', {
            bid: {
                quality: 0.88,
                latencyMs: 400,
                costUSD: 0.1,
                fitTags: ['testing'],
            },
        });
        const normalizer = createNormalizer();
        const { taskSpec } = normalizer.normalize({
            ticketId: 'T-2',
            tenantId: 'tenant',
            title: 'Ship feature',
            body: 'Goal: Ship.\nP95 500 ms.\nAcceptance: AC-1 must pass. AC-2 must pass.\n',
        });
        const router = new index_js_1.PolicyRouter(registry, { qualityFloor: 0.5 });
        const decision = router.route(taskSpec);
        (0, vitest_1.expect)(decision.primaryAssignments).toContain('model-a');
        (0, vitest_1.expect)(decision.mode).toBe('semantic-braid');
    });
});
(0, vitest_1.describe)('Cooperation orchestrator', () => {
    (0, vitest_1.it)('executes semantic braid with strand consistency checks', async () => {
        const registry = new index_js_1.CapabilityRegistry();
        registerMockResource(registry, 'spec-model', ['spec'], () => '`getMetrics` returns JSON');
        registerMockResource(registry, 'test-model', ['tests'], () => 'API:getMetrics happy-path');
        registerMockResource(registry, 'risk-model', ['risk'], () => 'Latency regression risk');
        const normalizer = createNormalizer();
        const normalized = normalizer.normalize({
            ticketId: 'T-3',
            tenantId: 'tenant',
            title: 'Build metrics API',
            body: 'Goal: Provide metrics.\nAcceptance: AC-1 ensure latency <= 500ms.',
        });
        const decision = {
            mode: 'semantic-braid',
            primaryAssignments: ['spec-model'],
            supportAssignments: ['test-model', 'risk-model'],
            expectedCostUSD: 0.5,
            expectedLatencyMs: 400,
            provenanceRef: 'router',
        };
        const ledger = new prov_ledger_1.ProvenanceLedger('secret');
        const orchestrator = new index_js_1.CooperationOrchestrator(registry, ledger);
        const result = await orchestrator.execute(normalized.taskSpec, decision);
        (0, vitest_1.expect)(result.artifact.mode).toBe('semantic-braid');
        (0, vitest_1.expect)(result.artifact.content).toContain('#SPEC');
        (0, vitest_1.expect)(ledger.list(normalized.taskSpec.taskId)).toHaveLength(1);
    });
    (0, vitest_1.it)('merges counterfactual improvements and records coverage', async () => {
        const registry = new index_js_1.CapabilityRegistry();
        registerMockResource(registry, 'primary-model', ['impl'], () => 'Plan covers AC-1');
        registerMockResource(registry, 'shadow-model', ['analysis'], () => 'Shadow focuses on AC-2 risk');
        registerMockResource(registry, 'adjudicator-model', ['audit'], () => 'Adjudicate', {
            evaluate: () => 0.95,
        });
        const task = {
            taskId: 'task-shadow',
            tenantId: 'tenant',
            title: 'Shadow test',
            goal: 'Handle risks',
            nonGoals: [],
            inputs: [],
            constraints: defaultConstraints,
            policy: defaultPolicy,
            acceptanceCriteria: [
                {
                    id: 'AC-1',
                    statement: 'Primary coverage',
                    verify: 'test',
                    metric: 'pass',
                    threshold: '1.0',
                },
                {
                    id: 'AC-2',
                    statement: 'Shadow coverage',
                    verify: 'test',
                    metric: 'pass',
                    threshold: '1.0',
                },
            ],
            risks: [],
            raci: { owner: 'owner', reviewers: ['reviewer'] },
            sla: { due: new Date().toISOString() },
            policyTags: [
                'purpose:engineering',
                'retention:standard-365d',
                'pii:absent',
            ],
            language: 'en',
        };
        const decision = {
            mode: 'counterfactual-shadowing',
            primaryAssignments: ['primary-model'],
            supportAssignments: ['shadow-model', 'adjudicator-model'],
            expectedCostUSD: 1,
            expectedLatencyMs: 500,
            provenanceRef: 'router',
        };
        const ledger = new prov_ledger_1.ProvenanceLedger('secret');
        const orchestrator = new index_js_1.CooperationOrchestrator(registry, ledger);
        const result = await orchestrator.execute(task, decision);
        (0, vitest_1.expect)(result.artifact.mode).toBe('counterfactual-shadowing');
        (0, vitest_1.expect)(result.artifact.content).toContain('Counterfactual Enhancements');
        (0, vitest_1.expect)(result.artifact.acceptanceCriteriaSatisfied).toContain('accuracy');
    });
});
