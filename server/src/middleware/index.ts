/**
 * Middleware exports for Summit API
 */

// API Versioning
export {
  apiVersionMiddleware,
  requireVersion,
  requireVersionRange,
  parseVersion,
  compareVersions,
  type ApiVersion,
  type VersionedRequest,
} from './api-version.js';

// Deprecation handling
export {
  deprecated,
  deprecatedWithMetrics,
  sunset,
  getDeprecationMetrics,
  clearDeprecationMetrics,
  type DeprecationConfig,
  type SunsetConfig,
  type DeprecationMetrics,
} from './deprecation.js';

// Existing middleware
export { auditLogger } from './audit-logger.js';
