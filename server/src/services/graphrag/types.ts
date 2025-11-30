/**
 * Evidence-First GraphRAG Types
 *
 * Detected Stack:
 * - TypeScript/Node.js backend
 * - Neo4j graph database (src/graph/neo4j.ts)
 * - PostgreSQL/TimescaleDB for structured data
 * - Existing provenance ledger (src/services/provenance-ledger.ts)
 * - Policy service with classification levels (src/services/policy.ts)
 *
 * This service is mounted at: src/services/graphrag/
 */

// =============================================================================
// 1. Question & Request Types
// =============================================================================

export interface GraphRagQuestion {
  caseId: string;
  question: string;
  userId: string;
}

export interface UserContext {
  userId: string;
  roles: string[];
  clearances: string[];
  needToKnowTags?: string[];
  tenantId?: string;
  classification?: string;
  cases?: string[];
}

export interface GraphRagRequest {
  question: string;
  caseId: string;
  userId: string;
}

// =============================================================================
// 2. Evidence & Claim Snippet Types
// =============================================================================

export interface EvidenceSnippet {
  evidenceId: string;
  claimId?: string;
  sourceSystem?: string;
  snippet: string;
  score: number;
  metadata?: Record<string, any>;
  classification?: string;
  licenseId?: string;
}

export interface ClaimSnippet {
  claimId: string;
  content: string;
  confidence: number;
  evidenceHashes: string[];
  createdAt: Date;
  createdBy: string;
  investigationId?: string;
}

// =============================================================================
// 3. Graph Context Types
// =============================================================================

export interface GraphContextNode {
  id: string;
  type?: string;
  label?: string;
  properties?: Record<string, any>;
}

export interface GraphContextEdge {
  id: string;
  type?: string;
  fromId: string;
  toId: string;
  properties?: Record<string, any>;
}

export interface GraphContext {
  nodes: GraphContextNode[];
  edges: GraphContextEdge[];
  evidenceSnippets: EvidenceSnippet[];
}

// =============================================================================
// 4. Answer Types with Citations & Gaps
// =============================================================================

export interface Citation {
  evidenceId: string;
  claimId?: string;
  snippet?: string;
  relevanceScore?: number;
}

export interface GraphRagAnswer {
  answerText: string;
  citations: Citation[];
  unknowns: string[];
  usedContextSummary: {
    numNodes: number;
    numEdges: number;
    numEvidenceSnippets: number;
  };
}

// =============================================================================
// 5. Service Request/Response Types
// =============================================================================

export interface GraphRagResponse {
  answer: GraphRagAnswer;
  rawContext: GraphContext;
  requestId: string;
  timestamp: string;
}

// =============================================================================
// 6. LLM Context Types
// =============================================================================

export interface LlmContextNode {
  id: string;
  type?: string;
  label?: string;
  keyProperties: Record<string, any>;
}

export interface LlmContextEdge {
  id: string;
  type?: string;
  fromId: string;
  toId: string;
  keyProperties: Record<string, any>;
}

export interface LlmContextPayload {
  question: string;
  caseId: string;
  nodes: LlmContextNode[];
  edges: LlmContextEdge[];
  evidenceSnippets: EvidenceSnippet[];
}

export interface LlmGeneratedAnswer {
  answerText: string;
  citations: Citation[];
  unknowns: string[];
}

// =============================================================================
// 7. Repository Interfaces
// =============================================================================

export interface CaseGraphRepositoryParams {
  maxNodes?: number;
  maxDepth?: number;
  nodeTypeFilters?: string[];
}

export interface CaseGraphRepository {
  getCaseSubgraph(
    caseId: string,
    params?: CaseGraphRepositoryParams,
  ): Promise<Omit<GraphContext, 'evidenceSnippets'>>;
}

export interface EvidenceSearchParams {
  caseId: string;
  query: string;
  maxSnippets: number;
}

export interface EvidenceRepository {
  searchEvidenceSnippets(params: EvidenceSearchParams): Promise<EvidenceSnippet[]>;
  getEvidenceById(evidenceId: string): Promise<EvidenceSnippet | null>;
}

// =============================================================================
// 8. Retrieval Types
// =============================================================================

export interface RetrievalParams {
  maxNodes: number;
  maxDepth: number;
  maxEvidenceSnippets: number;
}

export interface RetrievalResult {
  context: GraphContext;
}

// =============================================================================
// 9. Policy Engine Interface
// =============================================================================

export interface PolicyDecision {
  allow: boolean;
  reason: string;
}

export interface PolicyEngine {
  canViewEvidence(params: {
    user: UserContext;
    evidenceId: string;
    metadata?: Record<string, any>;
  }): PolicyDecision;

  canViewClaim(params: {
    user: UserContext;
    claimId: string;
    metadata?: Record<string, any>;
  }): PolicyDecision;
}

// =============================================================================
// 10. LLM Adapter Interface
// =============================================================================

export interface GraphRagLlmAdapter {
  generateAnswer(input: {
    context: LlmContextPayload;
  }): Promise<LlmGeneratedAnswer>;
}

// =============================================================================
// 11. Audit Types
// =============================================================================

export interface GraphRagAuditRecord {
  id: string;
  timestamp: string;
  userId: string;
  caseId: string;
  question: string;
  contextSummary: {
    numNodes: number;
    numEdges: number;
    numEvidenceSnippets: number;
  };
  answerSummary: {
    hasAnswer: boolean;
    numCitations: number;
    numUnknowns: number;
  };
  policyDecisions?: {
    filteredEvidenceCount: number;
    allowedEvidenceCount: number;
  };
}

export interface GraphRagAuditLog {
  append(record: GraphRagAuditRecord): Promise<void>;
  getByUser(userId: string, limit?: number): Promise<GraphRagAuditRecord[]>;
  getByCase(caseId: string, limit?: number): Promise<GraphRagAuditRecord[]>;
}

// =============================================================================
// 12. Service Interface
// =============================================================================

export interface GraphRagService {
  answer(req: GraphRagRequest, user: UserContext): Promise<GraphRagResponse>;
}

// =============================================================================
// 13. Error Types
// =============================================================================

export class GraphRagError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>,
  ) {
    super(message);
    this.name = 'GraphRagError';
  }
}

export class CitationValidationError extends GraphRagError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CITATION_VALIDATION_FAILED', details);
    this.name = 'CitationValidationError';
  }
}

export class PolicyViolationError extends GraphRagError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'POLICY_VIOLATION', details);
    this.name = 'PolicyViolationError';
  }
}

export class NoEvidenceError extends GraphRagError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'NO_EVIDENCE_AVAILABLE', details);
    this.name = 'NoEvidenceError';
  }
}
