"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const guarded_gateway_js_1 = require("../src/guarded-gateway.js");
(0, vitest_1.describe)('GuardedPolicyGateway', () => {
    const baseRule = {
        id: 'allow-deploy',
        description: 'Allow deploy',
        effect: 'allow',
        actions: ['orchestration.deploy'],
        resources: ['service:svc-api'],
        conditions: [],
        obligations: [],
        tags: ['high-risk'],
    };
    const request = {
        action: 'orchestration.deploy',
        resource: 'service:svc-api',
        context: { tenantId: 'tenant', userId: 'user', roles: ['developer'] },
    };
    (0, vitest_1.it)('enqueues approval for high risk evaluations', () => {
        const engine = new guarded_gateway_js_1.PolicyEngine([baseRule]);
        const auditSink = vitest_1.vi.fn();
        const gateway = new guarded_gateway_js_1.GuardedPolicyGateway({ engine, auditSink, riskThreshold: 0.4 });
        const decision = gateway.evaluate(request, { riskScore: 0.8, reason: 'high risk deployment' });
        (0, vitest_1.expect)(decision.requiresApproval).toBe(true);
        (0, vitest_1.expect)(decision.allowed).toBe(false);
        (0, vitest_1.expect)(auditSink).toHaveBeenCalled();
        gateway.approve(decision.auditRef, 'approver', 'Looks good');
        (0, vitest_1.expect)(gateway.isApproved(decision.auditRef)).toBe(true);
    });
    (0, vitest_1.it)('allows low risk decisions without approval', () => {
        const engine = new guarded_gateway_js_1.PolicyEngine([baseRule]);
        const gateway = new guarded_gateway_js_1.GuardedPolicyGateway({ engine, riskThreshold: 0.9 });
        const decision = gateway.evaluate(request, { riskScore: 0.1 });
        (0, vitest_1.expect)(decision.requiresApproval).toBe(false);
        (0, vitest_1.expect)(decision.allowed).toBe(true);
    });
    (0, vitest_1.it)('denies when underlying policy blocks action', () => {
        const denyRule = {
            id: 'deny',
            description: 'Deny',
            effect: 'deny',
            actions: ['orchestration.deploy'],
            resources: ['service:svc-api'],
            conditions: [],
            obligations: [],
        };
        const engine = new guarded_gateway_js_1.PolicyEngine([denyRule]);
        const gateway = new guarded_gateway_js_1.GuardedPolicyGateway({ engine });
        const decision = gateway.evaluate(request, { riskScore: 0.95 });
        (0, vitest_1.expect)(decision.allowed).toBe(false);
        (0, vitest_1.expect)(decision.requiresApproval).toBe(false);
    });
});
