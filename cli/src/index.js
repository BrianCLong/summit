"use strict";
/**
 * IntelGraph CLI - Public API
 * Export modules for programmatic usage
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEventLogger = exports.EventLogger = exports.generateRandomSessionId = exports.generateSessionId = exports.cleanOldSessions = exports.listSessions = exports.loadSession = exports.createSession = exports.Session = exports.DEFAULT_PROVIDER_OPTIONS = exports.PROVIDER_EXIT_CODE = exports.parseRetryAfter = exports.calculateBackoff = exports.classifyError = exports.createProviderWrapper = exports.BudgetExceededError = exports.ProviderError = exports.ProviderWrapper = exports.GIT_WORKFLOW_EXIT_CODE = exports.findRepoRoot = exports.isGitRepo = exports.getGitStatus = exports.createGitWorkflow = exports.GitWorkflowError = exports.GitWorkflow = exports.HARDCODED_DENY_PATTERNS = exports.SANDBOX_EXIT_CODE = exports.scrubEnvironment = exports.isPathWithin = exports.normalizePath = exports.matchesGlob = exports.detectRepoRoot = exports.createSandbox = exports.SandboxError = exports.Sandbox = exports.POLICY_EXIT_CODE = exports.computePolicyBundleHash = exports.loadPolicyBundle = exports.stableStringify = exports.sortActions = exports.buildPolicyInput = exports.PolicyError = exports.PolicyGate = exports.EXIT_CODES = exports.VERSION = exports.loadConfig = exports.PgVectorSync = exports.ExportManager = exports.AgentClient = exports.GraphClient = void 0;
exports.DEFAULT_DETERMINISM_OPTIONS = exports.DETERMINISM_EXIT_CODES = exports.writeEvidenceArtifacts = exports.findFirstDiff = exports.generateDiffMarkdown = exports.generateEvidenceMarkdown = exports.generateEvidenceJson = exports.runPackageTests = exports.runCommand = exports.getDeterministicEnv = exports.generateDeterministicId = exports.canonicalizeJson = exports.computeHash = exports.createDeterminismHarness = exports.runDeterminismHarness = exports.replayCapsule = exports.generateEvidenceBundle = exports.runCapsule = exports.CapsulePolicyGate = exports.readLedgerEntries = exports.verifyLedger = exports.CapsuleLedger = exports.normalizeRelativePath = exports.loadCapsuleManifest = exports.writeReportArtifact = exports.generateMarkdownReport = exports.formatSummaryJson = exports.formatSummaryText = exports.buildReplaySummary = exports.replaySession = exports.stableSortStrings = exports.sortObjectKeys = exports.redactObject = exports.redactSensitive = exports.readEvents = void 0;
var graph_client_js_1 = require("./lib/graph-client.js");
Object.defineProperty(exports, "GraphClient", { enumerable: true, get: function () { return graph_client_js_1.GraphClient; } });
var agent_client_js_1 = require("./lib/agent-client.js");
Object.defineProperty(exports, "AgentClient", { enumerable: true, get: function () { return agent_client_js_1.AgentClient; } });
var export_manager_js_1 = require("./lib/export-manager.js");
Object.defineProperty(exports, "ExportManager", { enumerable: true, get: function () { return export_manager_js_1.ExportManager; } });
var pgvector_sync_js_1 = require("./lib/pgvector-sync.js");
Object.defineProperty(exports, "PgVectorSync", { enumerable: true, get: function () { return pgvector_sync_js_1.PgVectorSync; } });
var config_js_1 = require("./lib/config.js");
Object.defineProperty(exports, "loadConfig", { enumerable: true, get: function () { return config_js_1.loadConfig; } });
var constants_js_1 = require("./lib/constants.js");
Object.defineProperty(exports, "VERSION", { enumerable: true, get: function () { return constants_js_1.VERSION; } });
Object.defineProperty(exports, "EXIT_CODES", { enumerable: true, get: function () { return constants_js_1.EXIT_CODES; } });
// Policy and sandbox modules
var policy_js_1 = require("./lib/policy.js");
Object.defineProperty(exports, "PolicyGate", { enumerable: true, get: function () { return policy_js_1.PolicyGate; } });
Object.defineProperty(exports, "PolicyError", { enumerable: true, get: function () { return policy_js_1.PolicyError; } });
Object.defineProperty(exports, "buildPolicyInput", { enumerable: true, get: function () { return policy_js_1.buildPolicyInput; } });
Object.defineProperty(exports, "sortActions", { enumerable: true, get: function () { return policy_js_1.sortActions; } });
Object.defineProperty(exports, "stableStringify", { enumerable: true, get: function () { return policy_js_1.stableStringify; } });
Object.defineProperty(exports, "loadPolicyBundle", { enumerable: true, get: function () { return policy_js_1.loadPolicyBundle; } });
Object.defineProperty(exports, "computePolicyBundleHash", { enumerable: true, get: function () { return policy_js_1.computePolicyBundleHash; } });
Object.defineProperty(exports, "POLICY_EXIT_CODE", { enumerable: true, get: function () { return policy_js_1.POLICY_EXIT_CODE; } });
var sandbox_js_1 = require("./lib/sandbox.js");
Object.defineProperty(exports, "Sandbox", { enumerable: true, get: function () { return sandbox_js_1.Sandbox; } });
Object.defineProperty(exports, "SandboxError", { enumerable: true, get: function () { return sandbox_js_1.SandboxError; } });
Object.defineProperty(exports, "createSandbox", { enumerable: true, get: function () { return sandbox_js_1.createSandbox; } });
Object.defineProperty(exports, "detectRepoRoot", { enumerable: true, get: function () { return sandbox_js_1.detectRepoRoot; } });
Object.defineProperty(exports, "matchesGlob", { enumerable: true, get: function () { return sandbox_js_1.matchesGlob; } });
Object.defineProperty(exports, "normalizePath", { enumerable: true, get: function () { return sandbox_js_1.normalizePath; } });
Object.defineProperty(exports, "isPathWithin", { enumerable: true, get: function () { return sandbox_js_1.isPathWithin; } });
Object.defineProperty(exports, "scrubEnvironment", { enumerable: true, get: function () { return sandbox_js_1.scrubEnvironment; } });
Object.defineProperty(exports, "SANDBOX_EXIT_CODE", { enumerable: true, get: function () { return sandbox_js_1.SANDBOX_EXIT_CODE; } });
Object.defineProperty(exports, "HARDCODED_DENY_PATTERNS", { enumerable: true, get: function () { return sandbox_js_1.HARDCODED_DENY_PATTERNS; } });
// Git workflow module
var git_workflow_js_1 = require("./lib/git-workflow.js");
Object.defineProperty(exports, "GitWorkflow", { enumerable: true, get: function () { return git_workflow_js_1.GitWorkflow; } });
Object.defineProperty(exports, "GitWorkflowError", { enumerable: true, get: function () { return git_workflow_js_1.GitWorkflowError; } });
Object.defineProperty(exports, "createGitWorkflow", { enumerable: true, get: function () { return git_workflow_js_1.createGitWorkflow; } });
Object.defineProperty(exports, "getGitStatus", { enumerable: true, get: function () { return git_workflow_js_1.getGitStatus; } });
Object.defineProperty(exports, "isGitRepo", { enumerable: true, get: function () { return git_workflow_js_1.isGitRepo; } });
Object.defineProperty(exports, "findRepoRoot", { enumerable: true, get: function () { return git_workflow_js_1.findRepoRoot; } });
Object.defineProperty(exports, "GIT_WORKFLOW_EXIT_CODE", { enumerable: true, get: function () { return git_workflow_js_1.GIT_WORKFLOW_EXIT_CODE; } });
// Provider reliability module
var provider_js_1 = require("./lib/provider.js");
Object.defineProperty(exports, "ProviderWrapper", { enumerable: true, get: function () { return provider_js_1.ProviderWrapper; } });
Object.defineProperty(exports, "ProviderError", { enumerable: true, get: function () { return provider_js_1.ProviderError; } });
Object.defineProperty(exports, "BudgetExceededError", { enumerable: true, get: function () { return provider_js_1.BudgetExceededError; } });
Object.defineProperty(exports, "createProviderWrapper", { enumerable: true, get: function () { return provider_js_1.createProviderWrapper; } });
Object.defineProperty(exports, "classifyError", { enumerable: true, get: function () { return provider_js_1.classifyError; } });
Object.defineProperty(exports, "calculateBackoff", { enumerable: true, get: function () { return provider_js_1.calculateBackoff; } });
Object.defineProperty(exports, "parseRetryAfter", { enumerable: true, get: function () { return provider_js_1.parseRetryAfter; } });
Object.defineProperty(exports, "PROVIDER_EXIT_CODE", { enumerable: true, get: function () { return provider_js_1.PROVIDER_EXIT_CODE; } });
Object.defineProperty(exports, "DEFAULT_PROVIDER_OPTIONS", { enumerable: true, get: function () { return provider_js_1.DEFAULT_PROVIDER_OPTIONS; } });
// Session management module
var session_js_1 = require("./lib/session.js");
Object.defineProperty(exports, "Session", { enumerable: true, get: function () { return session_js_1.Session; } });
Object.defineProperty(exports, "createSession", { enumerable: true, get: function () { return session_js_1.createSession; } });
Object.defineProperty(exports, "loadSession", { enumerable: true, get: function () { return session_js_1.loadSession; } });
Object.defineProperty(exports, "listSessions", { enumerable: true, get: function () { return session_js_1.listSessions; } });
Object.defineProperty(exports, "cleanOldSessions", { enumerable: true, get: function () { return session_js_1.cleanOldSessions; } });
Object.defineProperty(exports, "generateSessionId", { enumerable: true, get: function () { return session_js_1.generateSessionId; } });
Object.defineProperty(exports, "generateRandomSessionId", { enumerable: true, get: function () { return session_js_1.generateRandomSessionId; } });
// Event logger module
var event_logger_js_1 = require("./lib/event-logger.js");
Object.defineProperty(exports, "EventLogger", { enumerable: true, get: function () { return event_logger_js_1.EventLogger; } });
Object.defineProperty(exports, "createEventLogger", { enumerable: true, get: function () { return event_logger_js_1.createEventLogger; } });
Object.defineProperty(exports, "readEvents", { enumerable: true, get: function () { return event_logger_js_1.readEvents; } });
Object.defineProperty(exports, "redactSensitive", { enumerable: true, get: function () { return event_logger_js_1.redactSensitive; } });
Object.defineProperty(exports, "redactObject", { enumerable: true, get: function () { return event_logger_js_1.redactObject; } });
Object.defineProperty(exports, "sortObjectKeys", { enumerable: true, get: function () { return event_logger_js_1.sortObjectKeys; } });
Object.defineProperty(exports, "stableSortStrings", { enumerable: true, get: function () { return event_logger_js_1.stableSortStrings; } });
// Replay module
var replay_js_1 = require("./lib/replay.js");
Object.defineProperty(exports, "replaySession", { enumerable: true, get: function () { return replay_js_1.replaySession; } });
Object.defineProperty(exports, "buildReplaySummary", { enumerable: true, get: function () { return replay_js_1.buildReplaySummary; } });
Object.defineProperty(exports, "formatSummaryText", { enumerable: true, get: function () { return replay_js_1.formatSummaryText; } });
Object.defineProperty(exports, "formatSummaryJson", { enumerable: true, get: function () { return replay_js_1.formatSummaryJson; } });
Object.defineProperty(exports, "generateMarkdownReport", { enumerable: true, get: function () { return replay_js_1.generateMarkdownReport; } });
Object.defineProperty(exports, "writeReportArtifact", { enumerable: true, get: function () { return replay_js_1.writeReportArtifact; } });
// Switchboard capsule modules
var switchboard_capsule_js_1 = require("./lib/switchboard-capsule.js");
Object.defineProperty(exports, "loadCapsuleManifest", { enumerable: true, get: function () { return switchboard_capsule_js_1.loadCapsuleManifest; } });
Object.defineProperty(exports, "normalizeRelativePath", { enumerable: true, get: function () { return switchboard_capsule_js_1.normalizeRelativePath; } });
var switchboard_ledger_js_1 = require("./lib/switchboard-ledger.js");
Object.defineProperty(exports, "CapsuleLedger", { enumerable: true, get: function () { return switchboard_ledger_js_1.CapsuleLedger; } });
Object.defineProperty(exports, "verifyLedger", { enumerable: true, get: function () { return switchboard_ledger_js_1.verifyLedger; } });
Object.defineProperty(exports, "readLedgerEntries", { enumerable: true, get: function () { return switchboard_ledger_js_1.readLedgerEntries; } });
var switchboard_policy_js_1 = require("./lib/switchboard-policy.js");
Object.defineProperty(exports, "CapsulePolicyGate", { enumerable: true, get: function () { return switchboard_policy_js_1.CapsulePolicyGate; } });
var switchboard_runner_js_1 = require("./lib/switchboard-runner.js");
Object.defineProperty(exports, "runCapsule", { enumerable: true, get: function () { return switchboard_runner_js_1.runCapsule; } });
var switchboard_evidence_js_1 = require("./lib/switchboard-evidence.js");
Object.defineProperty(exports, "generateEvidenceBundle", { enumerable: true, get: function () { return switchboard_evidence_js_1.generateEvidenceBundle; } });
var switchboard_replay_js_1 = require("./lib/switchboard-replay.js");
Object.defineProperty(exports, "replayCapsule", { enumerable: true, get: function () { return switchboard_replay_js_1.replayCapsule; } });
// Determinism harness module
var determinism_js_1 = require("./lib/determinism.js");
Object.defineProperty(exports, "runDeterminismHarness", { enumerable: true, get: function () { return determinism_js_1.runDeterminismHarness; } });
Object.defineProperty(exports, "createDeterminismHarness", { enumerable: true, get: function () { return determinism_js_1.createDeterminismHarness; } });
Object.defineProperty(exports, "computeHash", { enumerable: true, get: function () { return determinism_js_1.computeHash; } });
Object.defineProperty(exports, "canonicalizeJson", { enumerable: true, get: function () { return determinism_js_1.canonicalizeJson; } });
Object.defineProperty(exports, "generateDeterministicId", { enumerable: true, get: function () { return determinism_js_1.generateDeterministicId; } });
Object.defineProperty(exports, "getDeterministicEnv", { enumerable: true, get: function () { return determinism_js_1.getDeterministicEnv; } });
Object.defineProperty(exports, "runCommand", { enumerable: true, get: function () { return determinism_js_1.runCommand; } });
Object.defineProperty(exports, "runPackageTests", { enumerable: true, get: function () { return determinism_js_1.runPackageTests; } });
Object.defineProperty(exports, "generateEvidenceJson", { enumerable: true, get: function () { return determinism_js_1.generateEvidenceJson; } });
Object.defineProperty(exports, "generateEvidenceMarkdown", { enumerable: true, get: function () { return determinism_js_1.generateEvidenceMarkdown; } });
Object.defineProperty(exports, "generateDiffMarkdown", { enumerable: true, get: function () { return determinism_js_1.generateDiffMarkdown; } });
Object.defineProperty(exports, "findFirstDiff", { enumerable: true, get: function () { return determinism_js_1.findFirstDiff; } });
Object.defineProperty(exports, "writeEvidenceArtifacts", { enumerable: true, get: function () { return determinism_js_1.writeEvidenceArtifacts; } });
Object.defineProperty(exports, "DETERMINISM_EXIT_CODES", { enumerable: true, get: function () { return determinism_js_1.DETERMINISM_EXIT_CODES; } });
Object.defineProperty(exports, "DEFAULT_DETERMINISM_OPTIONS", { enumerable: true, get: function () { return determinism_js_1.DEFAULT_DETERMINISM_OPTIONS; } });
