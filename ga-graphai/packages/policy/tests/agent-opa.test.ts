import { describe, expect, it } from 'vitest';
import { AgentPolicyOPA, type AgentAccessRequest } from '../src/agent-opa.js';
import type { PolicyBundleDocument } from '../src/authority-compiler.js';

const bundle: PolicyBundleDocument = {
  version: '1.0.0',
  policies: [
    {
      id: 'allow-exploratory-osint',
      effect: 'allow',
      selectors: {
        actions: ['tool:osint'],
        resources: ['graph:sandbox'],
        authorities: ['role:analyst', 'risk:exploratory'],
      },
      obligations: [{ type: 'record-provenance' }],
      reason: 'OSINT agents may probe sandbox graphs only',
    },
    {
      id: 'production-reporting',
      effect: 'allow',
      selectors: {
        actions: ['tool:reporting'],
        resources: ['graph:production'],
        authorities: ['role:reporter', 'risk:production'],
        licenses: ['reporting-llm'],
      },
      obligations: [{ type: 'human-approval' }],
    },
    {
      id: 'deny-exploratory-production',
      effect: 'deny',
      selectors: {
        actions: ['tool:osint', 'tool:reporting'],
        resources: ['graph:production'],
        authorities: ['risk:exploratory'],
      },
      reason: 'Exploratory agents blocked from production graph surfaces',
    },
  ],
};

describe('AgentPolicyOPA', () => {
  const engine = AgentPolicyOPA.fromBundle(bundle);

  it('allows sandbox OSINT for exploratory agents with provenance obligations', () => {
    const request: AgentAccessRequest = {
      agent: { id: 'agent-1', role: 'analyst', riskLevel: 'exploratory' },
      toolId: 'osint',
      graphNamespace: 'sandbox',
      graphSensitivity: 'sandbox',
    };

    const decision = engine.evaluate(request);
    expect(decision.allowed).toBe(true);
    expect(decision.guardId).toBe('allow-exploratory-osint');
    expect(decision.obligations.some((obligation) => obligation.type === 'record-provenance')).toBe(true);
  });

  it('enforces production guardrails based on risk posture', () => {
    const exploratoryProduction: AgentAccessRequest = {
      agent: { id: 'agent-2', role: 'analyst', riskLevel: 'exploratory' },
      toolId: 'osint',
      graphNamespace: 'production',
      graphSensitivity: 'production',
    };

    const denied = engine.evaluate(exploratoryProduction);
    expect(denied.allowed).toBe(false);
    expect(denied.reason).toContain('Production graph access');

    const productionReporter: AgentAccessRequest = {
      agent: { id: 'agent-3', role: 'reporter', riskLevel: 'production' },
      toolId: 'reporting',
      graphNamespace: 'production',
      graphSensitivity: 'production',
      model: 'reporting-llm',
    };

    const allowed = engine.evaluate(productionReporter);
    expect(allowed.allowed).toBe(true);
    expect(allowed.guardId).toBe('production-reporting');
    expect(allowed.obligations.some((obligation) => obligation.type === 'human-approval')).toBe(true);
  });
});
