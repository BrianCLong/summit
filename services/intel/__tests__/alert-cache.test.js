"use strict";
/**
 * Redis Alert Cache Tests
 *
 * Tests alert caching, pub/sub, and p95 latency requirements.
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const index_js_1 = require("../src/index.js");
(0, globals_1.describe)('Redis Alert Cache', () => {
    let alertCache;
    let isConnected = false;
    (0, globals_1.beforeAll)(async () => {
        alertCache = new index_js_1.AlertCache({
            redisHost: process.env.REDIS_HOST || 'localhost',
            redisPort: parseInt(process.env.REDIS_PORT || '6379'),
            keyPrefix: 'test:intel:alerts:',
            alertTtlSeconds: 60,
            p95TargetMs: 2000,
        });
        try {
            await alertCache.connect();
            isConnected = true;
        }
        catch {
            console.warn('Redis not available, skipping connection-dependent tests');
        }
    });
    (0, globals_1.afterAll)(async () => {
        if (isConnected) {
            await alertCache.close();
        }
    });
    (0, globals_1.describe)('Alert Creation', () => {
        (0, globals_1.it)('should create alert from signal data', () => {
            const mockSignal = {
                id: 'sig-001',
                correlatedEntities: ['entity-1'],
                odniGapReferences: ['ODNI-2025-001'],
                detectionLocations: [
                    {
                        latitude: 38.8977,
                        longitude: -77.0365,
                        accuracyM: 100,
                        timestamp: new Date(),
                        source: 'GPS',
                    },
                ],
            };
            const alert = alertCache.createSignalAlert(mockSignal, 'NEW_SIGNAL', 'HIGH', 'Test Signal Detected', 'Test description');
            (0, globals_1.expect)(alert.id).toBeDefined();
            (0, globals_1.expect)(alert.type).toBe('NEW_SIGNAL');
            (0, globals_1.expect)(alert.priority).toBe('HIGH');
            (0, globals_1.expect)(alert.source).toBe('SIGINT');
            (0, globals_1.expect)(alert.relatedSignalIds).toContain('sig-001');
            (0, globals_1.expect)(alert.acknowledged).toBe(false);
        });
        (0, globals_1.it)('should create alert from track data', () => {
            const mockTrack = {
                id: 'track-001',
                correlatedEntities: ['entity-2'],
                associatedSignals: ['sig-001'],
                kinematicState: {
                    position: {
                        latitude: 40.0,
                        longitude: -74.0,
                        accuracyM: 50,
                        timestamp: new Date(),
                        source: 'RADAR',
                    },
                    velocityMps: { x: 100, y: 50, z: 0 },
                    headingDeg: 45,
                    speedMps: 112,
                },
            };
            const alert = alertCache.createTrackAlert(mockTrack, 'NEW_TRACK', 'MEDIUM', 'Test Track Detected', 'Test track description');
            (0, globals_1.expect)(alert.id).toBeDefined();
            (0, globals_1.expect)(alert.type).toBe('NEW_TRACK');
            (0, globals_1.expect)(alert.source).toBe('MASINT');
            (0, globals_1.expect)(alert.relatedTrackIds).toContain('track-001');
        });
    });
    (0, globals_1.describe)('Alert Publishing (requires Redis)', () => {
        (0, globals_1.it)('should publish alert with latency tracking', async () => {
            if (!isConnected) {
                console.log('Skipping: Redis not connected');
                return;
            }
            const alert = {
                id: `test-${Date.now()}`,
                type: 'NEW_SIGNAL',
                priority: 'HIGH',
                title: 'Test Alert',
                description: 'Test alert for latency measurement',
                source: 'SIGINT',
                relatedEntityIds: [],
                relatedSignalIds: ['test-sig'],
                relatedTrackIds: [],
                odniGapReferences: [],
                timestamp: new Date(),
                acknowledged: false,
            };
            const result = await alertCache.publishAlert(alert);
            (0, globals_1.expect)(result.success).toBe(true);
            (0, globals_1.expect)(result.latencyMs).toBeLessThan(2000); // p95 target
        });
        (0, globals_1.it)('should meet p95 latency requirement across multiple alerts', async () => {
            if (!isConnected) {
                console.log('Skipping: Redis not connected');
                return;
            }
            const latencies = [];
            for (let i = 0; i < 20; i++) {
                const alert = {
                    id: `perf-test-${Date.now()}-${i}`,
                    type: 'NEW_SIGNAL',
                    priority: 'MEDIUM',
                    title: `Performance Test ${i}`,
                    description: 'Testing p95 latency requirement',
                    source: 'SIGINT',
                    relatedEntityIds: [],
                    relatedSignalIds: [],
                    relatedTrackIds: [],
                    odniGapReferences: [],
                    timestamp: new Date(),
                    acknowledged: false,
                };
                const result = await alertCache.publishAlert(alert);
                latencies.push(result.latencyMs);
            }
            // Calculate p95
            const sorted = [...latencies].sort((a, b) => a - b);
            const p95Index = Math.floor(sorted.length * 0.95);
            const p95Latency = sorted[p95Index];
            (0, globals_1.expect)(p95Latency).toBeLessThan(2000);
        });
    });
    (0, globals_1.describe)('Alert Retrieval (requires Redis)', () => {
        (0, globals_1.it)('should retrieve alert by ID', async () => {
            if (!isConnected) {
                console.log('Skipping: Redis not connected');
                return;
            }
            const alert = {
                id: `retrieve-test-${Date.now()}`,
                type: 'THREAT_DETECTED',
                priority: 'CRITICAL',
                title: 'Retrieve Test',
                description: 'Test retrieval',
                source: 'FUSION',
                relatedEntityIds: [],
                relatedSignalIds: [],
                relatedTrackIds: [],
                odniGapReferences: [],
                timestamp: new Date(),
                acknowledged: false,
            };
            await alertCache.publishAlert(alert);
            const retrieved = await alertCache.getAlert(alert.id);
            (0, globals_1.expect)(retrieved).toBeDefined();
            (0, globals_1.expect)(retrieved?.id).toBe(alert.id);
            (0, globals_1.expect)(retrieved?.type).toBe('THREAT_DETECTED');
        });
        (0, globals_1.it)('should retrieve alerts by type', async () => {
            if (!isConnected) {
                console.log('Skipping: Redis not connected');
                return;
            }
            const alerts = await alertCache.getAlertsByType('NEW_SIGNAL', 10);
            (0, globals_1.expect)(Array.isArray(alerts)).toBe(true);
        });
        (0, globals_1.it)('should retrieve alerts by priority', async () => {
            if (!isConnected) {
                console.log('Skipping: Redis not connected');
                return;
            }
            const alerts = await alertCache.getAlertsByPriority('HIGH', 10);
            (0, globals_1.expect)(Array.isArray(alerts)).toBe(true);
        });
        (0, globals_1.it)('should get recent alerts', async () => {
            if (!isConnected) {
                console.log('Skipping: Redis not connected');
                return;
            }
            const alerts = await alertCache.getRecentAlerts(50);
            (0, globals_1.expect)(Array.isArray(alerts)).toBe(true);
        });
    });
    (0, globals_1.describe)('Alert Acknowledgment (requires Redis)', () => {
        (0, globals_1.it)('should acknowledge alert', async () => {
            if (!isConnected) {
                console.log('Skipping: Redis not connected');
                return;
            }
            const alert = {
                id: `ack-test-${Date.now()}`,
                type: 'PATTERN_MATCH',
                priority: 'MEDIUM',
                title: 'Ack Test',
                description: 'Test acknowledgment',
                source: 'FUSION',
                relatedEntityIds: [],
                relatedSignalIds: [],
                relatedTrackIds: [],
                odniGapReferences: [],
                timestamp: new Date(),
                acknowledged: false,
            };
            await alertCache.publishAlert(alert);
            const acked = await alertCache.acknowledgeAlert(alert.id, 'test-user');
            (0, globals_1.expect)(acked).toBe(true);
            const retrieved = await alertCache.getAlert(alert.id);
            (0, globals_1.expect)(retrieved?.acknowledged).toBe(true);
            (0, globals_1.expect)(retrieved?.acknowledgedBy).toBe('test-user');
        });
    });
    (0, globals_1.describe)('Metrics and Statistics', () => {
        (0, globals_1.it)('should provide performance metrics', () => {
            const metrics = alertCache.getMetrics();
            (0, globals_1.expect)(metrics).toHaveProperty('totalAlerts');
            (0, globals_1.expect)(metrics).toHaveProperty('alertsByType');
            (0, globals_1.expect)(metrics).toHaveProperty('p50Latency');
            (0, globals_1.expect)(metrics).toHaveProperty('p95Latency');
            (0, globals_1.expect)(metrics).toHaveProperty('cacheHitRate');
        });
        (0, globals_1.it)('should check p95 target status', () => {
            const isMet = alertCache.isP95TargetMet();
            (0, globals_1.expect)(typeof isMet).toBe('boolean');
        });
        (0, globals_1.it)('should get statistics (requires Redis)', async () => {
            if (!isConnected) {
                console.log('Skipping: Redis not connected');
                return;
            }
            const stats = await alertCache.getStatistics();
            (0, globals_1.expect)(stats).toHaveProperty('totalByType');
            (0, globals_1.expect)(stats).toHaveProperty('totalByPriority');
            (0, globals_1.expect)(stats).toHaveProperty('recentCount');
            (0, globals_1.expect)(stats).toHaveProperty('unacknowledgedCount');
        });
    });
    (0, globals_1.describe)('Health Check', () => {
        (0, globals_1.it)('should report health status', async () => {
            const health = await alertCache.healthCheck();
            (0, globals_1.expect)(health).toHaveProperty('status');
            (0, globals_1.expect)(health).toHaveProperty('p95Met');
            if (isConnected) {
                (0, globals_1.expect)(health.status).toBe('healthy');
            }
        });
    });
});
