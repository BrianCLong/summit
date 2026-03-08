"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
const baseRules = [
    {
        id: 'allow-analyst-read',
        description: 'Analysts can read datasets',
        effect: 'allow',
        actions: ['dataset:read'],
        resources: ['dataset'],
        conditions: [
            { attribute: 'roles', operator: 'includes', value: ['analyst'] },
        ],
    },
];
const baseRequest = {
    action: 'dataset:read',
    resource: 'dataset',
    context: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        roles: ['analyst'],
        region: 'us-west-1',
    },
};
(0, vitest_1.describe)('GovernanceVerdict wiring', () => {
    const engine = new index_js_1.PolicyEngine(baseRules);
    const orchestrator = new index_js_1.GovernanceOrchestrator(engine, {
        evaluatedBy: 'governance-mesh',
        engineFactory: (rules) => new index_js_1.PolicyEngine(rules),
    });
    (0, vitest_1.it)('embeds governance verdicts into policy results', () => {
        const outcome = orchestrator.evaluateUserAction(baseRequest);
        (0, vitest_1.expect)(outcome.payload.allowed).toBe(true);
        (0, vitest_1.expect)(outcome.governance.status).toBe('APPROVED');
        (0, vitest_1.expect)(outcome.governance.policyIds).toContain('allow-analyst-read');
        (0, vitest_1.expect)(outcome.governance.actor?.tenantId).toBe('tenant-1');
    });
    (0, vitest_1.it)('supports dynamic policy overrides for recommendations and outputs', () => {
        const denyRule = {
            id: 'deny-analyst-deletion',
            description: 'Analysts cannot delete datasets',
            effect: 'deny',
            actions: ['dataset:delete'],
            resources: ['dataset'],
            conditions: [
                { attribute: 'roles', operator: 'includes', value: ['analyst'] },
            ],
        };
        const deleteRequest = {
            ...baseRequest,
            action: 'dataset:delete',
        };
        const recommendation = orchestrator.evaluateRecommendation({ id: 'rec-1', kind: 'guard', content: 'Escalate delete' }, deleteRequest, { dynamicRules: [denyRule] });
        (0, vitest_1.expect)(recommendation.governance.status).toBe('REJECTED');
        (0, vitest_1.expect)(recommendation.governance.runtime?.dynamicRulesApplied).toContain('deny-analyst-deletion');
        const governedOutput = orchestrator.evaluateOutput({ message: 'workflow output' }, deleteRequest, { dynamicRules: [denyRule] });
        (0, vitest_1.expect)(governedOutput.governance.status).toBe('REJECTED');
    });
    (0, vitest_1.it)('propagates workflow validation into governance verdicts', () => {
        const validation = {
            valid: false,
            issues: [
                { severity: 'error', message: 'missing approval', ruleId: 'r1' },
                { severity: 'warning', message: 'lacking budget cap', ruleId: 'r2' },
            ],
        };
        const governed = orchestrator.validateWorkflow({ id: 'wf-1', tenantId: 'tenant-1', owner: 'user-1', roles: ['owner'] }, validation);
        (0, vitest_1.expect)(governed.governance.status).toBe('REJECTED');
        (0, vitest_1.expect)((0, index_js_1.summarizeWorkflowIssues)(validation.issues ?? [])).toContain('error:r1:missing approval');
    });
});
(0, vitest_1.describe)('Adversarial probes', () => {
    const engine = new index_js_1.PolicyEngine(baseRules);
    const orchestrator = new index_js_1.GovernanceOrchestrator(engine, {
        evaluatedBy: 'adversarial-harness',
        engineFactory: (rules) => new index_js_1.PolicyEngine(rules),
    });
    (0, vitest_1.it)('detects bypass attempts and stays aligned to expected outcomes', () => {
        const probes = (0, index_js_1.runAdversarialProbes)(orchestrator, [
            {
                name: 'legitimate-read',
                request: baseRequest,
                expectedStatus: 'APPROVED',
            },
            {
                name: 'exfiltration-attempt',
                request: {
                    action: 'model:exfiltrate',
                    resource: 'model',
                    context: {
                        tenantId: 'tenant-1',
                        userId: 'user-2',
                        roles: ['external'],
                    },
                },
                expectedStatus: 'REJECTED',
            },
        ]);
        (0, vitest_1.expect)(probes.every((probe) => probe.bypassDetected === false)).toBe(true);
        (0, vitest_1.expect)(probes.map((probe) => probe.verdict.status)).toEqual([
            'APPROVED',
            'REJECTED',
        ]);
    });
});
(0, vitest_1.describe)('buildGovernanceVerdict helper', () => {
    (0, vitest_1.it)('creates a universal governance envelope from a policy evaluation', () => {
        const evaluation = {
            allowed: false,
            effect: 'deny',
            matchedRules: ['deny-everything'],
            reasons: ['deny-everything'],
            obligations: [],
            trace: [],
        };
        const verdict = (0, index_js_1.buildGovernanceVerdict)(baseRequest, evaluation, {
            evaluatedBy: 'unit-test',
            surface: 'microservice',
            recommendations: ['manual-review'],
            evidence: { rationale: 'unit-test' },
        });
        (0, vitest_1.expect)(verdict.status).toBe('REJECTED');
        (0, vitest_1.expect)(verdict.policyIds).toContain('deny-everything');
        (0, vitest_1.expect)(verdict.recommendations).toContain('manual-review');
    });
});
