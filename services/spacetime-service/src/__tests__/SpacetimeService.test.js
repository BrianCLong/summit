"use strict";
/**
 * Integration tests for SpacetimeService
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const uuid_1 = require("uuid");
const SpacetimeService_js_1 = require("../services/SpacetimeService.js");
(0, globals_1.describe)('SpacetimeService', () => {
    let service;
    let emittedEvents;
    const defaultContext = {
        tenantId: 'tenant-1',
        policyLabels: [],
    };
    (0, globals_1.beforeEach)(() => {
        emittedEvents = [];
        const emitter = {
            emit: (event) => emittedEvents.push(event),
        };
        service = (0, SpacetimeService_js_1.createSpacetimeService)(undefined, undefined, emitter);
    });
    (0, globals_1.describe)('Data Ingestion', () => {
        (0, globals_1.it)('ingests time events', async () => {
            const event = {
                id: (0, uuid_1.v4)(),
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
            (0, globals_1.expect)(stats.entryCount).toBe(1);
        });
        (0, globals_1.it)('ingests intervals', async () => {
            const interval = {
                id: (0, uuid_1.v4)(),
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
            (0, globals_1.expect)(stats.entryCount).toBe(1);
        });
        (0, globals_1.it)('ingests geo points', async () => {
            const point = {
                id: (0, uuid_1.v4)(),
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
            (0, globals_1.expect)(stats.entryCount).toBe(1);
        });
        (0, globals_1.it)('ingests trajectories', async () => {
            const trajectory = {
                id: (0, uuid_1.v4)(),
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
            (0, globals_1.expect)(stats.entryCount).toBe(3); // One entry per point
        });
    });
    (0, globals_1.describe)('findCoPresence', () => {
        (0, globals_1.beforeEach)(async () => {
            const now = Date.now();
            // Entity 1 and 2 are near each other at same time
            for (let i = 0; i < 5; i++) {
                await service.ingestTimeEvent({
                    id: (0, uuid_1.v4)(),
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
                    id: (0, uuid_1.v4)(),
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
                id: (0, uuid_1.v4)(),
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
        (0, globals_1.it)('finds co-presence episodes', () => {
            const now = Date.now();
            const episodes = service.findCoPresence({
                entityIds: ['entity-1', 'entity-2'],
                timeWindow: { start: now - 300000, end: now },
                radius: 100, // 100m
                minOverlapDuration: 0,
                minConfidence: 0,
                context: defaultContext,
            });
            (0, globals_1.expect)(episodes.length).toBeGreaterThan(0);
            (0, globals_1.expect)(episodes[0].entityIds).toContain('entity-1');
            (0, globals_1.expect)(episodes[0].entityIds).toContain('entity-2');
        });
        (0, globals_1.it)('does not find co-presence for distant entities', () => {
            const now = Date.now();
            const episodes = service.findCoPresence({
                entityIds: ['entity-1', 'entity-3'],
                timeWindow: { start: now - 300000, end: now },
                radius: 100,
                minOverlapDuration: 0,
                minConfidence: 0,
                context: defaultContext,
            });
            (0, globals_1.expect)(episodes).toHaveLength(0);
        });
        (0, globals_1.it)('emits derived events for co-presence', () => {
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
            (0, globals_1.expect)(coPresenceEvents.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('findEntitiesInRegion', () => {
        (0, globals_1.beforeEach)(async () => {
            const now = Date.now();
            // Entities in NYC
            await service.ingestTimeEvent({
                id: (0, uuid_1.v4)(),
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
                id: (0, uuid_1.v4)(),
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
                id: (0, uuid_1.v4)(),
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
        (0, globals_1.it)('finds entities in region', () => {
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
            (0, globals_1.expect)(results).toHaveLength(2);
            (0, globals_1.expect)(results.map((r) => r.entityId).sort()).toEqual(['nyc-1', 'nyc-2']);
        });
        (0, globals_1.it)('counts entities in region', () => {
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
            (0, globals_1.expect)(count).toBe(2);
        });
    });
    (0, globals_1.describe)('getTrajectory', () => {
        (0, globals_1.beforeEach)(async () => {
            const now = Date.now();
            // Create a trajectory for entity
            for (let i = 0; i < 10; i++) {
                await service.ingestTimeEvent({
                    id: (0, uuid_1.v4)(),
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
        (0, globals_1.it)('reconstructs trajectory', () => {
            const now = Date.now();
            const trajectory = service.getTrajectory({
                entityId: 'moving-entity',
                timeRange: { start: now - 600000, end: now },
                includeSpeed: true,
                includeHeading: true,
                context: defaultContext,
            });
            (0, globals_1.expect)(trajectory).not.toBeNull();
            (0, globals_1.expect)(trajectory.points.length).toBe(10);
            (0, globals_1.expect)(trajectory.entityId).toBe('moving-entity');
            (0, globals_1.expect)(trajectory.totalDistance).toBeGreaterThan(0);
        });
        (0, globals_1.it)('returns null for non-existent entity', () => {
            const now = Date.now();
            const trajectory = service.getTrajectory({
                entityId: 'non-existent',
                timeRange: { start: now - 600000, end: now },
                includeSpeed: true,
                includeHeading: true,
                context: defaultContext,
            });
            (0, globals_1.expect)(trajectory).toBeNull();
        });
    });
    (0, globals_1.describe)('detectDwell', () => {
        (0, globals_1.beforeEach)(async () => {
            const now = Date.now();
            // Create dwell pattern - entity stays in same location
            for (let i = 0; i < 10; i++) {
                await service.ingestTimeEvent({
                    id: (0, uuid_1.v4)(),
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
        (0, globals_1.it)('detects dwell episodes', () => {
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
            (0, globals_1.expect)(episodes.length).toBeGreaterThan(0);
            (0, globals_1.expect)(episodes[0].entityId).toBe('dwelling-entity');
            (0, globals_1.expect)(episodes[0].duration).toBeGreaterThanOrEqual(60000);
        });
        (0, globals_1.it)('emits derived events for dwell', () => {
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
            (0, globals_1.expect)(dwellEvents.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('getSpacetimeSummary', () => {
        (0, globals_1.beforeEach)(async () => {
            const now = Date.now();
            // Create observation history
            for (let i = 0; i < 20; i++) {
                await service.ingestTimeEvent({
                    id: (0, uuid_1.v4)(),
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
        (0, globals_1.it)('generates spacetime summary', () => {
            const now = Date.now();
            const summary = service.getSpacetimeSummary('summary-entity', { start: now - 1200000, end: now }, defaultContext);
            (0, globals_1.expect)(summary.entityId).toBe('summary-entity');
            (0, globals_1.expect)(summary.statistics.totalObservations).toBe(20);
            (0, globals_1.expect)(summary.statistics.uniqueLocations).toBeGreaterThan(1);
            (0, globals_1.expect)(summary.statistics.totalDistance).toBeGreaterThan(0);
            (0, globals_1.expect)(summary.boundingBox).toBeDefined();
        });
    });
    (0, globals_1.describe)('Query Guards', () => {
        (0, globals_1.it)('rejects query with excessive time span', () => {
            const now = Date.now();
            const twoYearsMs = 2 * 365 * 24 * 60 * 60 * 1000;
            (0, globals_1.expect)(() => service.findCoPresence({
                entityIds: ['entity-1', 'entity-2'],
                timeWindow: { start: now - twoYearsMs, end: now },
                radius: 100,
                minOverlapDuration: 0,
                minConfidence: 0,
                context: defaultContext,
            })).toThrow(/exceeds/i);
        });
        (0, globals_1.it)('rejects query with invalid radius', () => {
            const now = Date.now();
            (0, globals_1.expect)(() => service.findCoPresence({
                entityIds: ['entity-1', 'entity-2'],
                timeWindow: { start: now - 3600000, end: now },
                radius: -100,
                minOverlapDuration: 0,
                minConfidence: 0,
                context: defaultContext,
            })).toThrow(/positive/i);
        });
    });
    (0, globals_1.describe)('Policy Filtering', () => {
        (0, globals_1.beforeEach)(async () => {
            const now = Date.now();
            // Entity with policy labels
            await service.ingestTimeEvent({
                id: (0, uuid_1.v4)(),
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
                id: (0, uuid_1.v4)(),
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
        (0, globals_1.it)('filters by tenant', () => {
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
            (0, globals_1.expect)(results).toHaveLength(0);
        });
        (0, globals_1.it)('filters by policy labels', () => {
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
            (0, globals_1.expect)(results).toHaveLength(1);
            (0, globals_1.expect)(results[0].entityId).toBe('classified-entity');
        });
    });
    (0, globals_1.describe)('Index Management', () => {
        (0, globals_1.it)('reports index statistics', async () => {
            const now = Date.now();
            await service.ingestTimeEvent({
                id: (0, uuid_1.v4)(),
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
            (0, globals_1.expect)(stats.entryCount).toBe(1);
            (0, globals_1.expect)(stats.entityCount).toBe(1);
            (0, globals_1.expect)(stats.timeBounds).not.toBeNull();
            (0, globals_1.expect)(stats.spatialBounds).not.toBeNull();
        });
        (0, globals_1.it)('clears index', async () => {
            const now = Date.now();
            await service.ingestTimeEvent({
                id: (0, uuid_1.v4)(),
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
            (0, globals_1.expect)(stats.entryCount).toBe(0);
        });
        (0, globals_1.it)('tracks query log', async () => {
            const now = Date.now();
            await service.ingestTimeEvent({
                id: (0, uuid_1.v4)(),
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
            (0, globals_1.expect)(log.length).toBeGreaterThan(0);
            (0, globals_1.expect)(log[0].type).toBe('findEntitiesInRegion');
        });
    });
});
