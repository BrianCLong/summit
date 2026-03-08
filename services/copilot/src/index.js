"use strict";
/**
 * Copilot Service - NL to Cypher/SQL with Guardrails
 *
 * Public API exports for the copilot service.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = exports.createDefaultPolicyResolver = exports.createDefaultSchemaResolver = exports.createDefaultUserContext = exports.createCopilotRouter = exports.createAuditLog = exports.createDraftQueryRepository = exports.PostgresAuditLog = exports.PostgresDraftQueryRepository = exports.InMemoryAuditLog = exports.InMemoryDraftQueryRepository = exports.MockQueryExecutor = exports.StubPolicyEngine = exports.CopilotService = exports.analyzeQuerySafety = exports.createSafetyAnalyzer = exports.SafetyAnalyzer = exports.createLlmAdapter = exports.MockLlmAdapter = void 0;
// LLM Adapter
var LlmAdapter_js_1 = require("./LlmAdapter.js");
Object.defineProperty(exports, "MockLlmAdapter", { enumerable: true, get: function () { return LlmAdapter_js_1.MockLlmAdapter; } });
Object.defineProperty(exports, "createLlmAdapter", { enumerable: true, get: function () { return LlmAdapter_js_1.createLlmAdapter; } });
// Safety Analyzer
var SafetyAnalyzer_js_1 = require("./SafetyAnalyzer.js");
Object.defineProperty(exports, "SafetyAnalyzer", { enumerable: true, get: function () { return SafetyAnalyzer_js_1.SafetyAnalyzer; } });
Object.defineProperty(exports, "createSafetyAnalyzer", { enumerable: true, get: function () { return SafetyAnalyzer_js_1.createSafetyAnalyzer; } });
Object.defineProperty(exports, "analyzeQuerySafety", { enumerable: true, get: function () { return SafetyAnalyzer_js_1.analyzeQuerySafety; } });
// Copilot Service
var CopilotService_js_1 = require("./CopilotService.js");
Object.defineProperty(exports, "CopilotService", { enumerable: true, get: function () { return CopilotService_js_1.CopilotService; } });
Object.defineProperty(exports, "StubPolicyEngine", { enumerable: true, get: function () { return CopilotService_js_1.StubPolicyEngine; } });
Object.defineProperty(exports, "MockQueryExecutor", { enumerable: true, get: function () { return CopilotService_js_1.MockQueryExecutor; } });
// Repositories
var repositories_js_1 = require("./repositories.js");
Object.defineProperty(exports, "InMemoryDraftQueryRepository", { enumerable: true, get: function () { return repositories_js_1.InMemoryDraftQueryRepository; } });
Object.defineProperty(exports, "InMemoryAuditLog", { enumerable: true, get: function () { return repositories_js_1.InMemoryAuditLog; } });
Object.defineProperty(exports, "PostgresDraftQueryRepository", { enumerable: true, get: function () { return repositories_js_1.PostgresDraftQueryRepository; } });
Object.defineProperty(exports, "PostgresAuditLog", { enumerable: true, get: function () { return repositories_js_1.PostgresAuditLog; } });
Object.defineProperty(exports, "createDraftQueryRepository", { enumerable: true, get: function () { return repositories_js_1.createDraftQueryRepository; } });
Object.defineProperty(exports, "createAuditLog", { enumerable: true, get: function () { return repositories_js_1.createAuditLog; } });
// Routes
var routes_js_1 = require("./routes.js");
Object.defineProperty(exports, "createCopilotRouter", { enumerable: true, get: function () { return routes_js_1.createCopilotRouter; } });
Object.defineProperty(exports, "createDefaultUserContext", { enumerable: true, get: function () { return routes_js_1.createDefaultUserContext; } });
Object.defineProperty(exports, "createDefaultSchemaResolver", { enumerable: true, get: function () { return routes_js_1.createDefaultSchemaResolver; } });
Object.defineProperty(exports, "createDefaultPolicyResolver", { enumerable: true, get: function () { return routes_js_1.createDefaultPolicyResolver; } });
// Server
var server_js_1 = require("./server.js");
Object.defineProperty(exports, "createApp", { enumerable: true, get: function () { return server_js_1.createApp; } });
