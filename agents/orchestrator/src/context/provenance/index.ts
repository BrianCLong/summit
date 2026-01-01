/**
 * Context Provenance Graph (CPG) Module
 *
 * Implements ADR-009: Cryptographic tracking, versioning, and policy enforcement
 * over model context at token-range granularity.
 *
 * @module context/provenance
 * @see docs/adr/ADR-009_context_provenance_graph.md
 */

export * from './types.js';
export * from './ProvenanceGraph.js';
export * from './PolicyEngine.js';
export * from './ReplayEngine.js';

export { createSegmentId } from './ProvenanceGraph.js';
export {
  revokedAgentRule,
  externalTrustRedactionRule,
  unsignedSegmentAuditRule,
  policyDomainMismatchRule,
  agentQuarantineRule,
  trustTierEscalationRule,
  contextExpirationRule
} from './PolicyEngine.js';
