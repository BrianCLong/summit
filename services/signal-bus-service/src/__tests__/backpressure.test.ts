/**
 * Backpressure Handler Tests
 */

import pino from 'pino';

import { createBackpressureHandler } from '../backpressure/backpressure-handler.js';
import type { ProcessingSignal } from '../types.js';

describe('BackpressureHandler', () => {
  const logger = pino({ level: 'silent' });

  const createMockSignal = (id: string): ProcessingSignal => ({
    envelope: {
      metadata: {
        signalId: id,
        signalType: 'sensor.geolocation',
        timestamp: Date.now(),
        receivedAt: Date.now(),
        tenantId: 'tenant-123',
        source: { sourceId: 'device-1', sourceType: 'device' },
        envelopeVersion: '1.0.0',
        quality: 'unknown',
        policyLabels: [],
        tags: [],
      },
      payload: {},
      provenance: { chain: [] },
    },
    status: 'pending',
    attempts: 0,
    firstAttemptAt: Date.now(),
    lastAttemptAt: Date.now(),
    partition: 0,
    offset: '0',
  });

  describe('enqueue and dequeue', () => {
    it('should enqueue and dequeue signals', async () => {
      const handler = createBackpressureHandler(logger, {
        maxQueueSize: 100,
        spillToDisk: false,
      });

      const signal = createMockSignal('signal-1');
      await handler.enqueue(signal);

      const dequeued = await handler.dequeue(1);
      expect(dequeued).toHaveLength(1);
      expect(dequeued[0].envelope.metadata.signalId).toBe('signal-1');

      await handler.shutdown();
    });

    it('should respect maxCount in dequeue', async () => {
      const handler = createBackpressureHandler(logger, {
        maxQueueSize: 100,
        spillToDisk: false,
      });

      for (let i = 0; i < 10; i++) {
        await handler.enqueue(createMockSignal(`signal-${i}`));
      }

      const dequeued = await handler.dequeue(5);
      expect(dequeued).toHaveLength(5);

      await handler.shutdown();
    });
  });

  describe('batch operations', () => {
    it('should enqueue batch of signals', async () => {
      const handler = createBackpressureHandler(logger, {
        maxQueueSize: 100,
        spillToDisk: false,
      });

      const signals = Array.from({ length: 10 }, (_, i) => createMockSignal(`signal-${i}`));
      const result = await handler.enqueueBatch(signals);

      expect(result.enqueued).toBe(10);
      expect(result.spilled).toBe(0);
      expect(result.dropped).toBe(0);

      await handler.shutdown();
    });

    it('should report dropped signals when queue is full', async () => {
      const handler = createBackpressureHandler(logger, {
        maxQueueSize: 5,
        spillToDisk: false,
      });

      const signals = Array.from({ length: 10 }, (_, i) => createMockSignal(`signal-${i}`));
      const result = await handler.enqueueBatch(signals);

      expect(result.enqueued).toBe(5);
      expect(result.dropped).toBe(5);

      await handler.shutdown();
    });
  });

  describe('water marks', () => {
    it('should emit highWaterMark event when threshold reached', async () => {
      const handler = createBackpressureHandler(logger, {
        maxQueueSize: 100,
        highWaterMark: 5,
        lowWaterMark: 2,
        spillToDisk: false,
      });

      let highWaterMarkEmitted = false;
      handler.on('highWaterMark', () => {
        highWaterMarkEmitted = true;
      });

      const signals = Array.from({ length: 6 }, (_, i) => createMockSignal(`signal-${i}`));
      await handler.enqueueBatch(signals);

      expect(highWaterMarkEmitted).toBe(true);

      await handler.shutdown();
    });

    it('should emit lowWaterMark event when threshold reached', async () => {
      const handler = createBackpressureHandler(logger, {
        maxQueueSize: 100,
        highWaterMark: 5,
        lowWaterMark: 2,
        spillToDisk: false,
      });

      let lowWaterMarkEmitted = false;
      handler.on('lowWaterMark', () => {
        lowWaterMarkEmitted = true;
      });

      // Fill to trigger high water mark
      const signals = Array.from({ length: 6 }, (_, i) => createMockSignal(`signal-${i}`));
      await handler.enqueueBatch(signals);

      // Drain to trigger low water mark
      await handler.dequeue(5);

      expect(lowWaterMarkEmitted).toBe(true);

      await handler.shutdown();
    });
  });

  describe('partition management', () => {
    it('should track paused partitions', () => {
      const handler = createBackpressureHandler(logger);

      handler.pausePartition(0);
      handler.pausePartition(1);

      expect(handler.isPartitionPaused(0)).toBe(true);
      expect(handler.isPartitionPaused(1)).toBe(true);
      expect(handler.isPartitionPaused(2)).toBe(false);

      handler.resumePartition(0);
      expect(handler.isPartitionPaused(0)).toBe(false);

      handler.shutdown();
    });
  });

  describe('lag tracking', () => {
    it('should track partition lag', () => {
      const handler = createBackpressureHandler(logger);

      handler.updateLag('topic-1', 0, '100', '150');
      handler.updateLag('topic-1', 1, '200', '250');

      const lag0 = handler.getLag('topic-1', 0);
      expect(lag0?.lag).toBe(50);

      const lag1 = handler.getLag('topic-1', 1);
      expect(lag1?.lag).toBe(50);

      expect(handler.getTotalLag()).toBe(100);

      handler.shutdown();
    });
  });

  describe('state and stats', () => {
    it('should return correct state', async () => {
      const handler = createBackpressureHandler(logger, {
        maxQueueSize: 100,
        spillToDisk: false,
      });

      const signals = Array.from({ length: 5 }, (_, i) => createMockSignal(`signal-${i}`));
      await handler.enqueueBatch(signals);

      const state = handler.getState();
      expect(state.queueSize).toBe(5);
      expect(state.maxQueueSize).toBe(100);
      expect(state.active).toBe(false);
      expect(state.spilledToDisk).toBe(false);

      await handler.shutdown();
    });

    it('should return correct stats', async () => {
      const handler = createBackpressureHandler(logger, {
        maxQueueSize: 100,
        spillToDisk: false,
      });

      const signals = Array.from({ length: 10 }, (_, i) => createMockSignal(`signal-${i}`));
      await handler.enqueueBatch(signals);

      const stats = handler.getStats();
      expect(stats.queueSize).toBe(10);
      expect(stats.utilizationPercent).toBe(10);

      await handler.shutdown();
    });
  });

  describe('cleanup', () => {
    it('should clear all state on shutdown', async () => {
      const handler = createBackpressureHandler(logger, {
        maxQueueSize: 100,
        spillToDisk: false,
      });

      const signals = Array.from({ length: 5 }, (_, i) => createMockSignal(`signal-${i}`));
      await handler.enqueueBatch(signals);
      handler.pausePartition(0);

      await handler.shutdown();

      const state = handler.getState();
      expect(state.queueSize).toBe(0);
      expect(state.pausedPartitions).toHaveLength(0);
    });
  });
});
