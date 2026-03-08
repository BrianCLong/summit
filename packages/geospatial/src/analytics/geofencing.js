"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateGeofences = void 0;
const geometry_js_1 = require("../utils/geometry.js");
const distance_js_1 = require("../utils/distance.js");
const insideFence = (location, geofence) => {
    if (!geofence.enabled)
        return false;
    if (geofence.type === 'proximity' && geofence.radius) {
        const target = geofence.geometry.type === 'Point'
            ? { latitude: geofence.geometry.coordinates[1], longitude: geofence.geometry.coordinates[0] }
            : location;
        return (0, distance_js_1.haversineDistance)(location, target) <= geofence.radius;
    }
    return (0, geometry_js_1.pointInGeometry)(location, geofence.geometry);
};
const evaluateGeofences = (tracks, geofences, options = {}) => {
    const dwellThreshold = options.dwellThresholdMs ?? 5 * 60 * 1000;
    const events = [];
    tracks.forEach((track) => {
        geofences.forEach((geofence) => {
            let inside = false;
            let dwellStart = null;
            track.points.forEach((point, idx) => {
                const currentlyInside = insideFence(point, geofence);
                if (currentlyInside && !inside) {
                    events.push({
                        id: `${track.id}-${geofence.id}-entry-${idx}`,
                        geofenceId: geofence.id,
                        entityId: track.entityId,
                        eventType: 'entry',
                        timestamp: point.timestamp ?? new Date(),
                        location: point,
                    });
                    dwellStart = point.timestamp ?? new Date();
                }
                if (currentlyInside) {
                    inside = true;
                }
                if (!currentlyInside && inside) {
                    events.push({
                        id: `${track.id}-${geofence.id}-exit-${idx}`,
                        geofenceId: geofence.id,
                        entityId: track.entityId,
                        eventType: 'exit',
                        timestamp: point.timestamp ?? new Date(),
                        location: point,
                    });
                    if (dwellStart && point.timestamp) {
                        const dwellTime = point.timestamp.getTime() - dwellStart.getTime();
                        if (dwellTime >= dwellThreshold) {
                            events.push({
                                id: `${track.id}-${geofence.id}-dwell-${idx}`,
                                geofenceId: geofence.id,
                                entityId: track.entityId,
                                eventType: 'dwell',
                                timestamp: point.timestamp,
                                location: point,
                                metadata: { dwellTime },
                            });
                        }
                    }
                    inside = false;
                    dwellStart = null;
                }
            });
        });
    });
    return events;
};
exports.evaluateGeofences = evaluateGeofences;
