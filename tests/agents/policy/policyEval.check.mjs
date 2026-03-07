import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const policyEvalUrl = pathToFileURL(
  path.resolve('src/agents/policy/policyEval.ts'),
);

const { evaluateInvocation } = await import(policyEvalUrl.href);

const basePolicy = {
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

const unknownDecision = evaluateInvocation(
  { toolId: 'UnknownTool', operation: 'search' },
  basePolicy,
);
assert.deepEqual(unknownDecision, {
  allow: false,
  reason: 'TOOL_NOT_ALLOWLISTED',
});

const approvalDecision = evaluateInvocation(
  {
    toolId: 'SearchOSINT',
    operation: 'search',
    sourceId: 'restricted-provider',
  },
  basePolicy,
);
assert.deepEqual(approvalDecision, {
  allow: false,
  reason: 'APPROVAL_REQUIRED',
});

const allowDecision = evaluateInvocation(
  {
    toolId: 'SearchOSINT',
    operation: 'search',
    sourceId: 'restricted-provider',
    approvalId: 'APPROVAL-123',
  },
  basePolicy,
);
assert.deepEqual(allowDecision, { allow: true });

console.log('policyEval.check: ok');
