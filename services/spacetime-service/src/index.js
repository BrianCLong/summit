"use strict";
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
exports.paginateResults = exports.limitResults = exports.guardDwellQuery = exports.guardTrajectoryQuery = exports.guardEntitiesInRegionQuery = exports.guardCoPresenceQuery = exports.guardResultCardinality = exports.guardEntityCount = exports.guardQueryArea = exports.guardTimeWindow = exports.createGuards = exports.QueryGuardError = exports.InMemoryStorageAdapter = exports.createSpacetimeService = exports.SpacetimeService = exports.calculateDwellStats = exports.detectAllDwellEpisodes = exports.executeDwellQuery = exports.compareTrajectories = exports.getTrajectorySegments = exports.executeTrajectoryQuery = exports.getEntityPresenceTimeline = exports.findRegionTransitions = exports.countEntitiesInRegion = exports.executeEntitiesInRegionQuery = exports.calculateCoPresenceStats = exports.executeCoPresenceQuery = exports.createSpacetimeIndex = exports.SpacetimeIndex = exports.createGeoIndex = exports.GeoIndex = exports.createTimeIndex = exports.TimeIndex = void 0;
// Types
__exportStar(require("./types/index.js"), exports);
// Indexes
var TimeIndex_js_1 = require("./indexes/TimeIndex.js");
Object.defineProperty(exports, "TimeIndex", { enumerable: true, get: function () { return TimeIndex_js_1.TimeIndex; } });
Object.defineProperty(exports, "createTimeIndex", { enumerable: true, get: function () { return TimeIndex_js_1.createTimeIndex; } });
var GeoIndex_js_1 = require("./indexes/GeoIndex.js");
Object.defineProperty(exports, "GeoIndex", { enumerable: true, get: function () { return GeoIndex_js_1.GeoIndex; } });
Object.defineProperty(exports, "createGeoIndex", { enumerable: true, get: function () { return GeoIndex_js_1.createGeoIndex; } });
var SpacetimeIndex_js_1 = require("./indexes/SpacetimeIndex.js");
Object.defineProperty(exports, "SpacetimeIndex", { enumerable: true, get: function () { return SpacetimeIndex_js_1.SpacetimeIndex; } });
Object.defineProperty(exports, "createSpacetimeIndex", { enumerable: true, get: function () { return SpacetimeIndex_js_1.createSpacetimeIndex; } });
// Queries
var CoPresenceQuery_js_1 = require("./queries/CoPresenceQuery.js");
Object.defineProperty(exports, "executeCoPresenceQuery", { enumerable: true, get: function () { return CoPresenceQuery_js_1.executeCoPresenceQuery; } });
Object.defineProperty(exports, "calculateCoPresenceStats", { enumerable: true, get: function () { return CoPresenceQuery_js_1.calculateCoPresenceStats; } });
var EntitiesInRegionQuery_js_1 = require("./queries/EntitiesInRegionQuery.js");
Object.defineProperty(exports, "executeEntitiesInRegionQuery", { enumerable: true, get: function () { return EntitiesInRegionQuery_js_1.executeEntitiesInRegionQuery; } });
Object.defineProperty(exports, "countEntitiesInRegion", { enumerable: true, get: function () { return EntitiesInRegionQuery_js_1.countEntitiesInRegion; } });
Object.defineProperty(exports, "findRegionTransitions", { enumerable: true, get: function () { return EntitiesInRegionQuery_js_1.findRegionTransitions; } });
Object.defineProperty(exports, "getEntityPresenceTimeline", { enumerable: true, get: function () { return EntitiesInRegionQuery_js_1.getEntityPresenceTimeline; } });
var TrajectoryQuery_js_1 = require("./queries/TrajectoryQuery.js");
Object.defineProperty(exports, "executeTrajectoryQuery", { enumerable: true, get: function () { return TrajectoryQuery_js_1.executeTrajectoryQuery; } });
Object.defineProperty(exports, "getTrajectorySegments", { enumerable: true, get: function () { return TrajectoryQuery_js_1.getTrajectorySegments; } });
Object.defineProperty(exports, "compareTrajectories", { enumerable: true, get: function () { return TrajectoryQuery_js_1.compareTrajectories; } });
var DwellQuery_js_1 = require("./queries/DwellQuery.js");
Object.defineProperty(exports, "executeDwellQuery", { enumerable: true, get: function () { return DwellQuery_js_1.executeDwellQuery; } });
Object.defineProperty(exports, "detectAllDwellEpisodes", { enumerable: true, get: function () { return DwellQuery_js_1.detectAllDwellEpisodes; } });
Object.defineProperty(exports, "calculateDwellStats", { enumerable: true, get: function () { return DwellQuery_js_1.calculateDwellStats; } });
// Services
var SpacetimeService_js_1 = require("./services/SpacetimeService.js");
Object.defineProperty(exports, "SpacetimeService", { enumerable: true, get: function () { return SpacetimeService_js_1.SpacetimeService; } });
Object.defineProperty(exports, "createSpacetimeService", { enumerable: true, get: function () { return SpacetimeService_js_1.createSpacetimeService; } });
Object.defineProperty(exports, "InMemoryStorageAdapter", { enumerable: true, get: function () { return SpacetimeService_js_1.InMemoryStorageAdapter; } });
var QueryGuards_js_1 = require("./services/QueryGuards.js");
Object.defineProperty(exports, "QueryGuardError", { enumerable: true, get: function () { return QueryGuards_js_1.QueryGuardError; } });
Object.defineProperty(exports, "createGuards", { enumerable: true, get: function () { return QueryGuards_js_1.createGuards; } });
Object.defineProperty(exports, "guardTimeWindow", { enumerable: true, get: function () { return QueryGuards_js_1.guardTimeWindow; } });
Object.defineProperty(exports, "guardQueryArea", { enumerable: true, get: function () { return QueryGuards_js_1.guardQueryArea; } });
Object.defineProperty(exports, "guardEntityCount", { enumerable: true, get: function () { return QueryGuards_js_1.guardEntityCount; } });
Object.defineProperty(exports, "guardResultCardinality", { enumerable: true, get: function () { return QueryGuards_js_1.guardResultCardinality; } });
Object.defineProperty(exports, "guardCoPresenceQuery", { enumerable: true, get: function () { return QueryGuards_js_1.guardCoPresenceQuery; } });
Object.defineProperty(exports, "guardEntitiesInRegionQuery", { enumerable: true, get: function () { return QueryGuards_js_1.guardEntitiesInRegionQuery; } });
Object.defineProperty(exports, "guardTrajectoryQuery", { enumerable: true, get: function () { return QueryGuards_js_1.guardTrajectoryQuery; } });
Object.defineProperty(exports, "guardDwellQuery", { enumerable: true, get: function () { return QueryGuards_js_1.guardDwellQuery; } });
Object.defineProperty(exports, "limitResults", { enumerable: true, get: function () { return QueryGuards_js_1.limitResults; } });
Object.defineProperty(exports, "paginateResults", { enumerable: true, get: function () { return QueryGuards_js_1.paginateResults; } });
// Utils
__exportStar(require("./utils/geo.js"), exports);
__exportStar(require("./utils/time.js"), exports);
