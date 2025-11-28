/**
 * @intelgraph/i18n-service
 *
 * Backend i18n service for language detection and policy-aware translation
 */

// Main service exports
export * from './lib/language-detector.js';
export * from './lib/translation-service.js';
export * from './lib/translation-provider.js';
export * from './lib/metrics.js';

// Configuration exports
export * from './config/supported-languages.js';
export * from './config/translation-policies.js';

// Integration adapters
export * from './integrations/copilot/i18n-adapter.js';
export * from './integrations/ingestion/i18n-adapter.js';

// Types
export * from './types/index.js';

// Service startup
export { createApp, startService } from './index.js';
