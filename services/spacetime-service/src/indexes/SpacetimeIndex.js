"use strict";
/**
 * Spacetime Index - Combined Temporal-Spatial Indexing
 *
 * Provides efficient combined temporal and spatial queries by coordinating
 * between TimeIndex and GeoIndex. Optimizes query execution by choosing
 * the most selective filter first.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpacetimeIndex = void 0;
exports.createSpacetimeIndex = createSpacetimeIndex;
const TimeIndex_js_1 = require("./TimeIndex.js");
const GeoIndex_js_1 = require("./GeoIndex.js");
const geo_js_1 = require("../utils/geo.js");
const time_js_1 = require("../utils/time.js");
/**
 * Combined Spacetime Index
 */
class SpacetimeIndex {
    timeIndex;
    geoIndex;
    entriesById = new Map();
    geohashPrecision;
    constructor(geohashPrecision = 7) {
        this.timeIndex = new TimeIndex_js_1.TimeIndex();
        this.geoIndex = new GeoIndex_js_1.GeoIndex(geohashPrecision);
        this.geohashPrecision = geohashPrecision;
    }
    /**
     * Get count of indexed entries
     */
    get count() {
        return this.entriesById.size;
    }
    /**
     * Insert a spacetime entry
     */
    insert(entry) {
        if (this.entriesById.has(entry.id)) {
            this.delete(entry.id);
        }
        this.entriesById.set(entry.id, entry);
        // Insert into time index
        this.timeIndex.insert({
            id: entry.id,
            entityId: entry.entityId,
            start: entry.start,
            end: entry.end,
            data: entry,
        });
        // Insert into geo index
        this.geoIndex.insert({
            id: entry.id,
            entityId: entry.entityId,
            coordinate: entry.coordinate,
            timestamp: entry.start,
            data: entry,
        });
    }
    /**
     * Insert a TimeEvent
     */
    insertTimeEvent(event) {
        if (!event.location) {
            return; // Skip events without location for spacetime index
        }
        this.insert({
            id: event.id,
            entityId: event.entityId,
            coordinate: event.location,
            start: event.timestamp,
            end: event.timestamp,
            entryType: 'event',
            attributes: event.attributes,
            tenantId: event.tenantId,
            policyLabels: event.policyLabels,
        });
    }
    /**
     * Insert an Interval
     */
    insertInterval(interval) {
        if (!interval.location) {
            return; // Skip intervals without location
        }
        this.insert({
            id: interval.id,
            entityId: interval.entityId,
            coordinate: interval.location,
            start: interval.start,
            end: interval.end,
            entryType: 'interval',
            attributes: interval.attributes,
            tenantId: interval.tenantId,
            policyLabels: interval.policyLabels,
        });
    }
    /**
     * Insert a GeoPoint
     */
    insertGeoPoint(point) {
        const timestamp = point.timestamp ?? Date.now();
        this.insert({
            id: point.id,
            entityId: point.entityId,
            coordinate: point.coordinate,
            start: timestamp,
            end: timestamp,
            entryType: 'point',
            attributes: point.attributes,
            tenantId: point.tenantId,
            policyLabels: point.policyLabels,
        });
    }
    /**
     * Insert a Trajectory (creates entries for each point)
     */
    insertTrajectory(trajectory) {
        const entryIds = [];
        for (let i = 0; i < trajectory.points.length; i++) {
            const point = trajectory.points[i];
            const entryId = `${trajectory.id}:${i}`;
            this.insert({
                id: entryId,
                entityId: trajectory.entityId,
                coordinate: point.coordinate,
                start: point.timestamp,
                end: point.timestamp,
                entryType: 'trajectory_point',
                attributes: {
                    ...point.attributes,
                    trajectoryId: trajectory.id,
                    pointIndex: i,
                    speed: point.speed,
                    heading: point.heading,
                },
                tenantId: trajectory.tenantId,
                policyLabels: trajectory.policyLabels,
            });
            entryIds.push(entryId);
        }
        return entryIds;
    }
    /**
     * Delete an entry by ID
     */
    delete(id) {
        if (!this.entriesById.has(id)) {
            return false;
        }
        this.timeIndex.delete(id);
        this.geoIndex.delete(id);
        this.entriesById.delete(id);
        return true;
    }
    /**
     * Query with combined temporal and spatial filters
     */
    query(options) {
        let results = [];
        // Determine query strategy based on available filters
        const hasTimeFilter = options.timeWindow !== undefined;
        const hasSpatialFilter = options.bbox !== undefined ||
            options.geometry !== undefined ||
            (options.center !== undefined && options.radius !== undefined);
        if (!hasTimeFilter && !hasSpatialFilter) {
            // No filters - return all (with limit)
            results = Array.from(this.entriesById.values());
        }
        else if (hasTimeFilter && !hasSpatialFilter) {
            // Time-only query
            const timeEntries = this.timeIndex.findOverlapping(options.timeWindow);
            results = timeEntries.map((e) => e.data);
        }
        else if (!hasTimeFilter && hasSpatialFilter) {
            // Spatial-only query
            results = this.querySpatial(options);
        }
        else {
            // Combined query - use the more selective filter first
            // Heuristic: spatial queries on small areas are usually more selective
            results = this.querySpatial(options);
            // Then filter by time
            results = results.filter((entry) => (0, time_js_1.intervalsOverlap)({ start: entry.start, end: entry.end }, options.timeWindow));
        }
        // Filter by entity IDs if specified
        if (options.entityIds && options.entityIds.length > 0) {
            const entitySet = new Set(options.entityIds);
            results = results.filter((entry) => entitySet.has(entry.entityId));
        }
        // Apply offset and limit
        if (options.offset !== undefined && options.offset > 0) {
            results = results.slice(options.offset);
        }
        if (options.limit !== undefined && results.length > options.limit) {
            results = results.slice(0, options.limit);
        }
        return results;
    }
    /**
     * Find entities that are co-located within a time window
     */
    findCoLocated(timeWindow, radiusMeters, minEntities = 2) {
        // Get all entries in time window
        const timeEntries = this.timeIndex.findOverlapping(timeWindow);
        if (timeEntries.length < minEntities) {
            return [];
        }
        // Group by approximate location (geohash)
        const locationGroups = new Map();
        for (const entry of timeEntries) {
            const geohash = this.geoIndex.getGeohash(entry.data.coordinate);
            const prefix = geohash.substring(0, 5); // ~5km precision for grouping
            if (!locationGroups.has(prefix)) {
                locationGroups.set(prefix, []);
            }
            locationGroups.get(prefix).push(entry.data);
        }
        const results = [];
        // Analyze each location group
        for (const entries of locationGroups.values()) {
            // Get unique entities
            const entityIds = [...new Set(entries.map((e) => e.entityId))];
            if (entityIds.length < minEntities) {
                continue;
            }
            // Check if entities are actually within radius
            const centroid = (0, geo_js_1.calculateCentroid)(entries.map((e) => e.coordinate));
            const withinRadius = entries.filter((e) => (0, geo_js_1.haversineDistance)(centroid, e.coordinate) <= radiusMeters);
            const withinEntityIds = [...new Set(withinRadius.map((e) => e.entityId))];
            if (withinEntityIds.length >= minEntities) {
                // Calculate actual time range
                let minTime = Infinity;
                let maxTime = -Infinity;
                for (const entry of withinRadius) {
                    minTime = Math.min(minTime, entry.start);
                    maxTime = Math.max(maxTime, entry.end);
                }
                results.push({
                    centroid,
                    entityIds: withinEntityIds,
                    entries: withinRadius,
                    timeRange: { start: minTime, end: maxTime },
                });
            }
        }
        return results;
    }
    /**
     * Get all entries for an entity in time order
     */
    getEntityTimeline(entityId, timeWindow) {
        let entries;
        if (timeWindow) {
            const timeEntries = this.timeIndex.findByEntityInWindow(entityId, timeWindow);
            entries = timeEntries.map((e) => e.data);
        }
        else {
            const timeEntries = this.timeIndex.findByEntity(entityId);
            entries = timeEntries.map((e) => e.data);
        }
        // Sort by start time
        return entries.sort((a, b) => a.start - b.start);
    }
    /**
     * Get entry by ID
     */
    get(id) {
        return this.entriesById.get(id);
    }
    /**
     * Check if entry exists
     */
    has(id) {
        return this.entriesById.has(id);
    }
    /**
     * Get all entity IDs
     */
    getEntityIds() {
        return [...new Set(Array.from(this.entriesById.values()).map((e) => e.entityId))];
    }
    /**
     * Get time bounds of all entries
     */
    getTimeBounds() {
        return this.timeIndex.getTimeBounds();
    }
    /**
     * Get spatial bounds of all entries
     */
    getSpatialBounds() {
        return this.geoIndex.getBoundingBox();
    }
    /**
     * Clear all entries
     */
    clear() {
        this.timeIndex.clear();
        this.geoIndex.clear();
        this.entriesById.clear();
    }
    /**
     * Iterate over all entries
     */
    *entries() {
        yield* this.entriesById.values();
    }
    // =========================================================================
    // Private Helpers
    // =========================================================================
    querySpatial(options) {
        if (options.center !== undefined && options.radius !== undefined) {
            const geoEntries = this.geoIndex.findInRadius(options.center, options.radius);
            return geoEntries.map((e) => e.data);
        }
        if (options.geometry !== undefined) {
            const geoEntries = this.geoIndex.findInGeometry(options.geometry);
            return geoEntries.map((e) => e.data);
        }
        if (options.bbox !== undefined) {
            const geoEntries = this.geoIndex.findInBBox(options.bbox);
            return geoEntries.map((e) => e.data);
        }
        return [];
    }
}
exports.SpacetimeIndex = SpacetimeIndex;
/**
 * Factory function to create a spacetime index
 */
function createSpacetimeIndex(geohashPrecision = 7) {
    return new SpacetimeIndex(geohashPrecision);
}
