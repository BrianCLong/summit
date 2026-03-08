"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpatialDetector = void 0;
const types_js_1 = require("../types.js");
class SpatialDetector {
    type = types_js_1.AnomalyType.SPATIAL;
    EARTH_RADIUS_KM = 6371;
    async detect(context) {
        const data = context.data;
        const { latitude, longitude, history = [], radiusKm = 100 } = data;
        if (history.length === 0) {
            return this.createResult(context, false, 0, types_js_1.Severity.LOW);
        }
        // Calculate centroid of history
        const center = this.calculateCentroid(history);
        const distanceFromCenter = this.haversineDistance(latitude, longitude, center.latitude, center.longitude);
        // Simple distance-based outlier detection
        const isAnomaly = distanceFromCenter > radiusKm;
        const score = Math.min(distanceFromCenter / (radiusKm * 2), 1.0); // Normalize score
        let severity = types_js_1.Severity.LOW;
        if (distanceFromCenter > radiusKm * 5)
            severity = types_js_1.Severity.CRITICAL;
        else if (distanceFromCenter > radiusKm * 3)
            severity = types_js_1.Severity.HIGH;
        else if (isAnomaly)
            severity = types_js_1.Severity.MEDIUM;
        return this.createResult(context, isAnomaly, score, severity, isAnomaly ? {
            description: `Spatial anomaly: Location is ${distanceFromCenter.toFixed(2)}km from historical center (limit ${radiusKm}km)`,
            contributingFactors: [
                { factor: 'distance_from_center', weight: 1.0, value: distanceFromCenter }
            ]
        } : undefined);
    }
    calculateCentroid(points) {
        const latSum = points.reduce((acc, p) => acc + p.latitude, 0);
        const lonSum = points.reduce((acc, p) => acc + p.longitude, 0);
        return {
            latitude: latSum / points.length,
            longitude: lonSum / points.length,
        };
    }
    haversineDistance(lat1, lon1, lat2, lon2) {
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) *
                Math.cos(this.deg2rad(lat2)) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return this.EARTH_RADIUS_KM * c;
    }
    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }
    createResult(context, isAnomaly, score, severity, explanation) {
        return {
            isAnomaly,
            score,
            severity,
            type: this.type,
            entityId: context.entityId,
            timestamp: context.timestamp,
            explanation,
        };
    }
}
exports.SpatialDetector = SpatialDetector;
