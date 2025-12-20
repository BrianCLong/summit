export interface EndpointOwnership {
  path: string;
  owners: string[];
  description?: string;
  policyMiddleware: string[];
}

/**
 * Endpoint ownership registry with explicit policy touchpoints.
 * This enables governance to trace which middleware enforces policy controls.
 */
export const endpointOwnership: EndpointOwnership[] = [
  {
    path: '/api/actions/preflight',
    owners: ['governance', 'platform-security'],
    description: 'OPA-backed policy simulation for high-risk actions',
    policyMiddleware: [
      'correlationIdMiddleware',
      'auditFirstMiddleware',
      'ActionPolicyService',
      'OPA summit/abac',
    ],
  },
  {
    path: '/api/actions/execute',
    owners: ['governance', 'platform-security'],
    description:
      'Execution guard that validates preflight receipts and correlation IDs',
    policyMiddleware: [
      'correlationIdMiddleware',
      'auditFirstMiddleware',
      'ActionPolicyService',
    ],
  },
  {
    path: '/graphql',
    owners: ['intelgraph-core'],
    description: 'Primary GraphQL surface protected by PBAC + audit plugins',
    policyMiddleware: [
      'correlationIdMiddleware',
      'auditLogger',
      'auditFirstMiddleware',
      'pbacPlugin',
      'licenseRuleValidationMiddleware',
    ],
  },
  {
    path: '/api/ai',
    owners: ['ai-platform'],
    description: 'AI service endpoints gated by authorization middleware',
    policyMiddleware: ['authorization', 'auditLogger', 'rateLimitMiddleware'],
  },
  {
    path: '/api/maestro',
    owners: ['maestro'],
    description: 'Maestro orchestration APIs with audit-first enforcement',
    policyMiddleware: ['auditFirstMiddleware', 'rateLimitMiddleware'],
  },
];
