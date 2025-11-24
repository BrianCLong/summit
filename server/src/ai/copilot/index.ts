/**
 * AI Copilot Module
 *
 * Provides natural language query generation and GraphRAG capabilities
 * for the IntelGraph intelligence analysis platform.
 *
 * Features:
 * - NL-to-Cypher query translation with pattern matching and LLM fallback
 * - Sandbox query execution with dry-run planning and budget enforcement
 * - GraphRAG with provenance citations from graph entities and prov-ledger
 * - Redaction-aware response filtering based on policy labels and clearance
 * - Guardrails ensuring no answer without citations and policy compliance
 * - Risky prompt logging for red-team review
 */

// Types and contracts
export {
  // Core types
  type CopilotAnswer,
  type CopilotRefusal,
  type CopilotResponse,
  type Citation,
  type Provenance,
  type WhyPath,
  type RedactionStatus,
  type GuardrailCheck,
  type QueryPreview,
  type QueryCostEstimate,
  type QueryRefinement,
  type RiskyPromptLog,
  type RiskLevel,

  // Request types
  type NLQueryRequest,
  type GraphRAGRequest,

  // Entity types
  type EntityReference,
  type RelationshipReference,

  // Type guards
  isAnswer,
  isRefusal,
  isPreview,

  // Zod schemas for validation
  CopilotAnswerSchema,
  CopilotRefusalSchema,
  CitationSchema,
  QueryPreviewSchema,
  NLQueryRequestSchema,
  GraphRAGRequestSchema,
  RiskyPromptLogSchema,
} from './types.js';

// Main copilot service
export {
  CopilotService,
  createCopilotService,
  initializeCopilotService,
  getCopilotService,
  type CopilotConfig,
  type RequestContext,
} from './copilot.service.js';

// NL-to-Query service
export {
  NLQueryService,
  createNLQueryService,
  getNLQueryService,
} from './nl-query.service.js';

// Sandbox executor
export {
  SandboxExecutorService,
  createSandboxExecutor,
  type QueryBudget,
  type DryRunPlan,
  type ExecutionResult,
} from './sandbox-executor.service.js';

// GraphRAG with provenance
export {
  GraphRAGProvenanceService,
  createGraphRAGProvenanceService,
} from './graphrag-provenance.service.js';

// Redaction service
export {
  RedactionService,
  createRedactionService,
  createRedactionServiceForUser,
  CLASSIFICATION_LEVELS,
  type ClassificationLevel,
  type RedactionPolicy,
} from './redaction.service.js';

// Guardrails service
export {
  GuardrailsService,
  createGuardrailsService,
  getGuardrailsService,
  type GuardrailConfig,
  type GuardrailCheckName,
} from './guardrails.service.js';
