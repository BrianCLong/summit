"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGuardrailsService = exports.createGuardrailsService = exports.GuardrailsService = exports.CLASSIFICATION_LEVELS = exports.createRedactionServiceForUser = exports.createRedactionService = exports.RedactionService = exports.createGraphRAGProvenanceService = exports.GraphRAGProvenanceService = exports.createSandboxExecutor = exports.SandboxExecutorService = exports.getNLQueryService = exports.createNLQueryService = exports.NLQueryService = exports.getCopilotService = exports.initializeCopilotService = exports.createCopilotService = exports.CopilotService = exports.RiskyPromptLogSchema = exports.GraphRAGRequestSchema = exports.NLQueryRequestSchema = exports.QueryPreviewSchema = exports.CitationSchema = exports.CopilotRefusalSchema = exports.CopilotAnswerSchema = exports.isPreview = exports.isRefusal = exports.isAnswer = void 0;
// Types and contracts
var types_js_1 = require("./types.js");
// Type guards
Object.defineProperty(exports, "isAnswer", { enumerable: true, get: function () { return types_js_1.isAnswer; } });
Object.defineProperty(exports, "isRefusal", { enumerable: true, get: function () { return types_js_1.isRefusal; } });
Object.defineProperty(exports, "isPreview", { enumerable: true, get: function () { return types_js_1.isPreview; } });
// Zod schemas for validation
Object.defineProperty(exports, "CopilotAnswerSchema", { enumerable: true, get: function () { return types_js_1.CopilotAnswerSchema; } });
Object.defineProperty(exports, "CopilotRefusalSchema", { enumerable: true, get: function () { return types_js_1.CopilotRefusalSchema; } });
Object.defineProperty(exports, "CitationSchema", { enumerable: true, get: function () { return types_js_1.CitationSchema; } });
Object.defineProperty(exports, "QueryPreviewSchema", { enumerable: true, get: function () { return types_js_1.QueryPreviewSchema; } });
Object.defineProperty(exports, "NLQueryRequestSchema", { enumerable: true, get: function () { return types_js_1.NLQueryRequestSchema; } });
Object.defineProperty(exports, "GraphRAGRequestSchema", { enumerable: true, get: function () { return types_js_1.GraphRAGRequestSchema; } });
Object.defineProperty(exports, "RiskyPromptLogSchema", { enumerable: true, get: function () { return types_js_1.RiskyPromptLogSchema; } });
// Main copilot service
var copilot_service_js_1 = require("./copilot.service.js");
Object.defineProperty(exports, "CopilotService", { enumerable: true, get: function () { return copilot_service_js_1.CopilotService; } });
Object.defineProperty(exports, "createCopilotService", { enumerable: true, get: function () { return copilot_service_js_1.createCopilotService; } });
Object.defineProperty(exports, "initializeCopilotService", { enumerable: true, get: function () { return copilot_service_js_1.initializeCopilotService; } });
Object.defineProperty(exports, "getCopilotService", { enumerable: true, get: function () { return copilot_service_js_1.getCopilotService; } });
// NL-to-Query service
var nl_query_service_js_1 = require("./nl-query.service.js");
Object.defineProperty(exports, "NLQueryService", { enumerable: true, get: function () { return nl_query_service_js_1.NLQueryService; } });
Object.defineProperty(exports, "createNLQueryService", { enumerable: true, get: function () { return nl_query_service_js_1.createNLQueryService; } });
Object.defineProperty(exports, "getNLQueryService", { enumerable: true, get: function () { return nl_query_service_js_1.getNLQueryService; } });
// Sandbox executor
var sandbox_executor_service_js_1 = require("./sandbox-executor.service.js");
Object.defineProperty(exports, "SandboxExecutorService", { enumerable: true, get: function () { return sandbox_executor_service_js_1.SandboxExecutorService; } });
Object.defineProperty(exports, "createSandboxExecutor", { enumerable: true, get: function () { return sandbox_executor_service_js_1.createSandboxExecutor; } });
// GraphRAG with provenance
var graphrag_provenance_service_js_1 = require("./graphrag-provenance.service.js");
Object.defineProperty(exports, "GraphRAGProvenanceService", { enumerable: true, get: function () { return graphrag_provenance_service_js_1.GraphRAGProvenanceService; } });
Object.defineProperty(exports, "createGraphRAGProvenanceService", { enumerable: true, get: function () { return graphrag_provenance_service_js_1.createGraphRAGProvenanceService; } });
// Redaction service
var redaction_service_js_1 = require("./redaction.service.js");
Object.defineProperty(exports, "RedactionService", { enumerable: true, get: function () { return redaction_service_js_1.RedactionService; } });
Object.defineProperty(exports, "createRedactionService", { enumerable: true, get: function () { return redaction_service_js_1.createRedactionService; } });
Object.defineProperty(exports, "createRedactionServiceForUser", { enumerable: true, get: function () { return redaction_service_js_1.createRedactionServiceForUser; } });
Object.defineProperty(exports, "CLASSIFICATION_LEVELS", { enumerable: true, get: function () { return redaction_service_js_1.CLASSIFICATION_LEVELS; } });
// Guardrails service
var guardrails_service_js_1 = require("./guardrails.service.js");
Object.defineProperty(exports, "GuardrailsService", { enumerable: true, get: function () { return guardrails_service_js_1.GuardrailsService; } });
Object.defineProperty(exports, "createGuardrailsService", { enumerable: true, get: function () { return guardrails_service_js_1.createGuardrailsService; } });
Object.defineProperty(exports, "getGuardrailsService", { enumerable: true, get: function () { return guardrails_service_js_1.getGuardrailsService; } });
