/**
 * IntelGraph Geospatial Intelligence Package
 * Core geospatial data structures, satellite imagery processing, and Neo4j integration
 */

// Core Types (geospatial.ts exports SpatialQueryOptions)
export * from "./types/geospatial.js";
export * from "./types/satellite.js";

// Parsers
export { GeoJSONParser } from "./parsers/geojson-parser.js";
export { KMLParser } from "./parsers/kml-parser.js";
export { ShapefileParser } from "./parsers/shapefile-parser.js";

// Processing - GDAL, Fusion, Change Detection, Caching
export * from "./processing/index.js";

// Services
export { GeoTemporalService } from "./services/GeoTemporalService.js";

export { GeoRepository, createGeoRepository } from "./neo4j/geo-repository.js";

export { Neo4jGeoGraphRepository } from "./repository/GeoGraphRepository.js";
export type {
  Neo4jConfig,
  SpatialQueryOptions as Neo4jSpatialQueryOptions,
  QueryResult,
} from "./neo4j/geo-repository.js";

// Utilities
export * from "./utils/distance.js";
export * from "./utils/projections.js";
export * from "./utils/geojson.js";

// PostGIS query builders
export * from "./postgis/query-builder.js";

// Geocoding
export * from "./geocoding/geocoder.js";

// Routing and optimization
export * from "./routing/optimizer.js";

// Analytics
export * from "./analytics/geofencing.js";
export * from "./analytics/heatmap.js";
export * from "./analytics/clustering.js";
export * from "./analytics/trajectory.js";

// Terrain and imagery
export * from "./terrain/terrain.js";
export * from "./imagery/catalog.js";
