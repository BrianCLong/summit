/**
 * Redis Alert Cache Tests
 *
 * Tests alert caching, pub/sub, and p95 latency requirements.
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { AlertCache, IntelAlert } from '../src/index.js';

describe('Redis Alert Cache', () => {
  let alertCache: AlertCache;
  let isConnected = false;

  beforeAll(async () => {
    alertCache = new AlertCache({
      redisHost: process.env.REDIS_HOST || 'localhost',
      redisPort: parseInt(process.env.REDIS_PORT || '6379'),
      keyPrefix: 'test:intel:alerts:',
      alertTtlSeconds: 60,
      p95TargetMs: 2000,
    });

    try {
      await alertCache.connect();
      isConnected = true;
    } catch {
      console.warn('Redis not available, skipping connection-dependent tests');
    }
  });

  afterAll(async () => {
    if (isConnected) {
      await alertCache.close();
    }
  });

  describe('Alert Creation', () => {
    it('should create alert from signal data', () => {
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
            source: 'GPS' as const,
          },
        ],
      };

      const alert = alertCache.createSignalAlert(
        mockSignal as any,
        'NEW_SIGNAL',
        'HIGH',
        'Test Signal Detected',
        'Test description',
      );

      expect(alert.id).toBeDefined();
      expect(alert.type).toBe('NEW_SIGNAL');
      expect(alert.priority).toBe('HIGH');
      expect(alert.source).toBe('SIGINT');
      expect(alert.relatedSignalIds).toContain('sig-001');
      expect(alert.acknowledged).toBe(false);
    });

    it('should create alert from track data', () => {
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
            source: 'RADAR' as const,
          },
          velocityMps: { x: 100, y: 50, z: 0 },
          headingDeg: 45,
          speedMps: 112,
        },
      };

      const alert = alertCache.createTrackAlert(
        mockTrack as any,
        'NEW_TRACK',
        'MEDIUM',
        'Test Track Detected',
        'Test track description',
      );

      expect(alert.id).toBeDefined();
      expect(alert.type).toBe('NEW_TRACK');
      expect(alert.source).toBe('MASINT');
      expect(alert.relatedTrackIds).toContain('track-001');
    });
  });

  describe('Alert Publishing (requires Redis)', () => {
    it('should publish alert with latency tracking', async () => {
      if (!isConnected) {
        console.log('Skipping: Redis not connected');
        return;
      }

      const alert: IntelAlert = {
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

      expect(result.success).toBe(true);
      expect(result.latencyMs).toBeLessThan(2000); // p95 target
    });

    it('should meet p95 latency requirement across multiple alerts', async () => {
      if (!isConnected) {
        console.log('Skipping: Redis not connected');
        return;
      }

      const latencies: number[] = [];

      for (let i = 0; i < 20; i++) {
        const alert: IntelAlert = {
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

      expect(p95Latency).toBeLessThan(2000);
    });
  });

  describe('Alert Retrieval (requires Redis)', () => {
    it('should retrieve alert by ID', async () => {
      if (!isConnected) {
        console.log('Skipping: Redis not connected');
        return;
      }

      const alert: IntelAlert = {
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

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(alert.id);
      expect(retrieved?.type).toBe('THREAT_DETECTED');
    });

    it('should retrieve alerts by type', async () => {
      if (!isConnected) {
        console.log('Skipping: Redis not connected');
        return;
      }

      const alerts = await alertCache.getAlertsByType('NEW_SIGNAL', 10);

      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should retrieve alerts by priority', async () => {
      if (!isConnected) {
        console.log('Skipping: Redis not connected');
        return;
      }

      const alerts = await alertCache.getAlertsByPriority('HIGH', 10);

      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should get recent alerts', async () => {
      if (!isConnected) {
        console.log('Skipping: Redis not connected');
        return;
      }

      const alerts = await alertCache.getRecentAlerts(50);

      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('Alert Acknowledgment (requires Redis)', () => {
    it('should acknowledge alert', async () => {
      if (!isConnected) {
        console.log('Skipping: Redis not connected');
        return;
      }

      const alert: IntelAlert = {
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

      expect(acked).toBe(true);

      const retrieved = await alertCache.getAlert(alert.id);
      expect(retrieved?.acknowledged).toBe(true);
      expect(retrieved?.acknowledgedBy).toBe('test-user');
    });
  });

  describe('Metrics and Statistics', () => {
    it('should provide performance metrics', () => {
      const metrics = alertCache.getMetrics();

      expect(metrics).toHaveProperty('totalAlerts');
      expect(metrics).toHaveProperty('alertsByType');
      expect(metrics).toHaveProperty('p50Latency');
      expect(metrics).toHaveProperty('p95Latency');
      expect(metrics).toHaveProperty('cacheHitRate');
    });

    it('should check p95 target status', () => {
      const isMet = alertCache.isP95TargetMet();

      expect(typeof isMet).toBe('boolean');
    });

    it('should get statistics (requires Redis)', async () => {
      if (!isConnected) {
        console.log('Skipping: Redis not connected');
        return;
      }

      const stats = await alertCache.getStatistics();

      expect(stats).toHaveProperty('totalByType');
      expect(stats).toHaveProperty('totalByPriority');
      expect(stats).toHaveProperty('recentCount');
      expect(stats).toHaveProperty('unacknowledgedCount');
    });
  });

  describe('Health Check', () => {
    it('should report health status', async () => {
      const health = await alertCache.healthCheck();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('p95Met');

      if (isConnected) {
        expect(health.status).toBe('healthy');
      }
    });
  });
});
