"use strict";
/**
 * Server Integration Setup
 * Example of wiring governance hooks into the Summit GraphQL server
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGraphQLGovernanceMiddleware = createGraphQLGovernanceMiddleware;
exports.createCopilotGovernanceMiddleware = createCopilotGovernanceMiddleware;
exports.createConnectorGovernanceMiddleware = createConnectorGovernanceMiddleware;
const graphql_hooks_1 = require("../graphql-hooks");
const copilot_hooks_1 = require("../copilot-hooks");
const connector_hooks_1 = require("../connector-hooks");
const defaultConfig = {
    authority: {
        cacheEnabled: true,
        cacheTtlMs: 60000,
    },
    pii: {
        patterns: [
            '\\b\\d{3}-\\d{2}-\\d{4}\\b', // SSN
            '\\b\\d{16}\\b', // Credit card
            '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b', // Email
        ],
        scrubEnabled: true,
        reportEnabled: true,
    },
    provenance: {
        ledgerEndpoint: 'http://localhost:4001',
        batchSize: 100,
        flushIntervalMs: 5000,
    },
    audit: {
        logLevel: 'info',
        sensitiveFields: ['password', 'token', 'secret', 'apiKey'],
    },
    copilot: {
        maxTokensPerRequest: 4096,
        maxCostPerDay: 100,
        citationMinConfidence: 0.7,
        citationMinCoverage: 0.9,
    },
    connectors: {
        defaultRateLimit: 100,
        authRefreshMs: 300000,
    },
};
/**
 * Create full governance middleware stack for GraphQL
 */
function createGraphQLGovernanceMiddleware(config = {}, dependencies) {
    const mergedConfig = { ...defaultConfig, ...config };
    return (0, graphql_hooks_1.composeHooks)((0, graphql_hooks_1.createAuthorityHook)(dependencies.authorityEvaluator), (0, graphql_hooks_1.createPIIDetectionHook)({
        patterns: mergedConfig.pii.patterns.map((p) => ({
            name: 'Sensitive Pattern',
            regex: new RegExp(p, 'g'),
            action: 'redact',
        })),
    }), (0, graphql_hooks_1.createProvenanceHook)(dependencies.provenanceRecorder), (0, graphql_hooks_1.createAuditHook)(dependencies.auditLogger));
}
/**
 * Create full governance middleware stack for Copilot
 */
function createCopilotGovernanceMiddleware(config = {}, dependencies) {
    const mergedConfig = { ...defaultConfig, ...config };
    return (0, copilot_hooks_1.composeCopilotHooks)((0, copilot_hooks_1.createQueryValidationHook)({
        blockedKeywords: [],
        blockedPatterns: [],
        maxQueryLength: 1000,
        requireInvestigation: true,
    }), (0, copilot_hooks_1.createCostControlHook)({
        maxTokensPerRequest: mergedConfig.copilot.maxTokensPerRequest,
        maxTokensPerUserPerHour: 10000,
        maxTokensPerTenantPerHour: 100000,
        trackCost: () => Promise.resolve(),
        getCurrentUsage: () => Promise.resolve({ userTokens: 0, tenantTokens: 0 }),
    }), (0, copilot_hooks_1.createCitationEnforcementHook)({
        minCitations: 1,
        minCitationConfidence: mergedConfig.copilot.citationMinConfidence,
        rejectWithoutCitations: true,
    }), (0, copilot_hooks_1.createCopilotProvenanceHook)(dependencies.provenanceRecorder));
}
/**
 * Create full governance middleware stack for Connectors
 */
function createConnectorGovernanceMiddleware(config = {}, dependencies) {
    const mergedConfig = { ...defaultConfig, ...config };
    return (0, connector_hooks_1.composeConnectorHooks)((0, connector_hooks_1.createConnectorRateLimitHook)({
        maxEntitiesPerMinute: mergedConfig.connectors.defaultRateLimit,
        maxEntitiesPerHour: mergedConfig.connectors.defaultRateLimit * 60,
        action: 'block',
    }), (0, connector_hooks_1.createConnectorProvenanceHook)(dependencies.provenanceRecorder));
}
// GovernanceConfig exported as interface at line 30
