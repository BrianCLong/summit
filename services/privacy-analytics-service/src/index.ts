/**
 * Privacy-Preserving Analytics Service
 *
 * Public API exports for the privacy-analytics-service package.
 */

// Types
export * from './types/index.js';

// Privacy modules
export { PolicyEnforcer } from './privacy/PolicyEnforcer.js';
export { DifferentialPrivacy } from './privacy/DifferentialPrivacy.js';

// Query modules
export { QueryTranslator } from './query/QueryTranslator.js';
export { QueryExecutor } from './query/QueryExecutor.js';

// Governance
export { GovernanceClient } from './governance/GovernanceClient.js';

// Metrics
export { predefinedMetrics, PredefinedMetricsRegistry } from './metrics/PredefinedMetrics.js';

// Database
export { db, DatabaseConnections } from './db/connections.js';

// Server
export { app, startServer } from './server.js';

// Utils
export { logger, createChildLogger, createRequestLogger } from './utils/logger.js';
export { config, loadConfig } from './utils/config.js';
