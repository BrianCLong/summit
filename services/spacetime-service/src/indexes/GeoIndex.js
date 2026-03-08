"use strict";
/**
 * Geo Index - Spatial Indexing with R-tree and Geohash
 *
 * Provides efficient spatial queries using:
 * - R-tree for bounding box queries and k-NN
 * - Geohash for grid-based lookups and proximity
 *
 * Supports:
 * - Point-in-polygon queries
 * - Distance/radius queries
 * - k-Nearest Neighbors
 * - Bounding box queries
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeoIndex = void 0;
exports.createGeoIndex = createGeoIndex;
const rbush_1 = __importDefault(require("rbush"));
const ngeohash_1 = __importDefault(require("ngeohash"));
const geo_js_1 = require("../utils/geo.js");
/**
 * Custom R-tree for geographic data
 */
class GeoRBush extends rbush_1.default {
    toBBox(item) {
        return {
            minX: item.minX,
            minY: item.minY,
            maxX: item.maxX,
            maxY: item.maxY,
        };
    }
    compareMinX(a, b) {
        return a.minX - b.minX;
    }
    compareMinY(a, b) {
        return a.minY - b.minY;
    }
}
/**
 * Geo Index combining R-tree and Geohash
 */
class GeoIndex {
    rtree;
    entriesById = new Map();
    entriesByEntity = new Map();
    entriesByGeohash = new Map();
    geohashPrecision;
    constructor(geohashPrecision = 7) {
        this.rtree = new GeoRBush();
        this.geohashPrecision = geohashPrecision;
    }
    /**
     * Get the number of entries in the index
     */
    get count() {
        return this.entriesById.size;
    }
    /**
     * Insert an entry into the index
     */
    insert(entry) {
        if (this.entriesById.has(entry.id)) {
            this.delete(entry.id);
        }
        // Create R-tree item (use lon/lat as x/y)
        const item = {
            minX: entry.coordinate.longitude,
            minY: entry.coordinate.latitude,
            maxX: entry.coordinate.longitude,
            maxY: entry.coordinate.latitude,
            entry,
        };
        this.rtree.insert(item);
        this.entriesById.set(entry.id, entry);
        // Index by entity
        if (!this.entriesByEntity.has(entry.entityId)) {
            this.entriesByEntity.set(entry.entityId, new Set());
        }
        this.entriesByEntity.get(entry.entityId).add(entry.id);
        // Index by geohash
        const geohash = ngeohash_1.default.encode(entry.coordinate.latitude, entry.coordinate.longitude, this.geohashPrecision);
        if (!this.entriesByGeohash.has(geohash)) {
            this.entriesByGeohash.set(geohash, new Set());
        }
        this.entriesByGeohash.get(geohash).add(entry.id);
    }
    /**
     * Bulk insert entries
     */
    bulkInsert(entries) {
        const items = [];
        for (const entry of entries) {
            if (this.entriesById.has(entry.id)) {
                continue;
            }
            const item = {
                minX: entry.coordinate.longitude,
                minY: entry.coordinate.latitude,
                maxX: entry.coordinate.longitude,
                maxY: entry.coordinate.latitude,
                entry,
            };
            items.push(item);
            this.entriesById.set(entry.id, entry);
            if (!this.entriesByEntity.has(entry.entityId)) {
                this.entriesByEntity.set(entry.entityId, new Set());
            }
            this.entriesByEntity.get(entry.entityId).add(entry.id);
            const geohash = ngeohash_1.default.encode(entry.coordinate.latitude, entry.coordinate.longitude, this.geohashPrecision);
            if (!this.entriesByGeohash.has(geohash)) {
                this.entriesByGeohash.set(geohash, new Set());
            }
            this.entriesByGeohash.get(geohash).add(entry.id);
        }
        this.rtree.load(items);
    }
    /**
     * Delete an entry by ID
     */
    delete(id) {
        const entry = this.entriesById.get(id);
        if (!entry) {
            return false;
        }
        // Remove from R-tree
        const item = {
            minX: entry.coordinate.longitude,
            minY: entry.coordinate.latitude,
            maxX: entry.coordinate.longitude,
            maxY: entry.coordinate.latitude,
            entry,
        };
        this.rtree.remove(item, (a, b) => a.entry.id === b.entry.id);
        // Remove from maps
        this.entriesById.delete(id);
        this.entriesByEntity.get(entry.entityId)?.delete(id);
        const geohash = ngeohash_1.default.encode(entry.coordinate.latitude, entry.coordinate.longitude, this.geohashPrecision);
        this.entriesByGeohash.get(geohash)?.delete(id);
        return true;
    }
    /**
     * Find entries within a bounding box
     */
    findInBBox(bbox) {
        const items = this.rtree.search({
            minX: bbox.minLon,
            minY: bbox.minLat,
            maxX: bbox.maxLon,
            maxY: bbox.maxLat,
        });
        return items.map((item) => item.entry);
    }
    /**
     * Find entries within a radius of a point
     */
    findInRadius(center, radiusMeters, limit) {
        // First, get candidates from bounding box
        const bbox = this.radiusToBBox(center, radiusMeters);
        const candidates = this.findInBBox(bbox);
        // Filter by actual distance and add distance field
        const results = [];
        for (const entry of candidates) {
            const distance = (0, geo_js_1.haversineDistance)(center, entry.coordinate);
            if (distance <= radiusMeters) {
                results.push({ ...entry, distance });
            }
        }
        // Sort by distance
        results.sort((a, b) => a.distance - b.distance);
        // Apply limit
        if (limit !== undefined && results.length > limit) {
            return results.slice(0, limit);
        }
        return results;
    }
    /**
     * Find k-nearest neighbors to a point
     */
    findKNearest(center, k, maxDistance) {
        // Start with a reasonable search radius and expand if needed
        let searchRadius = maxDistance ?? 10000; // 10km default
        let results = [];
        while (results.length < k && searchRadius <= 20000000) {
            // Max ~half earth circumference
            results = this.findInRadius(center, searchRadius);
            if (results.length >= k || maxDistance !== undefined) {
                break;
            }
            searchRadius *= 2;
        }
        // Sort by distance and take k
        results.sort((a, b) => a.distance - b.distance);
        if (maxDistance !== undefined) {
            results = results.filter((r) => r.distance <= maxDistance);
        }
        return results.slice(0, k);
    }
    /**
     * Find entries within a geometry (polygon, etc.)
     */
    findInGeometry(geometry) {
        // Get bounding box of geometry
        const bbox = (0, geo_js_1.geometryBoundingBox)(geometry);
        // Get candidates from R-tree
        const candidates = this.findInBBox(bbox);
        // Filter by point-in-polygon
        return candidates.filter((entry) => (0, geo_js_1.pointInGeometry)(entry.coordinate, geometry));
    }
    /**
     * Find entries by geohash prefix
     */
    findByGeohashPrefix(prefix) {
        const results = [];
        for (const [geohash, ids] of this.entriesByGeohash) {
            if (geohash.startsWith(prefix)) {
                for (const id of ids) {
                    const entry = this.entriesById.get(id);
                    if (entry) {
                        results.push(entry);
                    }
                }
            }
        }
        return results;
    }
    /**
     * Find entries in neighboring geohash cells
     */
    findInGeohashNeighborhood(center, precision) {
        const p = precision ?? this.geohashPrecision;
        const centerHash = ngeohash_1.default.encode(center.latitude, center.longitude, p);
        const neighbors = ngeohash_1.default.neighbors(centerHash);
        const allHashes = [centerHash, ...Object.values(neighbors)];
        const results = [];
        const seen = new Set();
        for (const hash of allHashes) {
            const ids = this.entriesByGeohash.get(hash);
            if (ids) {
                for (const id of ids) {
                    if (!seen.has(id)) {
                        seen.add(id);
                        const entry = this.entriesById.get(id);
                        if (entry) {
                            results.push(entry);
                        }
                    }
                }
            }
        }
        return results;
    }
    /**
     * Find all entries for a specific entity
     */
    findByEntity(entityId) {
        const ids = this.entriesByEntity.get(entityId);
        if (!ids) {
            return [];
        }
        return Array.from(ids)
            .map((id) => this.entriesById.get(id))
            .filter((entry) => entry !== undefined);
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
     * Get all entity IDs in the index
     */
    getEntityIds() {
        return Array.from(this.entriesByEntity.keys());
    }
    /**
     * Get bounding box of all entries
     */
    getBoundingBox() {
        if (this.entriesById.size === 0) {
            return null;
        }
        let minLat = 90;
        let maxLat = -90;
        let minLon = 180;
        let maxLon = -180;
        for (const entry of this.entriesById.values()) {
            minLat = Math.min(minLat, entry.coordinate.latitude);
            maxLat = Math.max(maxLat, entry.coordinate.latitude);
            minLon = Math.min(minLon, entry.coordinate.longitude);
            maxLon = Math.max(maxLon, entry.coordinate.longitude);
        }
        return { minLat, maxLat, minLon, maxLon };
    }
    /**
     * Clear all entries
     */
    clear() {
        this.rtree.clear();
        this.entriesById.clear();
        this.entriesByEntity.clear();
        this.entriesByGeohash.clear();
    }
    /**
     * Iterate over all entries
     */
    *entries() {
        yield* this.entriesById.values();
    }
    /**
     * Get geohash for a coordinate
     */
    getGeohash(coordinate) {
        return ngeohash_1.default.encode(coordinate.latitude, coordinate.longitude, this.geohashPrecision);
    }
    /**
     * Decode geohash to bounding box
     */
    decodeGeohash(hash) {
        const decoded = ngeohash_1.default.decode_bbox(hash);
        return {
            minLat: decoded[0],
            minLon: decoded[1],
            maxLat: decoded[2],
            maxLon: decoded[3],
        };
    }
    // =========================================================================
    // Private Helpers
    // =========================================================================
    radiusToBBox(center, radiusMeters) {
        // Approximate degrees per meter (varies with latitude)
        const latDegreesPerMeter = 1 / 111320;
        const lonDegreesPerMeter = 1 / (111320 * Math.cos((center.latitude * Math.PI) / 180));
        const latDelta = radiusMeters * latDegreesPerMeter;
        const lonDelta = radiusMeters * lonDegreesPerMeter;
        return {
            minLat: Math.max(-90, center.latitude - latDelta),
            maxLat: Math.min(90, center.latitude + latDelta),
            minLon: Math.max(-180, center.longitude - lonDelta),
            maxLon: Math.min(180, center.longitude + lonDelta),
        };
    }
}
exports.GeoIndex = GeoIndex;
/**
 * Factory function to create a geo index
 */
function createGeoIndex(geohashPrecision = 7) {
    return new GeoIndex(geohashPrecision);
}
