/**
 * Geofencing service with alerts and notifications
 */

import { GeoPoint, Geofence, GeofenceEvent } from '@intelgraph/geospatial';
import { haversineDistance } from '@intelgraph/geospatial';
import { isPointInPolygon } from '../algorithms/point-in-polygon.js';
import { Position } from 'geojson';

export type GeofenceAlertCallback = (event: GeofenceEvent) => void;

export interface EntityState {
  entityId: string;
  lastPosition: GeoPoint;
  lastUpdate: Date;
  insideGeofences: Set<string>;
  dwellTimes: Map<string, number>; // geofenceId -> milliseconds
}

/**
 * Geofencing manager for real-time location monitoring
 */
export class GeofenceManager {
  private geofences: Map<string, Geofence> = new Map();
  private entityStates: Map<string, EntityState> = new Map();
  private alertCallbacks: GeofenceAlertCallback[] = [];
  private dwellCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start dwell time checker
    this.startDwellChecker();
  }

  /**
   * Add a geofence
   */
  addGeofence(geofence: Geofence): void {
    this.geofences.set(geofence.id, geofence);
  }

  /**
   * Remove a geofence
   */
  removeGeofence(geofenceId: string): void {
    this.geofences.delete(geofenceId);
  }

  /**
   * Get all geofences
   */
  getGeofences(): Geofence[] {
    return Array.from(this.geofences.values());
  }

  /**
   * Update a geofence
   */
  updateGeofence(geofenceId: string, updates: Partial<Geofence>): void {
    const geofence = this.geofences.get(geofenceId);
    if (geofence) {
      this.geofences.set(geofenceId, { ...geofence, ...updates });
    }
  }

  /**
   * Enable or disable a geofence
   */
  setGeofenceEnabled(geofenceId: string, enabled: boolean): void {
    this.updateGeofence(geofenceId, { enabled });
  }

  /**
   * Register alert callback
   */
  onAlert(callback: GeofenceAlertCallback): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Update entity position and check geofences
   */
  updateEntityPosition(entityId: string, position: GeoPoint): GeofenceEvent[] {
    const now = new Date();
    const events: GeofenceEvent[] = [];

    // Get or create entity state
    let state = this.entityStates.get(entityId);
    if (!state) {
      state = {
        entityId,
        lastPosition: position,
        lastUpdate: now,
        insideGeofences: new Set(),
        dwellTimes: new Map(),
      };
      this.entityStates.set(entityId, state);
    }

    // Check each geofence
    for (const geofence of this.geofences.values()) {
      if (!geofence.enabled) continue;

      const isInside = this.isInsideGeofence(position, geofence);
      const wasInside = state.insideGeofences.has(geofence.id);

      // Entry event
      if (isInside && !wasInside) {
        state.insideGeofences.add(geofence.id);
        state.dwellTimes.set(geofence.id, 0);

        if (geofence.type === 'entry' || geofence.type === 'dwell') {
          const event: GeofenceEvent = {
            id: `${entityId}-${geofence.id}-${now.getTime()}`,
            geofenceId: geofence.id,
            entityId,
            eventType: 'entry',
            timestamp: now,
            location: position,
          };
          events.push(event);
          this.emitAlert(event);
        }
      }

      // Exit event
      if (!isInside && wasInside) {
        state.insideGeofences.delete(geofence.id);
        state.dwellTimes.delete(geofence.id);

        if (geofence.type === 'exit') {
          const event: GeofenceEvent = {
            id: `${entityId}-${geofence.id}-${now.getTime()}`,
            geofenceId: geofence.id,
            entityId,
            eventType: 'exit',
            timestamp: now,
            location: position,
          };
          events.push(event);
          this.emitAlert(event);
        }
      }

      // Update dwell time
      if (isInside && state.dwellTimes.has(geofence.id)) {
        const elapsed = now.getTime() - state.lastUpdate.getTime();
        const currentDwell = state.dwellTimes.get(geofence.id)! + elapsed;
        state.dwellTimes.set(geofence.id, currentDwell);
      }
    }

    // Update state
    state.lastPosition = position;
    state.lastUpdate = now;

    return events;
  }

  /**
   * Check if a point is inside a geofence
   */
  private isInsideGeofence(point: GeoPoint, geofence: Geofence): boolean {
    // Handle proximity geofences (circular)
    if (geofence.type === 'proximity' && geofence.radius) {
      const center = this.getGeofenceCenter(geofence);
      if (center) {
        const distance = haversineDistance(point, center);
        return distance <= geofence.radius;
      }
    }

    // Handle polygon geofences
    if (geofence.geometry.type === 'Polygon') {
      return isPointInPolygon(point, geofence.geometry.coordinates as Position[][]);
    }

    if (geofence.geometry.type === 'MultiPolygon') {
      return (geofence.geometry.coordinates as Position[][][]).some(
        (polygon) => isPointInPolygon(point, polygon)
      );
    }

    // Handle point geofences with radius
    if (geofence.geometry.type === 'Point' && geofence.radius) {
      const center: GeoPoint = {
        latitude: (geofence.geometry.coordinates as Position)[1],
        longitude: (geofence.geometry.coordinates as Position)[0],
      };
      const distance = haversineDistance(point, center);
      return distance <= geofence.radius;
    }

    return false;
  }

  /**
   * Get the center of a geofence
   */
  private getGeofenceCenter(geofence: Geofence): GeoPoint | null {
    if (geofence.geometry.type === 'Point') {
      const coords = geofence.geometry.coordinates as Position;
      return { latitude: coords[1], longitude: coords[0] };
    }

    if (geofence.geometry.type === 'Polygon') {
      const ring = (geofence.geometry.coordinates as Position[][])[0];
      const avgLat = ring.reduce((sum, c) => sum + c[1], 0) / ring.length;
      const avgLon = ring.reduce((sum, c) => sum + c[0], 0) / ring.length;
      return { latitude: avgLat, longitude: avgLon };
    }

    return null;
  }

  /**
   * Start dwell time checker
   */
  private startDwellChecker(): void {
    this.dwellCheckInterval = setInterval(() => {
      this.checkDwellTimes();
    }, 10000); // Check every 10 seconds
  }

  /**
   * Check dwell times and emit alerts
   */
  private checkDwellTimes(): void {
    const now = new Date();

    for (const [entityId, state] of this.entityStates) {
      for (const [geofenceId, dwellTime] of state.dwellTimes) {
        const geofence = this.geofences.get(geofenceId);
        if (!geofence || geofence.type !== 'dwell' || !geofence.dwellTime) continue;

        if (dwellTime >= geofence.dwellTime) {
          const event: GeofenceEvent = {
            id: `${entityId}-${geofenceId}-dwell-${now.getTime()}`,
            geofenceId,
            entityId,
            eventType: 'dwell',
            timestamp: now,
            location: state.lastPosition,
            metadata: { dwellTime },
          };
          this.emitAlert(event);

          // Reset dwell time to avoid repeated alerts
          state.dwellTimes.set(geofenceId, 0);
        }
      }
    }
  }

  /**
   * Emit alert to all registered callbacks
   */
  private emitAlert(event: GeofenceEvent): void {
    this.alertCallbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('Geofence alert callback error:', error);
      }
    });
  }

  /**
   * Get entity state
   */
  getEntityState(entityId: string): EntityState | undefined {
    return this.entityStates.get(entityId);
  }

  /**
   * Get all entities inside a geofence
   */
  getEntitiesInGeofence(geofenceId: string): string[] {
    const entities: string[] = [];
    for (const [entityId, state] of this.entityStates) {
      if (state.insideGeofences.has(geofenceId)) {
        entities.push(entityId);
      }
    }
    return entities;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.dwellCheckInterval) {
      clearInterval(this.dwellCheckInterval);
    }
    this.alertCallbacks = [];
    this.entityStates.clear();
    this.geofences.clear();
  }
}

/**
 * Create a circular geofence
 */
export function createCircularGeofence(
  id: string,
  name: string,
  center: GeoPoint,
  radiusMeters: number,
  type: Geofence['type'] = 'entry'
): Geofence {
  return {
    id,
    name,
    geometry: {
      type: 'Point',
      coordinates: [center.longitude, center.latitude],
    },
    type,
    radius: radiusMeters,
    enabled: true,
  };
}

/**
 * Create a polygon geofence
 */
export function createPolygonGeofence(
  id: string,
  name: string,
  coordinates: Position[][],
  type: Geofence['type'] = 'entry'
): Geofence {
  return {
    id,
    name,
    geometry: {
      type: 'Polygon',
      coordinates,
    },
    type,
    enabled: true,
  };
}
