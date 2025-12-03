/**
 * IntelGraph Geospatial Intelligence Package
 * Core geospatial data structures, satellite imagery processing, and Neo4j integration
 */

// Core Types (geospatial.ts exports SpatialQueryOptions)
export * from './types/geospatial.js';
export * from './types/satellite.js';

// Parsers
export { GeoJSONParser } from './parsers/geojson-parser.js';
export { KMLParser } from './parsers/kml-parser.js';
export { ShapefileParser } from './parsers/shapefile-parser.js';

// Processing - GDAL, Fusion, Change Detection, Caching
export * from './processing/index.js';

// Neo4j Integration (explicitly export to avoid naming conflicts)
export {
  GeoRepository,
  createGeoRepository,
} from './neo4j/geo-repository.js';
export type {
  Neo4jConfig,
  SpatialQueryOptions as Neo4jSpatialQueryOptions,
  QueryResult,
} from './neo4j/geo-repository.js';

// Utilities
export * from './utils/distance.js';
