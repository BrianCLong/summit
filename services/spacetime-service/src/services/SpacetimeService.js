"use strict";
/**
 * Spacetime Service
 *
 * Main service class providing the public API for temporal-geospatial queries.
 * Coordinates between indexes, query implementations, and storage.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpacetimeService = exports.InMemoryStorageAdapter = void 0;
exports.createSpacetimeService = createSpacetimeService;
const uuid_1 = require("uuid");
const SpacetimeIndex_js_1 = require("../indexes/SpacetimeIndex.js");
const CoPresenceQuery_js_1 = require("../queries/CoPresenceQuery.js");
const EntitiesInRegionQuery_js_1 = require("../queries/EntitiesInRegionQuery.js");
const TrajectoryQuery_js_1 = require("../queries/TrajectoryQuery.js");
const DwellQuery_js_1 = require("../queries/DwellQuery.js");
const QueryGuards_js_1 = require("./QueryGuards.js");
const geo_js_1 = require("../utils/geo.js");
/**
 * In-memory storage adapter (for testing/development)
 */
class InMemoryStorageAdapter {
    timeEvents = [];
    intervals = [];
    geoPoints = [];
    trajectories = [];
    async saveTimeEvent(event) {
        this.timeEvents.push(event);
    }
    async saveInterval(interval) {
        this.intervals.push(interval);
    }
    async saveGeoPoint(point) {
        this.geoPoints.push(point);
    }
    async saveTrajectory(trajectory) {
        this.trajectories.push(trajectory);
    }
    async loadTimeEvents(tenantId, timeRange) {
        return this.timeEvents.filter((e) => {
            if (e.tenantId !== tenantId)
                return false;
            if (timeRange) {
                return e.timestamp >= timeRange.start && e.timestamp <= timeRange.end;
            }
            return true;
        });
    }
    async loadIntervals(tenantId, timeRange) {
        return this.intervals.filter((i) => {
            if (i.tenantId !== tenantId)
                return false;
            if (timeRange) {
                return i.end >= timeRange.start && i.start <= timeRange.end;
            }
            return true;
        });
    }
    async loadGeoPoints(tenantId, timeRange) {
        return this.geoPoints.filter((p) => {
            if (p.tenantId !== tenantId)
                return false;
            if (timeRange && p.timestamp) {
                return p.timestamp >= timeRange.start && p.timestamp <= timeRange.end;
            }
            return true;
        });
    }
    async loadTrajectories(tenantId, timeRange) {
        return this.trajectories.filter((t) => {
            if (t.tenantId !== tenantId)
                return false;
            if (timeRange) {
                return t.endTime >= timeRange.start && t.startTime <= timeRange.end;
            }
            return true;
        });
    }
    clear() {
        this.timeEvents = [];
        this.intervals = [];
        this.geoPoints = [];
        this.trajectories = [];
    }
}
exports.InMemoryStorageAdapter = InMemoryStorageAdapter;
/**
 * No-op event emitter
 */
class NoOpEmitter {
    emit(_event) {
        // No-op
    }
}
/**
 * Main Spacetime Service
 */
class SpacetimeService {
    index;
    guards;
    config;
    storage;
    emitter;
    queryLog = [];
    constructor(config, storage, emitter) {
        this.config = {
            maxQueryAreaSqMeters: config?.maxQueryAreaSqMeters ?? 1_000_000_000_000,
            maxTimeSpanMs: config?.maxTimeSpanMs ?? 365 * 24 * 60 * 60 * 1000,
            maxResultCardinality: config?.maxResultCardinality ?? 10_000,
            maxEntitiesPerQuery: config?.maxEntitiesPerQuery ?? 1000,
            geohashPrecision: config?.geohashPrecision ?? 7,
            defaultConfidenceThreshold: config?.defaultConfidenceThreshold ?? 0.5,
            enableQueryLogging: config?.enableQueryLogging ?? true,
            retentionPolicyDays: config?.retentionPolicyDays,
        };
        this.index = (0, SpacetimeIndex_js_1.createSpacetimeIndex)(this.config.geohashPrecision);
        this.guards = (0, QueryGuards_js_1.createGuards)(this.config);
        this.storage = storage ?? new InMemoryStorageAdapter();
        this.emitter = emitter ?? new NoOpEmitter();
    }
    // =========================================================================
    // Data Ingestion
    // =========================================================================
    /**
     * Ingest a time event
     */
    async ingestTimeEvent(event) {
        this.index.insertTimeEvent(event);
        await this.storage.saveTimeEvent(event);
    }
    /**
     * Ingest an interval
     */
    async ingestInterval(interval) {
        this.index.insertInterval(interval);
        await this.storage.saveInterval(interval);
    }
    /**
     * Ingest a geo point
     */
    async ingestGeoPoint(point) {
        this.index.insertGeoPoint(point);
        await this.storage.saveGeoPoint(point);
    }
    /**
     * Ingest a trajectory
     */
    async ingestTrajectory(trajectory) {
        this.index.insertTrajectory(trajectory);
        await this.storage.saveTrajectory(trajectory);
    }
    /**
     * Bulk ingest time events
     */
    async ingestTimeEventsBatch(events) {
        for (const event of events) {
            this.index.insertTimeEvent(event);
            await this.storage.saveTimeEvent(event);
        }
    }
    // =========================================================================
    // Query APIs
    // =========================================================================
    /**
     * Find co-presence episodes
     */
    findCoPresence(query, config) {
        const startTime = Date.now();
        // Apply guards
        (0, QueryGuards_js_1.guardCoPresenceQuery)(query, this.guards);
        // Execute query
        const results = (0, CoPresenceQuery_js_1.executeCoPresenceQuery)(this.index, query, config);
        // Apply result limit
        const { results: limited, truncated } = (0, QueryGuards_js_1.limitResults)(results, this.guards);
        // Log query
        this.logQuery('findCoPresence', query.context.tenantId, startTime);
        // Emit derived events for co-presence episodes
        for (const episode of limited) {
            this.emitCoPresenceEvent(episode, query.context);
        }
        return limited;
    }
    /**
     * Find entities in a geographic region
     */
    findEntitiesInRegion(query, config) {
        const startTime = Date.now();
        // Apply guards
        (0, QueryGuards_js_1.guardEntitiesInRegionQuery)(query, this.guards);
        // Execute query
        const results = (0, EntitiesInRegionQuery_js_1.executeEntitiesInRegionQuery)(this.index, query, config);
        // Log query
        this.logQuery('findEntitiesInRegion', query.context.tenantId, startTime);
        return results;
    }
    /**
     * Count entities in a region (faster than full query)
     */
    countEntitiesInRegion(query) {
        (0, QueryGuards_js_1.guardEntitiesInRegionQuery)(query, this.guards);
        return (0, EntitiesInRegionQuery_js_1.countEntitiesInRegion)(this.index, query);
    }
    /**
     * Get trajectory for an entity
     */
    getTrajectory(query, config) {
        const startTime = Date.now();
        // Apply guards
        (0, QueryGuards_js_1.guardTrajectoryQuery)(query, this.guards);
        // Execute query
        const result = (0, TrajectoryQuery_js_1.executeTrajectoryQuery)(this.index, query, config);
        // Log query
        this.logQuery('getTrajectory', query.context.tenantId, startTime);
        return result;
    }
    /**
     * Get trajectory segments (split by gaps)
     */
    getTrajectorySegments(query, config) {
        (0, QueryGuards_js_1.guardTrajectoryQuery)(query, this.guards);
        return (0, TrajectoryQuery_js_1.getTrajectorySegments)(this.index, query, config);
    }
    /**
     * Detect dwell episodes
     */
    detectDwell(query, config) {
        const startTime = Date.now();
        // Apply guards
        (0, QueryGuards_js_1.guardDwellQuery)(query, this.guards);
        // Execute query
        const results = (0, DwellQuery_js_1.executeDwellQuery)(this.index, query, config);
        // Apply result limit
        const { results: limited } = (0, QueryGuards_js_1.limitResults)(results, this.guards);
        // Log query
        this.logQuery('detectDwell', query.context.tenantId, startTime);
        // Emit derived events for dwell episodes
        for (const episode of limited) {
            this.emitDwellEvent(episode, query.context);
        }
        return limited;
    }
    /**
     * Detect all dwell episodes for an entity (without specific area)
     */
    detectAllDwell(entityId, minDuration, context, config) {
        return (0, DwellQuery_js_1.detectAllDwellEpisodes)(this.index, entityId, minDuration, context, config);
    }
    // =========================================================================
    // Summary APIs (for Analytics/Copilot)
    // =========================================================================
    /**
     * Get spacetime summary for an entity
     */
    getSpacetimeSummary(entityId, timeRange, context) {
        const startTime = Date.now();
        // Get entity timeline
        const entries = this.index.getEntityTimeline(entityId, timeRange);
        // Filter by policy
        const filtered = entries.filter((e) => {
            if (e.tenantId !== context.tenantId)
                return false;
            if (context.policyLabels.length > 0) {
                const entryLabels = new Set(e.policyLabels);
                return context.policyLabels.every((l) => entryLabels.has(l));
            }
            return true;
        });
        // Calculate statistics
        const coordinates = filtered.map((e) => e.coordinate);
        const totalDistance = (0, geo_js_1.calculatePathDistance)(coordinates);
        const duration = (timeRange.end - timeRange.start) / 1000;
        const averageSpeed = duration > 0 ? totalDistance / duration : 0;
        // Get dwell episodes
        const dwellEpisodes = this.detectAllDwell(entityId, 60000, context); // 1 min minimum
        const dwellStats = (0, DwellQuery_js_1.calculateDwellStats)(dwellEpisodes);
        // Calculate unique locations
        const uniqueLocations = this.countUniqueLocations(filtered, 100);
        // Calculate max speed
        let maxSpeed = 0;
        for (const entry of filtered) {
            const speed = entry.attributes.speed;
            if (speed !== undefined && speed > maxSpeed) {
                maxSpeed = speed;
            }
        }
        // Get primary locations (top dwell locations)
        const primaryLocations = dwellEpisodes
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 5)
            .map((d) => ({
            coordinate: d.centroid,
            visitCount: 1,
            totalDuration: d.duration,
        }));
        // Calculate bounding box
        let boundingBox;
        if (coordinates.length > 0) {
            let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
            for (const c of coordinates) {
                minLat = Math.min(minLat, c.latitude);
                maxLat = Math.max(maxLat, c.latitude);
                minLon = Math.min(minLon, c.longitude);
                maxLon = Math.max(maxLon, c.longitude);
            }
            boundingBox = { minLat, maxLat, minLon, maxLon };
        }
        // Log query
        this.logQuery('getSpacetimeSummary', context.tenantId, startTime);
        return {
            entityId,
            timeRange,
            statistics: {
                totalObservations: filtered.length,
                uniqueLocations,
                totalDistance,
                averageSpeed: averageSpeed > 0 ? averageSpeed : undefined,
                maxSpeed: maxSpeed > 0 ? maxSpeed : undefined,
                dwellCount: dwellStats.dwellCount,
                totalDwellTime: dwellStats.totalDwellTime,
            },
            boundingBox,
            primaryLocations: primaryLocations.length > 0 ? primaryLocations : undefined,
        };
    }
    /**
     * Get co-presence partners for an entity
     */
    getCoPresencePartners(entityId, timeRange, radius, context) {
        // Get all entities in the index
        const allEntityIds = this.index.getEntityIds();
        // For each other entity, check co-presence with target
        const partners = new Map();
        for (const otherEntityId of allEntityIds) {
            if (otherEntityId === entityId)
                continue;
            const episodes = this.findCoPresence({
                entityIds: [entityId, otherEntityId],
                timeWindow: timeRange,
                radius,
                minOverlapDuration: 0,
                minConfidence: 0.5,
                context,
            });
            if (episodes.length > 0) {
                const totalDuration = episodes.reduce((sum, e) => sum + e.duration, 0);
                partners.set(otherEntityId, {
                    episodeCount: episodes.length,
                    totalDuration,
                });
            }
        }
        // Sort by total duration
        return Array.from(partners.entries())
            .map(([id, stats]) => ({ entityId: id, ...stats }))
            .sort((a, b) => b.totalDuration - a.totalDuration);
    }
    // =========================================================================
    // Index Management
    // =========================================================================
    /**
     * Get index statistics
     */
    getIndexStats() {
        return {
            entryCount: this.index.count,
            entityCount: this.index.getEntityIds().length,
            timeBounds: this.index.getTimeBounds(),
            spatialBounds: this.index.getSpatialBounds(),
        };
    }
    /**
     * Clear all data from index (and optionally storage)
     */
    clear(clearStorage = false) {
        this.index.clear();
        if (clearStorage && this.storage instanceof InMemoryStorageAdapter) {
            this.storage.clear();
        }
    }
    /**
     * Load data from storage into index
     */
    async loadFromStorage(tenantId, timeRange) {
        const [events, intervals, points, trajectories] = await Promise.all([
            this.storage.loadTimeEvents(tenantId, timeRange),
            this.storage.loadIntervals(tenantId, timeRange),
            this.storage.loadGeoPoints(tenantId, timeRange),
            this.storage.loadTrajectories(tenantId, timeRange),
        ]);
        for (const event of events) {
            this.index.insertTimeEvent(event);
        }
        for (const interval of intervals) {
            this.index.insertInterval(interval);
        }
        for (const point of points) {
            this.index.insertGeoPoint(point);
        }
        for (const trajectory of trajectories) {
            this.index.insertTrajectory(trajectory);
        }
    }
    /**
     * Get query log (if enabled)
     */
    getQueryLog() {
        return [...this.queryLog];
    }
    // =========================================================================
    // Private Helpers
    // =========================================================================
    logQuery(type, tenantId, startTime) {
        if (this.config.enableQueryLogging) {
            this.queryLog.push({
                type,
                tenantId,
                timestamp: startTime,
                duration: Date.now() - startTime,
            });
            // Keep only last 1000 entries
            while (this.queryLog.length > 1000) {
                this.queryLog.shift();
            }
        }
    }
    emitCoPresenceEvent(episode, context) {
        const event = {
            id: (0, uuid_1.v4)(),
            type: 'co_presence',
            sourceEntityIds: episode.entityIds,
            timeRange: { start: episode.startTime, end: episode.endTime },
            location: episode.centroid,
            confidence: episode.confidence,
            metadata: {
                duration: episode.duration,
                radius: episode.radius,
                overlapCount: episode.overlapCount,
            },
            tenantId: context.tenantId,
            policyLabels: context.policyLabels,
            generatedAt: Date.now(),
        };
        this.emitter.emit(event);
    }
    emitDwellEvent(episode, context) {
        const event = {
            id: (0, uuid_1.v4)(),
            type: 'dwell',
            sourceEntityIds: [episode.entityId],
            timeRange: { start: episode.startTime, end: episode.endTime },
            location: episode.centroid,
            confidence: episode.confidence,
            metadata: {
                duration: episode.duration,
                pointCount: episode.pointCount,
            },
            tenantId: context.tenantId,
            policyLabels: context.policyLabels,
            generatedAt: Date.now(),
        };
        this.emitter.emit(event);
    }
    countUniqueLocations(entries, radiusMeters) {
        const unique = [];
        for (const entry of entries) {
            const isNearExisting = unique.some((u) => {
                const dLat = u.latitude - entry.coordinate.latitude;
                const dLon = u.longitude - entry.coordinate.longitude;
                // Quick approximation before precise calculation
                if (Math.abs(dLat) > 0.01 || Math.abs(dLon) > 0.01)
                    return false;
                // Precise haversine for nearby points
                const R = 6371000;
                const lat1 = (u.latitude * Math.PI) / 180;
                const lat2 = (entry.coordinate.latitude * Math.PI) / 180;
                const deltaLat = ((entry.coordinate.latitude - u.latitude) * Math.PI) / 180;
                const deltaLon = ((entry.coordinate.longitude - u.longitude) * Math.PI) / 180;
                const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                return R * c <= radiusMeters;
            });
            if (!isNearExisting) {
                unique.push(entry.coordinate);
            }
        }
        return unique.length;
    }
}
exports.SpacetimeService = SpacetimeService;
/**
 * Factory function to create a SpacetimeService
 */
function createSpacetimeService(config, storage, emitter) {
    return new SpacetimeService(config, storage, emitter);
}
