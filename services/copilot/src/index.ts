/**
 * Copilot Service - NL to Cypher/SQL with Guardrails
 *
 * Public API exports for the copilot service.
 */

// Types
export type {
  FieldSchema,
  NodeTypeSchema,
  EdgeTypeSchema,
  GraphSchemaDescription,
  PolicyContext,
  QueryOperation,
  UserContext,
  QueryDialect,
  LlmGenerateInput,
  LlmGenerateOutput,
  ConversationMessage,
  CopilotRequest,
  CopilotDraftQuery,
  QueryCostEstimate,
  SafetyCheckResult,
  SafetyViolation,
  SafetyWarning,
  SafetyViolationCode,
  ExecuteRequest,
  ExecuteResponse,
  ExecutionError,
  CopilotAuditAction,
  CopilotAuditRecord,
  PolicyDecision,
  PolicyObligation,
  PolicyEvaluationInput,
  DraftQueryRepository,
  CopilotAuditLog,
  PreviewRequest,
  PreviewResponse,
  ExecuteAPIRequest,
  ExecuteAPIResponse,
  ErrorResponse,
} from './types.js';

// LLM Adapter
export { type LlmAdapter, MockLlmAdapter, createLlmAdapter } from './LlmAdapter.js';

// Safety Analyzer
export { SafetyAnalyzer, createSafetyAnalyzer, analyzeQuerySafety } from './SafetyAnalyzer.js';

// Copilot Service
export {
  CopilotService,
  type CopilotServiceConfig,
  type CopilotPolicyEngine,
  type QueryExecutor,
  StubPolicyEngine,
  MockQueryExecutor,
} from './CopilotService.js';

// Repositories
export {
  InMemoryDraftQueryRepository,
  InMemoryAuditLog,
  PostgresDraftQueryRepository,
  PostgresAuditLog,
  createDraftQueryRepository,
  createAuditLog,
  type RepositoryType,
} from './repositories.js';

// Routes
export {
  createCopilotRouter,
  type CopilotRouterConfig,
  createDefaultUserContext,
  createDefaultSchemaResolver,
  createDefaultPolicyResolver,
} from './routes.js';

// Server
export { createApp } from './server.js';
