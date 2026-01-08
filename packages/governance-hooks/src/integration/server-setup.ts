/**
 * Server Integration Setup
 * Example of wiring governance hooks into the Summit GraphQL server
 */

import {
  createAuthorityHook,
  createPIIDetectionHook,
  createProvenanceHook,
  createAuditHook,
  composeHooks as composeGovernancePlugins,
} from "../graphql-hooks";

import {
  createQueryValidationHook,
  createCitationEnforcementHook,
  createCopilotProvenanceHook,
  createCostControlHook,
  composeCopilotHooks,
} from "../copilot-hooks";

import {
  createConnectorRateLimitHook,
  createConnectorProvenanceHook,
  composeConnectorHooks,
} from "../connector-hooks";

// Configuration interfaces
export interface GovernanceConfig {
  authority: {
    opaEndpoint?: string;
    cacheEnabled: boolean;
    cacheTtlMs: number;
  };
  pii: {
    patterns: string[];
    scrubEnabled: boolean;
    reportEnabled: boolean;
  };
  provenance: {
    ledgerEndpoint: string;
    batchSize: number;
    flushIntervalMs: number;
  };
  audit: {
    logLevel: "debug" | "info" | "warn" | "error";
    sensitiveFields: string[];
  };
  copilot: {
    maxTokensPerRequest: number;
    maxCostPerDay: number;
    citationMinConfidence: number;
    citationMinCoverage: number;
  };
  connectors: {
    defaultRateLimit: number;
    authRefreshMs: number;
  };
}

const defaultConfig: GovernanceConfig = {
  authority: {
    cacheEnabled: true,
    cacheTtlMs: 60000,
  },
  pii: {
    patterns: [
      "\\b\\d{3}-\\d{2}-\\d{4}\\b", // SSN
      "\\b\\d{16}\\b", // Credit card
      "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b", // Email
    ],
    scrubEnabled: true,
    reportEnabled: true,
  },
  provenance: {
    ledgerEndpoint: "http://localhost:4001",
    batchSize: 100,
    flushIntervalMs: 5000,
  },
  audit: {
    logLevel: "info",
    sensitiveFields: ["password", "token", "secret", "apiKey"],
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
export function createGraphQLGovernanceMiddleware(
  config: Partial<GovernanceConfig> = {},
  dependencies: {
    authorityEvaluator: any;
    provenanceRecorder: any;
    auditLogger: any;
  }
) {
  const mergedConfig = { ...defaultConfig, ...config };

  return composeGovernancePlugins(
    createAuthorityHook(dependencies.authorityEvaluator),
    createPIIDetectionHook({
      patterns: mergedConfig.pii.patterns.map((p) => ({
        name: "Sensitive Pattern",
        regex: new RegExp(p, "g"),
        action: "redact",
      })),
    }),
    createProvenanceHook(dependencies.provenanceRecorder),
    createAuditHook(dependencies.auditLogger)
  );
}

/**
 * Create full governance middleware stack for Copilot
 */
export function createCopilotGovernanceMiddleware(
  config: Partial<GovernanceConfig> = {},
  dependencies: {
    costTracker: any;
    citationTracker: any;
    provenanceRecorder: any;
  }
) {
  const mergedConfig = { ...defaultConfig, ...config };

  return composeCopilotHooks(
    createQueryValidationHook({
      blockedKeywords: [],
      blockedPatterns: [],
      maxQueryLength: 1000,
      requireInvestigation: true,
    }),
    createCostControlHook({
      maxTokensPerRequest: mergedConfig.copilot.maxTokensPerRequest,
      maxTokensPerUserPerHour: 10000,
      maxTokensPerTenantPerHour: 100000,
      trackCost: () => Promise.resolve(),
      getCurrentUsage: () => Promise.resolve({ userTokens: 0, tenantTokens: 0 }),
    }),
    createCitationEnforcementHook({
      minCitations: 1,
      minCitationConfidence: mergedConfig.copilot.citationMinConfidence,
      rejectWithoutCitations: true,
    }),
    createCopilotProvenanceHook(dependencies.provenanceRecorder)
  );
}

/**
 * Create full governance middleware stack for Connectors
 */
export function createConnectorGovernanceMiddleware(
  config: Partial<GovernanceConfig> = {},
  dependencies: {
    authManager: any;
    rateLimiter: any;
    provenanceRecorder: any;
  }
) {
  const mergedConfig = { ...defaultConfig, ...config };

  return composeConnectorHooks(
    createConnectorRateLimitHook({
      maxEntitiesPerMinute: mergedConfig.connectors.defaultRateLimit,
      maxEntitiesPerHour: mergedConfig.connectors.defaultRateLimit * 60,
      action: "block",
    }),
    createConnectorProvenanceHook(dependencies.provenanceRecorder)
  );
}

// GovernanceConfig exported as interface at line 30
