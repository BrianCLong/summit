/**
 * Neo4j Geospatial Integration Module
 * Graph storage for geospatial features with spatial indexing
 */

export { GeoRepository, createGeoRepository } from './geo-repository.js';
export type {
  Neo4jConfig,
  SpatialQueryOptions,
  QueryResult,
} from './geo-repository.js';
