import { describe, expect, it, vi } from 'vitest';
import type { PolicyEvaluationRequest, PolicyRule } from 'common-types';
import { GuardedPolicyGateway, PolicyEngine } from '../src/guarded-gateway.js';

describe('GuardedPolicyGateway', () => {
  const baseRule: PolicyRule = {
    id: 'allow-deploy',
    description: 'Allow deploy',
    effect: 'allow',
    actions: ['orchestration.deploy'],
    resources: ['service:svc-api'],
    conditions: [],
    obligations: [],
    tags: ['high-risk'],
  };

  const request: PolicyEvaluationRequest = {
    action: 'orchestration.deploy',
    resource: 'service:svc-api',
    context: { tenantId: 'tenant', userId: 'user', roles: ['developer'] },
  };

  it('enqueues approval for high risk evaluations', () => {
    const engine = new PolicyEngine([baseRule]);
    const auditSink = vi.fn();
    const gateway = new GuardedPolicyGateway({ engine, auditSink, riskThreshold: 0.4 });

    const decision = gateway.evaluate(request, { riskScore: 0.8, reason: 'high risk deployment' });

    expect(decision.requiresApproval).toBe(true);
    expect(decision.allowed).toBe(false);
    expect(auditSink).toHaveBeenCalled();

    gateway.approve(decision.auditRef, 'approver', 'Looks good');
    expect(gateway.isApproved(decision.auditRef)).toBe(true);
  });

  it('allows low risk decisions without approval', () => {
    const engine = new PolicyEngine([baseRule]);
    const gateway = new GuardedPolicyGateway({ engine, riskThreshold: 0.9 });

    const decision = gateway.evaluate(request, { riskScore: 0.1 });
    expect(decision.requiresApproval).toBe(false);
    expect(decision.allowed).toBe(true);
  });

  it('denies when underlying policy blocks action', () => {
    const denyRule: PolicyRule = {
      id: 'deny',
      description: 'Deny',
      effect: 'deny',
      actions: ['orchestration.deploy'],
      resources: ['service:svc-api'],
      conditions: [],
      obligations: [],
    };
    const engine = new PolicyEngine([denyRule]);
    const gateway = new GuardedPolicyGateway({ engine });

    const decision = gateway.evaluate(request, { riskScore: 0.95 });
    expect(decision.allowed).toBe(false);
    expect(decision.requiresApproval).toBe(false);
  });
});
