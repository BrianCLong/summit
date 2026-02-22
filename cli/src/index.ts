/**
 * IntelGraph CLI - Public API
 * Export modules for programmatic usage
 */

export { GraphClient, type GraphQueryResult } from './lib/graph-client.js';
export { AgentClient, type AgentConfig, type AgentStatus } from './lib/agent-client.js';
export { ExportManager, type ExportOptions, type ExportManifest } from './lib/export-manager.js';
export { PgVectorSync, type SyncOptions, type SyncStatus } from './lib/pgvector-sync.js';
export { loadConfig, type CLIConfig } from './lib/config.js';
export { VERSION, EXIT_CODES } from './lib/constants.js';

// Policy and sandbox modules
export {
  PolicyGate,
  PolicyError,
  type PolicyAction,
  type PolicyDecision,
  type PolicyOptions,
  buildPolicyInput,
  sortActions,
  stableStringify,
  loadPolicyBundle,
  computePolicyBundleHash,
  POLICY_EXIT_CODE,
} from './lib/policy.js';

export {
  Sandbox,
  SandboxError,
  createSandbox,
  detectRepoRoot,
  matchesGlob,
  normalizePath,
  isPathWithin,
  scrubEnvironment,
  SANDBOX_EXIT_CODE,
  HARDCODED_DENY_PATTERNS,
  type SandboxOptions,
  type ToolResult,
} from './lib/sandbox.js';

// Git workflow module
export {
  GitWorkflow,
  GitWorkflowError,
  createGitWorkflow,
  getGitStatus,
  isGitRepo,
  findRepoRoot,
  GIT_WORKFLOW_EXIT_CODE,
  type GitStatus,
  type GitWorkflowOptions,
  type ReviewArtifact,
  type CommitInfo,
  type FileChange,
} from './lib/git-workflow.js';

// Provider reliability module
export {
  ProviderWrapper,
  ProviderError,
  BudgetExceededError,
  createProviderWrapper,
  classifyError,
  calculateBackoff,
  parseRetryAfter,
  PROVIDER_EXIT_CODE,
  DEFAULT_PROVIDER_OPTIONS,
  type ErrorCategory,
  type ClassifiedError,
  type ProviderOptions,
  type ProviderResult,
  type ProviderDiagnostics,
  type RequestHistoryEntry,
} from './lib/provider.js';

// Session management module
export {
  Session,
  createSession,
  loadSession,
  listSessions,
  cleanOldSessions,
  generateSessionId,
  generateRandomSessionId,
  type SessionState,
  type SessionOptions,
  type SessionDiagnostics,
  type OperationRecord,
} from './lib/session.js';

// Event logger module
export {
  EventLogger,
  createEventLogger,
  readEvents,
  redactSensitive,
  redactObject,
  sortObjectKeys,
  stableSortStrings,
  type EventType,
  type BaseEvent,
  type RunStartData,
  type StepStartData,
  type ActionData,
  type ProviderCallData,
  type ToolExecData,
  type RunEndData,
  type ErrorData,
  type PolicyDecisionData,
  type EventLoggerOptions,
} from './lib/event-logger.js';

// Replay module
export {
  replaySession,
  buildReplaySummary,
  formatSummaryText,
  formatSummaryJson,
  generateMarkdownReport,
  writeReportArtifact,
  type ReplaySummary,
  type ReplayOptions,
  type StepSummary,
  type FileSummary,
  type ProviderSummary,
  type ToolSummary,
  type ErrorSummary,
  type DiagnosticsSummary,
} from './lib/replay.js';

// Determinism harness module
export {
  runDeterminismHarness,
  createDeterminismHarness,
  computeHash,
  canonicalizeJson,
  generateDeterministicId,
  getDeterministicEnv,
  runCommand,
  runPackageTests,
  generateEvidenceJson,
  generateEvidenceMarkdown,
  generateDiffMarkdown,
  findFirstDiff,
  writeEvidenceArtifacts,
  DETERMINISM_EXIT_CODES,
  DEFAULT_DETERMINISM_OPTIONS,
  type HashAlgorithm,
  type DeterminismOptions,
  type DeterminismResult,
  type RunResult,
  type PackageTestResult,
  type EvidenceArtifact,
} from './lib/determinism.js';
