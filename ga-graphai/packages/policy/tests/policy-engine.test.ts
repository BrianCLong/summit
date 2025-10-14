import { describe, expect, it } from 'vitest';
import type { PolicyEvaluationRequest, PolicyRule } from 'common-types';
import { PolicyEngine, buildDefaultPolicyEngine } from '../src/index.ts';

describe('PolicyEngine', () => {
  const baseRules: PolicyRule[] = [
    {
      id: 'allow-product',
      description: 'Allow product roles to read intents',
      effect: 'allow',
      actions: ['intent:read'],
      resources: ['intent'],
      conditions: [
        { attribute: 'roles', operator: 'includes', value: ['product-manager', 'architect'] }
      ]
    },
    {
      id: 'deny-out-of-region',
      description: 'Block model access outside the permitted region',
      effect: 'deny',
      actions: ['model:invoke'],
      resources: ['llm'],
      conditions: [{ attribute: 'region', operator: 'neq', value: 'us-east-1' }]
    }
  ];

  it('grants access when the allow rule matches', () => {
    const engine = new PolicyEngine(baseRules);
    const request: PolicyEvaluationRequest = {
      action: 'intent:read',
      resource: 'intent',
      context: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        roles: ['product-manager'],
        region: 'us-east-1'
      }
    };

    const result = engine.evaluate(request);
    expect(result.allowed).toBe(true);
    expect(result.matchedRules).toContain('allow-product');
    expect(result.effect).toBe('allow');
    expect(result.trace).toHaveLength(2);
  });

  it('denies access when a deny rule applies', () => {
    const engine = new PolicyEngine(baseRules);
    const request: PolicyEvaluationRequest = {
      action: 'model:invoke',
      resource: 'llm',
      context: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        roles: ['ml-engineer'],
        region: 'eu-west-1'
      }
    };

    const result = engine.evaluate(request);
    expect(result.allowed).toBe(false);
    expect(result.effect).toBe('deny');
    expect(result.reasons.some(reason => reason.includes('Denied by deny-out-of-region'))).toBe(
      true
    );
  });

  it('captures condition failure reasons', () => {
    const engine = new PolicyEngine(baseRules);
    const request: PolicyEvaluationRequest = {
      action: 'intent:read',
      resource: 'intent',
      context: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        roles: ['security-analyst'],
        region: 'us-east-1'
      }
    };

    const result = engine.evaluate(request);
    expect(result.allowed).toBe(false);
    expect(result.reasons.some(reason => reason.includes('condition roles includes'))).toBe(true);
  });

  it('default policy engine allows authorised workcell execution', () => {
    const engine = buildDefaultPolicyEngine();
    const result = engine.evaluate({
      action: 'workcell:execute',
      resource: 'analysis',
      context: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        roles: ['developer'],
        region: 'allowed-region'
      }
    });

    expect(result.allowed).toBe(true);
    expect(result.matchedRules).toContain('allow-workcell-execution');
  });

  it('default policy engine enforces regional guardrail for workcells', () => {
    const engine = buildDefaultPolicyEngine();
    const result = engine.evaluate({
      action: 'workcell:execute',
      resource: 'analysis',
      context: {
        tenantId: 'tenant-1',
        userId: 'user-1',
        roles: ['developer'],
        region: 'eu-west-1'
      }
    });

    expect(result.allowed).toBe(false);
    expect(result.effect).toBe('deny');
  });
});
