/**
 * Integration tests for SpacetimeService
 */

import { describe, expect, it, beforeEach } from '@jest/globals';
import { v4 as uuidv4 } from 'uuid';
import {
  SpacetimeService,
  createSpacetimeService,
  InMemoryStorageAdapter,
  type DerivedEventEmitter,
  type DerivedEventReference,
} from '../services/SpacetimeService.js';
import type {
  TimeEvent,
  Interval,
  GeoPoint,
  Trajectory,
  PolicyContext,
} from '../types/index.js';

describe('SpacetimeService', () => {
  let service: SpacetimeService;
  let emittedEvents: DerivedEventReference[];
  const defaultContext: PolicyContext = {
    tenantId: 'tenant-1',
    policyLabels: [],
  };

  beforeEach(() => {
    emittedEvents = [];
    const emitter: DerivedEventEmitter = {
      emit: (event) => emittedEvents.push(event),
    };
    service = createSpacetimeService(undefined, undefined, emitter);
  });

  describe('Data Ingestion', () => {
    it('ingests time events', async () => {
      const event: TimeEvent = {
        id: uuidv4(),
        entityId: 'entity-1',
        timestamp: Date.now(),
        location: { latitude: 40.7128, longitude: -74.006 },
        eventType: 'observation',
        attributes: {},
        tenantId: 'tenant-1',
        policyLabels: [],
        provenance: { source: 'test', chain: [], confidence: 1 },
        createdAt: Date.now(),
      };

      await service.ingestTimeEvent(event);

      const stats = service.getIndexStats();
      expect(stats.entryCount).toBe(1);
    });

    it('ingests intervals', async () => {
      const interval: Interval = {
        id: uuidv4(),
        entityId: 'entity-1',
        start: Date.now() - 3600000,
        end: Date.now(),
        location: { latitude: 40.7128, longitude: -74.006 },
        intervalType: 'presence',
        attributes: {},
        tenantId: 'tenant-1',
        policyLabels: [],
        provenance: { source: 'test', chain: [], confidence: 1 },
        createdAt: Date.now(),
      };

      await service.ingestInterval(interval);

      const stats = service.getIndexStats();
      expect(stats.entryCount).toBe(1);
    });

    it('ingests geo points', async () => {
      const point: GeoPoint = {
        id: uuidv4(),
        entityId: 'entity-1',
        coordinate: { latitude: 40.7128, longitude: -74.006 },
        timestamp: Date.now(),
        pointType: 'observation',
        attributes: {},
        tenantId: 'tenant-1',
        policyLabels: [],
        createdAt: Date.now(),
      };

      await service.ingestGeoPoint(point);

      const stats = service.getIndexStats();
      expect(stats.entryCount).toBe(1);
    });

    it('ingests trajectories', async () => {
      const trajectory: Trajectory = {
        id: uuidv4(),
        entityId: 'entity-1',
        points: [
          { coordinate: { latitude: 40.7128, longitude: -74.006 }, timestamp: Date.now() - 3600000 },
          { coordinate: { latitude: 40.7484, longitude: -73.9857 }, timestamp: Date.now() - 1800000 },
          { coordinate: { latitude: 40.758, longitude: -73.9855 }, timestamp: Date.now() },
        ],
        startTime: Date.now() - 3600000,
        endTime: Date.now(),
        totalDistance: 5000,
        attributes: {},
        tenantId: 'tenant-1',
        policyLabels: [],
        provenance: { source: 'test', chain: [], confidence: 1 },
        createdAt: Date.now(),
      };

      await service.ingestTrajectory(trajectory);

      const stats = service.getIndexStats();
      expect(stats.entryCount).toBe(3); // One entry per point
    });
  });

  describe('findCoPresence', () => {
    beforeEach(async () => {
      const now = Date.now();

      // Entity 1 and 2 are near each other at same time
      for (let i = 0; i < 5; i++) {
        await service.ingestTimeEvent({
          id: uuidv4(),
          entityId: 'entity-1',
          timestamp: now - 60000 * i,
          location: { latitude: 40.7128, longitude: -74.006 },
          eventType: 'observation',
          attributes: {},
          tenantId: 'tenant-1',
          policyLabels: [],
          provenance: { source: 'test', chain: [], confidence: 1 },
          createdAt: now,
        });

        await service.ingestTimeEvent({
          id: uuidv4(),
          entityId: 'entity-2',
          timestamp: now - 60000 * i,
          location: { latitude: 40.7129, longitude: -74.0061 }, // ~10m away
          eventType: 'observation',
          attributes: {},
          tenantId: 'tenant-1',
          policyLabels: [],
          provenance: { source: 'test', chain: [], confidence: 1 },
          createdAt: now,
        });
      }

      // Entity 3 is far away
      await service.ingestTimeEvent({
        id: uuidv4(),
        entityId: 'entity-3',
        timestamp: now,
        location: { latitude: 34.0522, longitude: -118.2437 }, // LA
        eventType: 'observation',
        attributes: {},
        tenantId: 'tenant-1',
        policyLabels: [],
        provenance: { source: 'test', chain: [], confidence: 1 },
        createdAt: now,
      });
    });

    it('finds co-presence episodes', () => {
      const now = Date.now();
      const episodes = service.findCoPresence({
        entityIds: ['entity-1', 'entity-2'],
        timeWindow: { start: now - 300000, end: now },
        radius: 100, // 100m
        minOverlapDuration: 0,
        minConfidence: 0,
        context: defaultContext,
      });

      expect(episodes.length).toBeGreaterThan(0);
      expect(episodes[0].entityIds).toContain('entity-1');
      expect(episodes[0].entityIds).toContain('entity-2');
    });

    it('does not find co-presence for distant entities', () => {
      const now = Date.now();
      const episodes = service.findCoPresence({
        entityIds: ['entity-1', 'entity-3'],
        timeWindow: { start: now - 300000, end: now },
        radius: 100,
        minOverlapDuration: 0,
        minConfidence: 0,
        context: defaultContext,
      });

      expect(episodes).toHaveLength(0);
    });

    it('emits derived events for co-presence', () => {
      const now = Date.now();
      service.findCoPresence({
        entityIds: ['entity-1', 'entity-2'],
        timeWindow: { start: now - 300000, end: now },
        radius: 100,
        minOverlapDuration: 0,
        minConfidence: 0,
        context: defaultContext,
      });

      const coPresenceEvents = emittedEvents.filter((e) => e.type === 'co_presence');
      expect(coPresenceEvents.length).toBeGreaterThan(0);
    });
  });

  describe('findEntitiesInRegion', () => {
    beforeEach(async () => {
      const now = Date.now();

      // Entities in NYC
      await service.ingestTimeEvent({
        id: uuidv4(),
        entityId: 'nyc-1',
        timestamp: now,
        location: { latitude: 40.7128, longitude: -74.006 },
        eventType: 'observation',
        attributes: {},
        tenantId: 'tenant-1',
        policyLabels: [],
        provenance: { source: 'test', chain: [], confidence: 1 },
        createdAt: now,
      });

      await service.ingestTimeEvent({
        id: uuidv4(),
        entityId: 'nyc-2',
        timestamp: now,
        location: { latitude: 40.7484, longitude: -73.9857 },
        eventType: 'observation',
        attributes: {},
        tenantId: 'tenant-1',
        policyLabels: [],
        provenance: { source: 'test', chain: [], confidence: 1 },
        createdAt: now,
      });

      // Entity in LA
      await service.ingestTimeEvent({
        id: uuidv4(),
        entityId: 'la-1',
        timestamp: now,
        location: { latitude: 34.0522, longitude: -118.2437 },
        eventType: 'observation',
        attributes: {},
        tenantId: 'tenant-1',
        policyLabels: [],
        provenance: { source: 'test', chain: [], confidence: 1 },
        createdAt: now,
      });
    });

    it('finds entities in region', () => {
      const results = service.findEntitiesInRegion({
        shape: {
          type: 'Polygon',
          coordinates: [
            [
              [-75, 40],
              [-73, 40],
              [-73, 41],
              [-75, 41],
              [-75, 40],
            ],
          ],
        },
        limit: 100,
        offset: 0,
        context: defaultContext,
      });

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.entityId).sort()).toEqual(['nyc-1', 'nyc-2']);
    });

    it('counts entities in region', () => {
      const count = service.countEntitiesInRegion({
        shape: {
          type: 'Polygon',
          coordinates: [
            [
              [-75, 40],
              [-73, 40],
              [-73, 41],
              [-75, 41],
              [-75, 40],
            ],
          ],
        },
        limit: 100,
        offset: 0,
        context: defaultContext,
      });

      expect(count).toBe(2);
    });
  });

  describe('getTrajectory', () => {
    beforeEach(async () => {
      const now = Date.now();

      // Create a trajectory for entity
      for (let i = 0; i < 10; i++) {
        await service.ingestTimeEvent({
          id: uuidv4(),
          entityId: 'moving-entity',
          timestamp: now - (10 - i) * 60000,
          location: {
            latitude: 40.7128 + i * 0.01,
            longitude: -74.006 + i * 0.01,
          },
          eventType: 'observation',
          attributes: {},
          tenantId: 'tenant-1',
          policyLabels: [],
          provenance: { source: 'test', chain: [], confidence: 1 },
          createdAt: now,
        });
      }
    });

    it('reconstructs trajectory', () => {
      const now = Date.now();
      const trajectory = service.getTrajectory({
        entityId: 'moving-entity',
        timeRange: { start: now - 600000, end: now },
        includeSpeed: true,
        includeHeading: true,
        context: defaultContext,
      });

      expect(trajectory).not.toBeNull();
      expect(trajectory!.points.length).toBe(10);
      expect(trajectory!.entityId).toBe('moving-entity');
      expect(trajectory!.totalDistance).toBeGreaterThan(0);
    });

    it('returns null for non-existent entity', () => {
      const now = Date.now();
      const trajectory = service.getTrajectory({
        entityId: 'non-existent',
        timeRange: { start: now - 600000, end: now },
        includeSpeed: true,
        includeHeading: true,
        context: defaultContext,
      });

      expect(trajectory).toBeNull();
    });
  });

  describe('detectDwell', () => {
    beforeEach(async () => {
      const now = Date.now();

      // Create dwell pattern - entity stays in same location
      for (let i = 0; i < 10; i++) {
        await service.ingestTimeEvent({
          id: uuidv4(),
          entityId: 'dwelling-entity',
          timestamp: now - (10 - i) * 60000,
          location: {
            latitude: 40.7128 + (Math.random() - 0.5) * 0.0001, // Small random variation
            longitude: -74.006 + (Math.random() - 0.5) * 0.0001,
          },
          eventType: 'observation',
          attributes: {},
          tenantId: 'tenant-1',
          policyLabels: [],
          provenance: { source: 'test', chain: [], confidence: 1 },
          createdAt: now,
        });
      }
    });

    it('detects dwell episodes', () => {
      const now = Date.now();
      const episodes = service.detectDwell({
        entityId: 'dwelling-entity',
        area: {
          type: 'Polygon',
          coordinates: [
            [
              [-74.01, 40.71],
              [-74.0, 40.71],
              [-74.0, 40.72],
              [-74.01, 40.72],
              [-74.01, 40.71],
            ],
          ],
        },
        minDuration: 60000, // 1 minute
        timeRange: { start: now - 600000, end: now },
        maxGapDuration: 120000,
        context: defaultContext,
      });

      expect(episodes.length).toBeGreaterThan(0);
      expect(episodes[0].entityId).toBe('dwelling-entity');
      expect(episodes[0].duration).toBeGreaterThanOrEqual(60000);
    });

    it('emits derived events for dwell', () => {
      const now = Date.now();
      service.detectDwell({
        entityId: 'dwelling-entity',
        area: {
          type: 'Polygon',
          coordinates: [
            [
              [-74.01, 40.71],
              [-74.0, 40.71],
              [-74.0, 40.72],
              [-74.01, 40.72],
              [-74.01, 40.71],
            ],
          ],
        },
        minDuration: 60000,
        timeRange: { start: now - 600000, end: now },
        maxGapDuration: 120000,
        context: defaultContext,
      });

      const dwellEvents = emittedEvents.filter((e) => e.type === 'dwell');
      expect(dwellEvents.length).toBeGreaterThan(0);
    });
  });

  describe('getSpacetimeSummary', () => {
    beforeEach(async () => {
      const now = Date.now();

      // Create observation history
      for (let i = 0; i < 20; i++) {
        await service.ingestTimeEvent({
          id: uuidv4(),
          entityId: 'summary-entity',
          timestamp: now - (20 - i) * 60000,
          location: {
            latitude: 40.7128 + (i % 5) * 0.01,
            longitude: -74.006 + (i % 3) * 0.01,
          },
          eventType: 'observation',
          attributes: {},
          tenantId: 'tenant-1',
          policyLabels: [],
          provenance: { source: 'test', chain: [], confidence: 1 },
          createdAt: now,
        });
      }
    });

    it('generates spacetime summary', () => {
      const now = Date.now();
      const summary = service.getSpacetimeSummary(
        'summary-entity',
        { start: now - 1200000, end: now },
        defaultContext,
      );

      expect(summary.entityId).toBe('summary-entity');
      expect(summary.statistics.totalObservations).toBe(20);
      expect(summary.statistics.uniqueLocations).toBeGreaterThan(1);
      expect(summary.statistics.totalDistance).toBeGreaterThan(0);
      expect(summary.boundingBox).toBeDefined();
    });
  });

  describe('Query Guards', () => {
    it('rejects query with excessive time span', () => {
      const now = Date.now();
      const twoYearsMs = 2 * 365 * 24 * 60 * 60 * 1000;

      expect(() =>
        service.findCoPresence({
          entityIds: ['entity-1', 'entity-2'],
          timeWindow: { start: now - twoYearsMs, end: now },
          radius: 100,
          minOverlapDuration: 0,
          minConfidence: 0,
          context: defaultContext,
        }),
      ).toThrow(/exceeds/i);
    });

    it('rejects query with invalid radius', () => {
      const now = Date.now();

      expect(() =>
        service.findCoPresence({
          entityIds: ['entity-1', 'entity-2'],
          timeWindow: { start: now - 3600000, end: now },
          radius: -100,
          minOverlapDuration: 0,
          minConfidence: 0,
          context: defaultContext,
        }),
      ).toThrow(/positive/i);
    });
  });

  describe('Policy Filtering', () => {
    beforeEach(async () => {
      const now = Date.now();

      // Entity with policy labels
      await service.ingestTimeEvent({
        id: uuidv4(),
        entityId: 'classified-entity',
        timestamp: now,
        location: { latitude: 40.7128, longitude: -74.006 },
        eventType: 'observation',
        attributes: {},
        tenantId: 'tenant-1',
        policyLabels: ['SECRET'],
        provenance: { source: 'test', chain: [], confidence: 1 },
        createdAt: now,
      });

      // Entity without policy labels
      await service.ingestTimeEvent({
        id: uuidv4(),
        entityId: 'public-entity',
        timestamp: now,
        location: { latitude: 40.7128, longitude: -74.006 },
        eventType: 'observation',
        attributes: {},
        tenantId: 'tenant-1',
        policyLabels: [],
        provenance: { source: 'test', chain: [], confidence: 1 },
        createdAt: now,
      });
    });

    it('filters by tenant', () => {
      const results = service.findEntitiesInRegion({
        shape: {
          type: 'Polygon',
          coordinates: [
            [
              [-75, 40],
              [-73, 40],
              [-73, 41],
              [-75, 41],
              [-75, 40],
            ],
          ],
        },
        limit: 100,
        offset: 0,
        context: { tenantId: 'other-tenant', policyLabels: [] },
      });

      expect(results).toHaveLength(0);
    });

    it('filters by policy labels', () => {
      const results = service.findEntitiesInRegion({
        shape: {
          type: 'Polygon',
          coordinates: [
            [
              [-75, 40],
              [-73, 40],
              [-73, 41],
              [-75, 41],
              [-75, 40],
            ],
          ],
        },
        limit: 100,
        offset: 0,
        context: { tenantId: 'tenant-1', policyLabels: ['SECRET'] },
      });

      expect(results).toHaveLength(1);
      expect(results[0].entityId).toBe('classified-entity');
    });
  });

  describe('Index Management', () => {
    it('reports index statistics', async () => {
      const now = Date.now();

      await service.ingestTimeEvent({
        id: uuidv4(),
        entityId: 'entity-1',
        timestamp: now,
        location: { latitude: 40.7128, longitude: -74.006 },
        eventType: 'observation',
        attributes: {},
        tenantId: 'tenant-1',
        policyLabels: [],
        provenance: { source: 'test', chain: [], confidence: 1 },
        createdAt: now,
      });

      const stats = service.getIndexStats();

      expect(stats.entryCount).toBe(1);
      expect(stats.entityCount).toBe(1);
      expect(stats.timeBounds).not.toBeNull();
      expect(stats.spatialBounds).not.toBeNull();
    });

    it('clears index', async () => {
      const now = Date.now();

      await service.ingestTimeEvent({
        id: uuidv4(),
        entityId: 'entity-1',
        timestamp: now,
        location: { latitude: 40.7128, longitude: -74.006 },
        eventType: 'observation',
        attributes: {},
        tenantId: 'tenant-1',
        policyLabels: [],
        provenance: { source: 'test', chain: [], confidence: 1 },
        createdAt: now,
      });

      service.clear();

      const stats = service.getIndexStats();
      expect(stats.entryCount).toBe(0);
    });

    it('tracks query log', async () => {
      const now = Date.now();

      await service.ingestTimeEvent({
        id: uuidv4(),
        entityId: 'entity-1',
        timestamp: now,
        location: { latitude: 40.7128, longitude: -74.006 },
        eventType: 'observation',
        attributes: {},
        tenantId: 'tenant-1',
        policyLabels: [],
        provenance: { source: 'test', chain: [], confidence: 1 },
        createdAt: now,
      });

      service.findEntitiesInRegion({
        shape: {
          type: 'Polygon',
          coordinates: [
            [
              [-75, 40],
              [-73, 40],
              [-73, 41],
              [-75, 41],
              [-75, 40],
            ],
          ],
        },
        limit: 100,
        offset: 0,
        context: defaultContext,
      });

      const log = service.getQueryLog();
      expect(log.length).toBeGreaterThan(0);
      expect(log[0].type).toBe('findEntitiesInRegion');
    });
  });
});
