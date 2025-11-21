/**
 * Server Integration Setup
 * Example of wiring governance hooks into the Summit GraphQL server
 */

import {
  createAuthorityHook,
  createPIIDetectionHook,
  createProvenanceHook,
  createAuditHook,
  composeHooks,
  DEFAULT_PII_PATTERNS,
  type GovernancePlugin,
  type AuditLogger,
  type ProvenanceRecorder,
} from '../graphql-hooks';

import {
  createQueryValidationHook,
  createCitationEnforcementHook,
  createCopilotProvenanceHook,
  createCostControlHook,
  composeCopilotHooks,
  type CopilotHook,
} from '../copilot-hooks';

import {
  createLicenseValidationHook,
  createConnectorRateLimitHook,
  createConnectorProvenanceHook,
  composeConnectorHooks,
  type ConnectorHook,
} from '../connector-hooks';

/**
 * Create GraphQL governance middleware stack
 *
 * @example
 * ```typescript
 * const middleware = createGraphQLGovernanceMiddleware({
 *   authorityEvaluator: myPolicyEvaluator,
 *   provenanceRecorder: myProvenanceClient,
 *   auditLogger: myAuditLogger,
 * });
 * ```
 */
export function createGraphQLGovernanceMiddleware(dependencies: {
  authorityEvaluator: { evaluate: (ctx: unknown) => Promise<{ allowed: boolean; reason: string }> };
  provenanceRecorder: ProvenanceRecorder;
  auditLogger: AuditLogger;
}): GovernancePlugin {
  return composeHooks(
    createAuthorityHook(dependencies.authorityEvaluator),
    createPIIDetectionHook({ patterns: DEFAULT_PII_PATTERNS }),
    createProvenanceHook(dependencies.provenanceRecorder),
    createAuditHook(dependencies.auditLogger),
  );
}

/**
 * Create Copilot governance middleware stack
 *
 * @example
 * ```typescript
 * const middleware = createCopilotGovernanceMiddleware({
 *   costEstimator: myCostTracker,
 *   citationValidator: myCitationValidator,
 *   provenanceRecorder: myProvenanceClient,
 * });
 * ```
 */
export function createCopilotGovernanceMiddleware(dependencies: {
  costEstimator: { estimateCost: (req: unknown) => number };
  citationValidator: { validate: (citations: unknown[]) => boolean };
  provenanceRecorder: { record: (event: unknown) => Promise<void> };
}): CopilotHook {
  return composeCopilotHooks(
    createQueryValidationHook({}),
    createCostControlHook({ costEstimator: dependencies.costEstimator }),
    createCitationEnforcementHook({ citationValidator: dependencies.citationValidator }),
    createCopilotProvenanceHook(dependencies.provenanceRecorder),
  );
}

/**
 * Create Connector governance middleware stack
 *
 * @example
 * ```typescript
 * const middleware = createConnectorGovernanceMiddleware({
 *   licenseValidator: myLicenseValidator,
 *   provenanceRecorder: myProvenanceClient,
 * });
 * ```
 */
export function createConnectorGovernanceMiddleware(dependencies: {
  licenseValidator: { validate: (connectorId: string) => Promise<boolean> };
  provenanceRecorder: { record: (event: unknown) => Promise<void> };
}): ConnectorHook {
  return composeConnectorHooks(
    createLicenseValidationHook({ validator: dependencies.licenseValidator }),
    createConnectorRateLimitHook({}),
    createConnectorProvenanceHook(dependencies.provenanceRecorder),
  );
}
