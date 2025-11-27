/**
 * Threat Library Service
 *
 * Public API exports for the threat pattern library.
 */

// Types
export * from './types.js';

// Errors
export * from './errors.js';

// Repository
export {
  ThreatLibraryRepository,
  getRepository,
  resetRepository,
  type RepositoryOptions,
  type PaginatedResult,
  type CreateOptions,
  type UpdateOptions,
} from './repository.js';

// Service
export { ThreatLibraryService, createService } from './service.js';

// Utilities
export {
  generateCypherFromMotif,
  generatePatternQueries,
  validateCypherQuery,
  type CypherQuery,
  type CypherGenerationOptions,
} from './utils/cypher-generator.js';

export {
  ThreatLibraryCache,
  createCacheKey,
  memoize,
  type CacheOptions,
  type CacheStats,
} from './utils/cache.js';
