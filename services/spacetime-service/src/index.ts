/**
 * Spacetime Service - Main Entry Point
 *
 * Temporal-geospatial indexing and query engine for the IntelGraph platform.
 * Provides efficient queries for:
 * - Co-presence detection
 * - Entity tracking in regions
 * - Trajectory reconstruction
 * - Dwell detection
 *
 * @packageDocumentation
 */

// Types
export * from './types/index.js';

// Indexes
export {
  TimeIndex,
  createTimeIndex,
  type TimeIndexEntry,
} from './indexes/TimeIndex.js';

export {
  GeoIndex,
  createGeoIndex,
  type GeoIndexEntry,
  type BBox,
} from './indexes/GeoIndex.js';

export {
  SpacetimeIndex,
  createSpacetimeIndex,
  type SpacetimeEntry,
  type SpacetimeQueryOptions,
} from './indexes/SpacetimeIndex.js';

// Queries
export {
  executeCoPresenceQuery,
  calculateCoPresenceStats,
  type CoPresenceConfig,
} from './queries/CoPresenceQuery.js';

export {
  executeEntitiesInRegionQuery,
  countEntitiesInRegion,
  findRegionTransitions,
  getEntityPresenceTimeline,
  type EntitiesInRegionConfig,
} from './queries/EntitiesInRegionQuery.js';

export {
  executeTrajectoryQuery,
  getTrajectorySegments,
  compareTrajectories,
  type TrajectoryConfig,
} from './queries/TrajectoryQuery.js';

export {
  executeDwellQuery,
  detectAllDwellEpisodes,
  calculateDwellStats,
  type DwellConfig,
} from './queries/DwellQuery.js';

// Services
export {
  SpacetimeService,
  createSpacetimeService,
  InMemoryStorageAdapter,
  type StorageAdapter,
  type DerivedEventEmitter,
} from './services/SpacetimeService.js';

export {
  QueryGuardError,
  createGuards,
  guardTimeWindow,
  guardQueryArea,
  guardEntityCount,
  guardResultCardinality,
  guardCoPresenceQuery,
  guardEntitiesInRegionQuery,
  guardTrajectoryQuery,
  guardDwellQuery,
  limitResults,
  paginateResults,
  type QueryGuardConfig,
} from './services/QueryGuards.js';

// Utils
export * from './utils/geo.js';
export * from './utils/time.js';
