"use strict";
/**
 * Evidence-First GraphRAG Service
 *
 * Provides citation-backed answers from graph-linked evidence.
 * - Answers only from evidence in the case graph
 * - Mandatory citations for all factual claims
 * - Explicit unknowns/gaps when evidence is insufficient
 * - Policy/provenance enforcement
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGraphRagService = exports.EvidenceFirstGraphRagService = exports.GRAPHRAG_AUDIT_SCHEMA = exports.createAuditLog = exports.createAuditRecord = exports.InMemoryGraphRagAuditLog = exports.PostgresGraphRagAuditLog = exports.createPolicyEngine = exports.canAccessCase = exports.applyPolicyToContext = exports.filterEvidenceByPolicy = exports.MockPolicyEngine = exports.DefaultPolicyEngine = exports.createLlmAdapter = exports.MockGraphRagLlmAdapter = exports.OpenAIGraphRagLlmAdapter = exports.getValidClaimIds = exports.getValidEvidenceIds = exports.getContextSummary = exports.buildLlmContextPayload = exports.retrieveGraphContext = exports.createEvidenceRepository = exports.InMemoryEvidenceRepository = exports.PostgresEvidenceRepository = exports.createCaseGraphRepository = exports.InMemoryCaseGraphRepository = exports.Neo4jCaseGraphRepository = void 0;
exports.getGraphRagService = getGraphRagService;
exports.resetGraphRagService = resetGraphRagService;
// Types
__exportStar(require("./types.js"), exports);
// Repositories
var CaseGraphRepository_js_1 = require("./repositories/CaseGraphRepository.js");
Object.defineProperty(exports, "Neo4jCaseGraphRepository", { enumerable: true, get: function () { return CaseGraphRepository_js_1.Neo4jCaseGraphRepository; } });
Object.defineProperty(exports, "InMemoryCaseGraphRepository", { enumerable: true, get: function () { return CaseGraphRepository_js_1.InMemoryCaseGraphRepository; } });
Object.defineProperty(exports, "createCaseGraphRepository", { enumerable: true, get: function () { return CaseGraphRepository_js_1.createCaseGraphRepository; } });
var EvidenceRepository_js_1 = require("./repositories/EvidenceRepository.js");
Object.defineProperty(exports, "PostgresEvidenceRepository", { enumerable: true, get: function () { return EvidenceRepository_js_1.PostgresEvidenceRepository; } });
Object.defineProperty(exports, "InMemoryEvidenceRepository", { enumerable: true, get: function () { return EvidenceRepository_js_1.InMemoryEvidenceRepository; } });
Object.defineProperty(exports, "createEvidenceRepository", { enumerable: true, get: function () { return EvidenceRepository_js_1.createEvidenceRepository; } });
// Retrieval
var retrieval_js_1 = require("./retrieval.js");
Object.defineProperty(exports, "retrieveGraphContext", { enumerable: true, get: function () { return retrieval_js_1.retrieveGraphContext; } });
Object.defineProperty(exports, "buildLlmContextPayload", { enumerable: true, get: function () { return retrieval_js_1.buildLlmContextPayload; } });
Object.defineProperty(exports, "getContextSummary", { enumerable: true, get: function () { return retrieval_js_1.getContextSummary; } });
Object.defineProperty(exports, "getValidEvidenceIds", { enumerable: true, get: function () { return retrieval_js_1.getValidEvidenceIds; } });
Object.defineProperty(exports, "getValidClaimIds", { enumerable: true, get: function () { return retrieval_js_1.getValidClaimIds; } });
// LLM Adapter
var llm_adapter_js_1 = require("./llm-adapter.js");
Object.defineProperty(exports, "OpenAIGraphRagLlmAdapter", { enumerable: true, get: function () { return llm_adapter_js_1.OpenAIGraphRagLlmAdapter; } });
Object.defineProperty(exports, "MockGraphRagLlmAdapter", { enumerable: true, get: function () { return llm_adapter_js_1.MockGraphRagLlmAdapter; } });
Object.defineProperty(exports, "createLlmAdapter", { enumerable: true, get: function () { return llm_adapter_js_1.createLlmAdapter; } });
// Policy
var policy_guard_js_1 = require("./policy-guard.js");
Object.defineProperty(exports, "DefaultPolicyEngine", { enumerable: true, get: function () { return policy_guard_js_1.DefaultPolicyEngine; } });
Object.defineProperty(exports, "MockPolicyEngine", { enumerable: true, get: function () { return policy_guard_js_1.MockPolicyEngine; } });
Object.defineProperty(exports, "filterEvidenceByPolicy", { enumerable: true, get: function () { return policy_guard_js_1.filterEvidenceByPolicy; } });
Object.defineProperty(exports, "applyPolicyToContext", { enumerable: true, get: function () { return policy_guard_js_1.applyPolicyToContext; } });
Object.defineProperty(exports, "canAccessCase", { enumerable: true, get: function () { return policy_guard_js_1.canAccessCase; } });
Object.defineProperty(exports, "createPolicyEngine", { enumerable: true, get: function () { return policy_guard_js_1.createPolicyEngine; } });
// Audit
var audit_log_js_1 = require("./audit-log.js");
Object.defineProperty(exports, "PostgresGraphRagAuditLog", { enumerable: true, get: function () { return audit_log_js_1.PostgresGraphRagAuditLog; } });
Object.defineProperty(exports, "InMemoryGraphRagAuditLog", { enumerable: true, get: function () { return audit_log_js_1.InMemoryGraphRagAuditLog; } });
Object.defineProperty(exports, "createAuditRecord", { enumerable: true, get: function () { return audit_log_js_1.createAuditRecord; } });
Object.defineProperty(exports, "createAuditLog", { enumerable: true, get: function () { return audit_log_js_1.createAuditLog; } });
Object.defineProperty(exports, "GRAPHRAG_AUDIT_SCHEMA", { enumerable: true, get: function () { return audit_log_js_1.GRAPHRAG_AUDIT_SCHEMA; } });
// Service
var service_js_1 = require("./service.js");
Object.defineProperty(exports, "EvidenceFirstGraphRagService", { enumerable: true, get: function () { return service_js_1.EvidenceFirstGraphRagService; } });
Object.defineProperty(exports, "createGraphRagService", { enumerable: true, get: function () { return service_js_1.createGraphRagService; } });
// Factory for creating fully configured service instance
const CaseGraphRepository_js_2 = require("./repositories/CaseGraphRepository.js");
const EvidenceRepository_js_2 = require("./repositories/EvidenceRepository.js");
const llm_adapter_js_2 = require("./llm-adapter.js");
const policy_guard_js_2 = require("./policy-guard.js");
const audit_log_js_2 = require("./audit-log.js");
const service_js_2 = require("./service.js");
let _serviceInstance = null;
/**
 * Get or create the default GraphRAG service instance
 */
function getGraphRagService(config) {
    if (!_serviceInstance) {
        _serviceInstance = (0, service_js_2.createGraphRagService)({
            caseGraphRepo: (0, CaseGraphRepository_js_2.createCaseGraphRepository)(),
            evidenceRepo: (0, EvidenceRepository_js_2.createEvidenceRepository)(),
            policyEngine: (0, policy_guard_js_2.createPolicyEngine)(),
            llmAdapter: (0, llm_adapter_js_2.createLlmAdapter)(),
            auditLog: (0, audit_log_js_2.createAuditLog)(),
            retrievalParams: config,
        });
    }
    return _serviceInstance;
}
/**
 * Reset service instance (for testing)
 */
function resetGraphRagService() {
    _serviceInstance = null;
}
