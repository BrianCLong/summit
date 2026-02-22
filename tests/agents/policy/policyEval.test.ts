import { evaluateInvocation } from '../../../src/agents/policy/policyEval';
import type { PolicyBundle } from '../../../src/agents/policy/policyTypes';

const basePolicy: PolicyBundle = {
  tools: {
    SearchOSINT: {
      id: 'SearchOSINT',
      description: 'Public OSINT search.',
      capabilities: ['search'],
      scopes: ['public.read'],
      rateLimitPerMin: 60,
      enabled: true,
      classification: 'PUBLIC',
    },
  },
  sources: {
    'public-web': {
      id: 'public-web',
      name: 'Public Web',
      description: 'Allowlisted public sources.',
      classification: 'PUBLIC',
      jurisdiction: ['GLOBAL'],
      lawful_basis: 'public_interest',
      retention_days: 30,
      collection_methods: ['api'],
      enabled: true,
    },
    'restricted-provider': {
      id: 'restricted-provider',
      name: 'Restricted Provider',
      description: 'Restricted source requiring approval.',
      classification: 'RESTRICTED',
      jurisdiction: ['US'],
      lawful_basis: 'consent',
      retention_days: 90,
      collection_methods: ['api'],
      requires_approval: true,
      enabled: true,
    },
  },
  bannedPatterns: ['bypass', 'paywall circumvention'],
};

describe('policy evaluator', () => {
  it('denies unknown tools by default', () => {
    const decision = evaluateInvocation(
      { toolId: 'UnknownTool', operation: 'search' },
      basePolicy,
    );

    expect(decision).toEqual({ allow: false, reason: 'TOOL_NOT_ALLOWLISTED' });
  });

  it('requires approval for restricted sources', () => {
    const decision = evaluateInvocation(
      {
        toolId: 'SearchOSINT',
        operation: 'search',
        sourceId: 'restricted-provider',
      },
      basePolicy,
    );

    expect(decision).toEqual({ allow: false, reason: 'APPROVAL_REQUIRED' });
  });

  it('allows restricted sources with approvals', () => {
    const decision = evaluateInvocation(
      {
        toolId: 'SearchOSINT',
        operation: 'search',
        sourceId: 'restricted-provider',
        approvalId: 'APPROVAL-123',
      },
      basePolicy,
    );

    expect(decision).toEqual({ allow: true });
  });
});
