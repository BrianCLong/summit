"use strict";
/**
 * @intelgraph/platform-governance
 *
 * Policy engine and governance utilities for Summit platform.
 * Implements Prompts 46-49: Policy Engine, Platform Abstractions, Documentation QA, Ownership Matrix
 *
 * Features:
 * - Rule-based policy evaluation
 * - Service and code ownership tracking
 * - CODEOWNERS generation
 * - Coverage validation
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
exports.usageRecordSchema = exports.entitlementSchema = exports.detectUsageAnomalies = exports.calculateProratedCredit = exports.evaluateEntitlement = exports.buildDependencyGraph = exports.detectCircularDependencies = exports.discoverWorkspacePackages = exports.enforceAcyclicDependencies = exports.requireCanonicalModule = exports.ContractRegistry = exports.validateEventContract = exports.validateApiContract = exports.isApiContractCompatible = exports.ensureIdempotentWrite = exports.compareCloudEvents = exports.cloudEventSchema = exports.apiContractSchema = exports.validateIdentifiers = exports.resolveSystemOfRecord = exports.domainVocabulary = exports.boundedContexts = exports.canonicalNouns = exports.canonicalFeatures = exports.canonicalModules = exports.ownershipMatrix = exports.createOwnershipManager = exports.OwnershipMatrixManager = exports.policyEngine = exports.createPolicyEngine = exports.PolicyEngine = void 0;
// Policy exports
__exportStar(require("./policy/engine.js"), exports);
// Ownership exports
__exportStar(require("./ownership/matrix.js"), exports);
// Record framework exports
__exportStar(require("./records/framework.js"), exports);
// Retention engine exports
__exportStar(require("./retention/engine.js"), exports);
// Re-export commonly used items
var engine_js_1 = require("./policy/engine.js");
Object.defineProperty(exports, "PolicyEngine", { enumerable: true, get: function () { return engine_js_1.PolicyEngine; } });
Object.defineProperty(exports, "createPolicyEngine", { enumerable: true, get: function () { return engine_js_1.createPolicyEngine; } });
Object.defineProperty(exports, "policyEngine", { enumerable: true, get: function () { return engine_js_1.policyEngine; } });
var matrix_js_1 = require("./ownership/matrix.js");
Object.defineProperty(exports, "OwnershipMatrixManager", { enumerable: true, get: function () { return matrix_js_1.OwnershipMatrixManager; } });
Object.defineProperty(exports, "createOwnershipManager", { enumerable: true, get: function () { return matrix_js_1.createOwnershipManager; } });
Object.defineProperty(exports, "ownershipMatrix", { enumerable: true, get: function () { return matrix_js_1.ownershipMatrix; } });
var domain_js_1 = require("./suite/domain.js");
Object.defineProperty(exports, "canonicalModules", { enumerable: true, get: function () { return domain_js_1.canonicalModules; } });
Object.defineProperty(exports, "canonicalFeatures", { enumerable: true, get: function () { return domain_js_1.canonicalFeatures; } });
Object.defineProperty(exports, "canonicalNouns", { enumerable: true, get: function () { return domain_js_1.canonicalNouns; } });
Object.defineProperty(exports, "boundedContexts", { enumerable: true, get: function () { return domain_js_1.boundedContexts; } });
Object.defineProperty(exports, "domainVocabulary", { enumerable: true, get: function () { return domain_js_1.domainVocabulary; } });
Object.defineProperty(exports, "resolveSystemOfRecord", { enumerable: true, get: function () { return domain_js_1.resolveSystemOfRecord; } });
Object.defineProperty(exports, "validateIdentifiers", { enumerable: true, get: function () { return domain_js_1.validateIdentifiers; } });
var contracts_js_1 = require("./suite/contracts.js");
Object.defineProperty(exports, "apiContractSchema", { enumerable: true, get: function () { return contracts_js_1.apiContractSchema; } });
Object.defineProperty(exports, "cloudEventSchema", { enumerable: true, get: function () { return contracts_js_1.cloudEventSchema; } });
Object.defineProperty(exports, "compareCloudEvents", { enumerable: true, get: function () { return contracts_js_1.compareCloudEvents; } });
Object.defineProperty(exports, "ensureIdempotentWrite", { enumerable: true, get: function () { return contracts_js_1.ensureIdempotentWrite; } });
Object.defineProperty(exports, "isApiContractCompatible", { enumerable: true, get: function () { return contracts_js_1.isApiContractCompatible; } });
Object.defineProperty(exports, "validateApiContract", { enumerable: true, get: function () { return contracts_js_1.validateApiContract; } });
Object.defineProperty(exports, "validateEventContract", { enumerable: true, get: function () { return contracts_js_1.validateEventContract; } });
Object.defineProperty(exports, "ContractRegistry", { enumerable: true, get: function () { return contracts_js_1.ContractRegistry; } });
Object.defineProperty(exports, "requireCanonicalModule", { enumerable: true, get: function () { return contracts_js_1.requireCanonicalModule; } });
var dependency_map_js_1 = require("./suite/dependency-map.js");
Object.defineProperty(exports, "enforceAcyclicDependencies", { enumerable: true, get: function () { return dependency_map_js_1.enforceAcyclicDependencies; } });
Object.defineProperty(exports, "discoverWorkspacePackages", { enumerable: true, get: function () { return dependency_map_js_1.discoverWorkspacePackages; } });
Object.defineProperty(exports, "detectCircularDependencies", { enumerable: true, get: function () { return dependency_map_js_1.detectCircularDependencies; } });
Object.defineProperty(exports, "buildDependencyGraph", { enumerable: true, get: function () { return dependency_map_js_1.buildDependencyGraph; } });
var entitlements_js_1 = require("./suite/entitlements.js");
Object.defineProperty(exports, "evaluateEntitlement", { enumerable: true, get: function () { return entitlements_js_1.evaluateEntitlement; } });
Object.defineProperty(exports, "calculateProratedCredit", { enumerable: true, get: function () { return entitlements_js_1.calculateProratedCredit; } });
Object.defineProperty(exports, "detectUsageAnomalies", { enumerable: true, get: function () { return entitlements_js_1.detectUsageAnomalies; } });
Object.defineProperty(exports, "entitlementSchema", { enumerable: true, get: function () { return entitlements_js_1.entitlementSchema; } });
Object.defineProperty(exports, "usageRecordSchema", { enumerable: true, get: function () { return entitlements_js_1.usageRecordSchema; } });
