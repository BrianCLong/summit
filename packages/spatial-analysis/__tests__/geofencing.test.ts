/**
 * Geofencing manager tests
 */

import {
  GeofenceManager,
  createCircularGeofence,
  createPolygonGeofence,
} from '../src/geofencing/geofence-manager';
import { GeoPoint, Geofence, GeofenceEvent } from '@intelgraph/geospatial';

describe('GeofenceManager', () => {
  let manager: GeofenceManager;

  beforeEach(() => {
    manager = new GeofenceManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('addGeofence()', () => {
    it('should add a geofence', () => {
      const geofence = createCircularGeofence(
        'test-1',
        'Test Zone',
        { latitude: 40.7128, longitude: -74.006 },
        100
      );

      manager.addGeofence(geofence);
      const geofences = manager.getGeofences();

      expect(geofences).toHaveLength(1);
      expect(geofences[0].id).toBe('test-1');
    });
  });

  describe('removeGeofence()', () => {
    it('should remove a geofence', () => {
      const geofence = createCircularGeofence(
        'test-1',
        'Test Zone',
        { latitude: 40.7128, longitude: -74.006 },
        100
      );

      manager.addGeofence(geofence);
      manager.removeGeofence('test-1');

      expect(manager.getGeofences()).toHaveLength(0);
    });
  });

  describe('updateEntityPosition()', () => {
    it('should detect entry into geofence', () => {
      const center: GeoPoint = { latitude: 40.7128, longitude: -74.006 };
      const geofence = createCircularGeofence('zone-1', 'Zone', center, 100, 'entry');
      manager.addGeofence(geofence);

      const alerts: GeofenceEvent[] = [];
      manager.onAlert((event) => alerts.push(event));

      // First position outside
      manager.updateEntityPosition('entity-1', {
        latitude: 40.72,
        longitude: -74.006,
      });

      // Second position inside
      const events = manager.updateEntityPosition('entity-1', center);

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events.some((e) => e.eventType === 'entry')).toBe(true);
    });

    it('should detect exit from geofence', () => {
      const center: GeoPoint = { latitude: 40.7128, longitude: -74.006 };
      const geofence = createCircularGeofence('zone-1', 'Zone', center, 100, 'exit');
      manager.addGeofence(geofence);

      // First inside
      manager.updateEntityPosition('entity-1', center);

      // Then outside
      const events = manager.updateEntityPosition('entity-1', {
        latitude: 40.72,
        longitude: -74.006,
      });

      expect(events.some((e) => e.eventType === 'exit')).toBe(true);
    });
  });

  describe('getEntitiesInGeofence()', () => {
    it('should return entities inside geofence', () => {
      const center: GeoPoint = { latitude: 40.7128, longitude: -74.006 };
      const geofence = createCircularGeofence('zone-1', 'Zone', center, 100);
      manager.addGeofence(geofence);

      manager.updateEntityPosition('entity-1', center);

      const entities = manager.getEntitiesInGeofence('zone-1');
      expect(entities).toContain('entity-1');
    });
  });

  describe('setGeofenceEnabled()', () => {
    it('should enable/disable geofence', () => {
      const geofence = createCircularGeofence(
        'zone-1',
        'Zone',
        { latitude: 40.7128, longitude: -74.006 },
        100
      );
      manager.addGeofence(geofence);

      manager.setGeofenceEnabled('zone-1', false);
      const disabled = manager.getGeofences().find((g) => g.id === 'zone-1');
      expect(disabled?.enabled).toBe(false);

      manager.setGeofenceEnabled('zone-1', true);
      const enabled = manager.getGeofences().find((g) => g.id === 'zone-1');
      expect(enabled?.enabled).toBe(true);
    });
  });
});

describe('Geofence Helpers', () => {
  describe('createCircularGeofence()', () => {
    it('should create a circular geofence', () => {
      const geofence = createCircularGeofence(
        'circle-1',
        'Circle Zone',
        { latitude: 40.7128, longitude: -74.006 },
        500
      );

      expect(geofence.id).toBe('circle-1');
      expect(geofence.name).toBe('Circle Zone');
      expect(geofence.radius).toBe(500);
      expect(geofence.geometry.type).toBe('Point');
      expect(geofence.enabled).toBe(true);
    });
  });

  describe('createPolygonGeofence()', () => {
    it('should create a polygon geofence', () => {
      const coords = [
        [
          [-74.1, 40.7],
          [-73.9, 40.7],
          [-73.9, 40.8],
          [-74.1, 40.8],
          [-74.1, 40.7],
        ],
      ];

      const geofence = createPolygonGeofence('poly-1', 'Polygon Zone', coords, 'entry');

      expect(geofence.id).toBe('poly-1');
      expect(geofence.geometry.type).toBe('Polygon');
      expect(geofence.type).toBe('entry');
    });
  });
});
