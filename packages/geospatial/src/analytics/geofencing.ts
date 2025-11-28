import type { GeoPoint, Geofence, GeofenceEvent, MovementTrack } from '../types/geospatial.js';
import { pointInGeometry } from '../utils/geometry.js';
import { haversineDistance } from '../utils/distance.js';

export interface GeofenceEvaluationOptions {
  dwellThresholdMs?: number;
}

const insideFence = (location: GeoPoint, geofence: Geofence): boolean => {
  if (!geofence.enabled) return false;
  if (geofence.type === 'proximity' && geofence.radius) {
    const target = geofence.geometry.type === 'Point'
      ? { latitude: geofence.geometry.coordinates[1], longitude: geofence.geometry.coordinates[0] }
      : location;
    return haversineDistance(location, target) <= geofence.radius;
  }
  return pointInGeometry(location, geofence.geometry);
};

export const evaluateGeofences = (
  tracks: MovementTrack[],
  geofences: Geofence[],
  options: GeofenceEvaluationOptions = {}
): GeofenceEvent[] => {
  const dwellThreshold = options.dwellThresholdMs ?? 5 * 60 * 1000;
  const events: GeofenceEvent[] = [];

  tracks.forEach((track) => {
    geofences.forEach((geofence) => {
      let inside = false;
      let dwellStart: Date | null = null;

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
