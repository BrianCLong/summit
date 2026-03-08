"use strict";
/**
 * IntelGraph Geospatial Intelligence Package
 * Core geospatial data structures, satellite imagery processing, and Neo4j integration
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Neo4jGeoGraphRepository = exports.createGeoRepository = exports.GeoRepository = exports.GeoTemporalService = exports.ShapefileParser = exports.KMLParser = exports.GeoJSONParser = void 0;
// Core Types (geospatial.ts exports SpatialQueryOptions)
__exportStar(require("./types/geospatial.js"), exports);
__exportStar(require("./types/satellite.js"), exports);
// Parsers
var geojson_parser_js_1 = require("./parsers/geojson-parser.js");
Object.defineProperty(exports, "GeoJSONParser", { enumerable: true, get: function () { return geojson_parser_js_1.GeoJSONParser; } });
var kml_parser_js_1 = require("./parsers/kml-parser.js");
Object.defineProperty(exports, "KMLParser", { enumerable: true, get: function () { return kml_parser_js_1.KMLParser; } });
var shapefile_parser_js_1 = require("./parsers/shapefile-parser.js");
Object.defineProperty(exports, "ShapefileParser", { enumerable: true, get: function () { return shapefile_parser_js_1.ShapefileParser; } });
// Processing - GDAL, Fusion, Change Detection, Caching
__exportStar(require("./processing/index.js"), exports);
// Services
var GeoTemporalService_js_1 = require("./services/GeoTemporalService.js");
Object.defineProperty(exports, "GeoTemporalService", { enumerable: true, get: function () { return GeoTemporalService_js_1.GeoTemporalService; } });
var geo_repository_js_1 = require("./neo4j/geo-repository.js");
Object.defineProperty(exports, "GeoRepository", { enumerable: true, get: function () { return geo_repository_js_1.GeoRepository; } });
Object.defineProperty(exports, "createGeoRepository", { enumerable: true, get: function () { return geo_repository_js_1.createGeoRepository; } });
var GeoGraphRepository_js_1 = require("./repository/GeoGraphRepository.js");
Object.defineProperty(exports, "Neo4jGeoGraphRepository", { enumerable: true, get: function () { return GeoGraphRepository_js_1.Neo4jGeoGraphRepository; } });
// Utilities
__exportStar(require("./utils/distance.js"), exports);
__exportStar(require("./utils/projections.js"), exports);
__exportStar(require("./utils/geojson.js"), exports);
// PostGIS query builders
__exportStar(require("./postgis/query-builder.js"), exports);
// Geocoding
__exportStar(require("./geocoding/geocoder.js"), exports);
// Routing and optimization
__exportStar(require("./routing/optimizer.js"), exports);
// Analytics
__exportStar(require("./analytics/geofencing.js"), exports);
__exportStar(require("./analytics/heatmap.js"), exports);
__exportStar(require("./analytics/clustering.js"), exports);
__exportStar(require("./analytics/trajectory.js"), exports);
// Terrain and imagery
__exportStar(require("./terrain/terrain.js"), exports);
__exportStar(require("./imagery/catalog.js"), exports);
