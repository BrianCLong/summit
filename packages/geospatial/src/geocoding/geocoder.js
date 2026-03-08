"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeocodingEngine = exports.InMemoryGeocoder = void 0;
const projections_js_1 = require("../utils/projections.js");
const distance_js_1 = require("../utils/distance.js");
class InMemoryGeocoder {
    entries;
    constructor(entries) {
        this.entries = entries;
    }
    async geocode(query, bbox) {
        const normalized = query.trim().toLowerCase();
        const matches = this.entries
            .filter((entry) => {
            if (!bbox || !entry.bbox)
                return true;
            return (entry.bbox.minLon <= bbox.maxLon &&
                entry.bbox.maxLon >= bbox.minLon &&
                entry.bbox.minLat <= bbox.maxLat &&
                entry.bbox.maxLat >= bbox.minLat);
        })
            .map((entry) => {
            const names = [entry.name, ...(entry.aliases || [])].map((n) => n.toLowerCase());
            const hit = names.find((n) => n.includes(normalized));
            const confidence = hit ? Math.min(1, normalized.length / (hit.length + 1)) : 0;
            return { entry, confidence };
        })
            .filter((candidate) => candidate.confidence > 0.2)
            .sort((a, b) => b.confidence - a.confidence)
            .map((candidate) => ({
            location: (0, projections_js_1.normalizePoint)(candidate.entry.center),
            confidence: Number(candidate.confidence.toFixed(3)),
            label: candidate.entry.name,
        }));
        return { query, matches };
    }
    async reverseGeocode(point) {
        const normalized = (0, projections_js_1.normalizePoint)(point);
        const nearest = this.entries
            .map((entry) => {
            const distance = (0, distance_js_1.haversineDistance)(normalized, entry.center);
            return { label: entry.name, distanceMeters: distance };
        })
            .sort((a, b) => a.distanceMeters - b.distanceMeters)
            .slice(0, 3);
        return { location: normalized, nearest };
    }
}
exports.InMemoryGeocoder = InMemoryGeocoder;
class GeocodingEngine {
    provider;
    cache = new Map();
    constructor(provider) {
        this.provider = provider;
    }
    async geocode(query, bbox) {
        const cacheKey = `${query}-${bbox ? JSON.stringify(bbox) : 'global'}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        const result = await this.provider.geocode(query, bbox);
        this.cache.set(cacheKey, result);
        return result;
    }
    async reverseGeocode(point) {
        return this.provider.reverseGeocode(point);
    }
}
exports.GeocodingEngine = GeocodingEngine;
