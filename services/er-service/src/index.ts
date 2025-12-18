/**
 * Entity Resolution Service
 *
 * @module @intelgraph/er-service
 */

// Types
export * from './types/index.js';

// Core
export * from './core/index.js';

// Matchers
export * from './matchers/index.js';

// Database
export * from './db/index.js';

// Events
export * from './events/index.js';

// Batch Processing
export * from './batch/index.js';

// Explainability
export * from './explainability/index.js';

// Server
export { createApp, start, type ServiceConfig } from './server.js';
