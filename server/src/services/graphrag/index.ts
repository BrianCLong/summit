/**
 * Evidence-First GraphRAG Service
 *
 * Provides citation-backed answers from graph-linked evidence.
 * - Answers only from evidence in the case graph
 * - Mandatory citations for all factual claims
 * - Explicit unknowns/gaps when evidence is insufficient
 * - Policy/provenance enforcement
 */

// Types
export * from './types.js';

// Repositories
export {
  Neo4jCaseGraphRepository,
  InMemoryCaseGraphRepository,
  createCaseGraphRepository,
} from './repositories/CaseGraphRepository.js';

export {
  PostgresEvidenceRepository,
  InMemoryEvidenceRepository,
  createEvidenceRepository,
} from './repositories/EvidenceRepository.js';

// Retrieval
export {
  retrieveGraphContext,
  buildLlmContextPayload,
  getContextSummary,
  getValidEvidenceIds,
  getValidClaimIds,
} from './retrieval.js';

// LLM Adapter
export {
  OpenAIGraphRagLlmAdapter,
  MockGraphRagLlmAdapter,
  createLlmAdapter,
} from './llm-adapter.js';

// Policy
export {
  DefaultPolicyEngine,
  MockPolicyEngine,
  filterEvidenceByPolicy,
  applyPolicyToContext,
  canAccessCase,
  createPolicyEngine,
} from './policy-guard.js';

// Audit
export {
  PostgresGraphRagAuditLog,
  InMemoryGraphRagAuditLog,
  createAuditRecord,
  createAuditLog,
  GRAPHRAG_AUDIT_SCHEMA,
} from './audit-log.js';

// Service
export { EvidenceFirstGraphRagService, createGraphRagService } from './service.js';

// Factory for creating fully configured service instance
import { createCaseGraphRepository } from './repositories/CaseGraphRepository.js';
import { createEvidenceRepository } from './repositories/EvidenceRepository.js';
import { createLlmAdapter } from './llm-adapter.js';
import { createPolicyEngine } from './policy-guard.js';
import { createAuditLog } from './audit-log.js';
import { createGraphRagService } from './service.js';
import { GraphRagService, RetrievalParams } from './types.js';

let _serviceInstance: GraphRagService | null = null;

/**
 * Get or create the default GraphRAG service instance
 */
export function getGraphRagService(
  config?: Partial<RetrievalParams>,
): GraphRagService {
  if (!_serviceInstance) {
    _serviceInstance = createGraphRagService({
      caseGraphRepo: createCaseGraphRepository(),
      evidenceRepo: createEvidenceRepository(),
      policyEngine: createPolicyEngine(),
      llmAdapter: createLlmAdapter(),
      auditLog: createAuditLog(),
      retrievalParams: config,
    });
  }
  return _serviceInstance;
}

/**
 * Reset service instance (for testing)
 */
export function resetGraphRagService(): void {
  _serviceInstance = null;
}
