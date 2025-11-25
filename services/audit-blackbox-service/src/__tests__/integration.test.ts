/**
 * Integration Tests
 *
 * Tests for the complete audit black box service integration.
 * Tests services emitting events, pipeline ingestion, and retrieval.
 */

import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import type { AuditEvent, AuditEventInput, BufferStats } from '../core/types.js';
import { AuditEventBuffer } from '../core/event-buffer.js';

/**
 * Mock audit store for testing
 */
class MockAuditStore extends EventEmitter {
  public events: AuditEvent[] = [];
  public appendDelay: number = 0;
  public shouldFail: boolean = false;

  async appendEvent(event: AuditEvent): Promise<{ sequence: bigint }> {
    if (this.shouldFail) {
      throw new Error('Store failure');
    }

    if (this.appendDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.appendDelay));
    }

    this.events.push(event);
    return { sequence: BigInt(this.events.length) };
  }

  async appendEventsBatch(events: AuditEvent[]): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Store failure');
    }

    if (this.appendDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.appendDelay));
    }

    this.events.push(...events);
  }

  clear(): void {
    this.events = [];
  }
}

/**
 * Create a test audit event
 */
function createTestEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: randomUUID(),
    eventType: 'user_login',
    level: 'info',
    timestamp: new Date(),
    version: '1.0.0',
    correlationId: randomUUID(),
    tenantId: 'test-tenant',
    serviceId: 'test-service',
    serviceName: 'Test Service',
    environment: 'development',
    action: 'login',
    outcome: 'success',
    message: 'User logged in',
    details: {},
    complianceRelevant: false,
    complianceFrameworks: [],
    ...overrides,
  };
}

describe('AuditEventBuffer', () => {
  let buffer: AuditEventBuffer;
  let store: MockAuditStore;
  let flushedEvents: AuditEvent[];

  beforeEach(() => {
    flushedEvents = [];
    store = new MockAuditStore();

    buffer = new AuditEventBuffer({
      maxSize: 100,
      flushIntervalMs: 1000,
      batchSize: 10,
      backpressureThreshold: 0.8,
      criticalEventsBypass: true,
      onFlush: async (events) => {
        flushedEvents.push(...events);
        await store.appendEventsBatch(events);
      },
    });
  });

  afterEach(async () => {
    await buffer.shutdown();
  });

  describe('Event Buffering', () => {
    it('should buffer events until batch size reached', async () => {
      // Add 9 events (below batch size of 10)
      for (let i = 0; i < 9; i++) {
        await buffer.push(createTestEvent({ id: `event-${i}` }));
      }

      expect(buffer.size()).toBe(9);
      expect(flushedEvents).toHaveLength(0);
    });

    it('should flush when batch size reached', async () => {
      // Add 10 events (equal to batch size)
      for (let i = 0; i < 10; i++) {
        await buffer.push(createTestEvent({ id: `event-${i}` }));
      }

      // Wait for flush
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(flushedEvents).toHaveLength(10);
      expect(buffer.size()).toBe(0);
    });

    it('should prioritize critical events', async () => {
      // Add normal event
      await buffer.push(createTestEvent({ id: 'normal', level: 'info' }));

      // Add critical event
      await buffer.push(createTestEvent({ id: 'critical', level: 'critical' }));

      // Add another normal event
      await buffer.push(createTestEvent({ id: 'normal-2', level: 'info' }));

      // Force flush with batch size of 1 by checking internal state
      const stats = buffer.getStats();
      expect(stats.criticalQueueSize).toBe(1);
      expect(stats.normalQueueSize).toBe(2);
    });

    it('should handle compliance-relevant events as critical', async () => {
      const event = createTestEvent({
        complianceRelevant: true,
        complianceFrameworks: ['SOC2'],
      });

      await buffer.push(event);

      const stats = buffer.getStats();
      expect(stats.criticalQueueSize).toBe(1);
    });
  });

  describe('Backpressure Handling', () => {
    it('should activate backpressure when buffer is near full', async () => {
      let backpressureActivated = false;

      buffer.on('backpressure', (active) => {
        if (active) backpressureActivated = true;
      });

      // Fill buffer to 80% (80 events)
      for (let i = 0; i < 80; i++) {
        await buffer.push(createTestEvent({ id: `event-${i}` }));
      }

      expect(backpressureActivated).toBe(true);
    });

    it('should reject events when buffer is full', async () => {
      // Fill buffer completely
      for (let i = 0; i < 100; i++) {
        await buffer.push(createTestEvent({ id: `event-${i}` }));
      }

      // Next event should be rejected
      const result = await buffer.push(createTestEvent({ id: 'overflow' }));
      expect(result).toBe(false);
    });

    it('should allow critical events to bypass backpressure', async () => {
      // Fill buffer completely
      for (let i = 0; i < 100; i++) {
        await buffer.push(createTestEvent({ id: `event-${i}` }));
      }

      // Critical event should still be accepted
      const result = await buffer.push(
        createTestEvent({ id: 'critical', level: 'critical' }),
      );
      expect(result).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should track buffer statistics', async () => {
      await buffer.push(createTestEvent());
      await buffer.push(createTestEvent({ level: 'critical' }));

      const stats = buffer.getStats();

      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(100);
      expect(stats.totalReceived).toBe(2);
      expect(stats.backpressureActive).toBe(false);
    });

    it('should track dropped events', async () => {
      // Fill buffer
      for (let i = 0; i < 100; i++) {
        await buffer.push(createTestEvent({ id: `event-${i}` }));
      }

      // Try to add more (will be dropped)
      await buffer.push(createTestEvent({ id: 'dropped-1' }));
      await buffer.push(createTestEvent({ id: 'dropped-2' }));

      const stats = buffer.getStats();
      expect(stats.totalDropped).toBe(2);
    });
  });

  describe('Flush Behavior', () => {
    it('should flush all events on shutdown', async () => {
      // Add some events
      for (let i = 0; i < 5; i++) {
        await buffer.push(createTestEvent({ id: `event-${i}` }));
      }

      expect(flushedEvents).toHaveLength(0);

      // Shutdown should flush
      await buffer.shutdown();

      expect(flushedEvents).toHaveLength(5);
    });

    it('should emit flushed event with correct data', async () => {
      let flushData: { count: number; duration: number; remaining: number } | null = null;

      buffer.on('flushed', (data) => {
        flushData = data;
      });

      // Add batch size events to trigger flush
      for (let i = 0; i < 10; i++) {
        await buffer.push(createTestEvent({ id: `event-${i}` }));
      }

      // Wait for flush
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(flushData).not.toBeNull();
      expect(flushData!.count).toBe(10);
      expect(flushData!.remaining).toBe(0);
    });
  });
});

describe('Cross-Service Event Flow', () => {
  it('should handle events from multiple services', async () => {
    const flushedEvents: AuditEvent[] = [];

    const buffer = new AuditEventBuffer({
      maxSize: 1000,
      flushIntervalMs: 100,
      batchSize: 50,
      backpressureThreshold: 0.8,
      criticalEventsBypass: true,
      onFlush: async (events) => {
        flushedEvents.push(...events);
      },
    });

    // Simulate events from different services
    const services = ['api-gateway', 'auth-service', 'graph-api', 'copilot'];
    const correlationId = randomUUID();

    for (const serviceId of services) {
      for (let i = 0; i < 10; i++) {
        await buffer.push(
          createTestEvent({
            serviceId,
            serviceName: serviceId,
            correlationId,
          }),
        );
      }
    }

    await buffer.shutdown();

    expect(flushedEvents).toHaveLength(40);

    // All events should have same correlation ID
    const correlationIds = new Set(flushedEvents.map((e) => e.correlationId));
    expect(correlationIds.size).toBe(1);
    expect(correlationIds.has(correlationId)).toBe(true);

    // Events from all services should be present
    const serviceIds = new Set(flushedEvents.map((e) => e.serviceId));
    expect(serviceIds.size).toBe(4);
    services.forEach((s) => expect(serviceIds.has(s)).toBe(true));
  });

  it('should maintain event ordering within same service', async () => {
    const flushedEvents: AuditEvent[] = [];

    const buffer = new AuditEventBuffer({
      maxSize: 1000,
      flushIntervalMs: 100,
      batchSize: 100,
      backpressureThreshold: 0.8,
      criticalEventsBypass: true,
      onFlush: async (events) => {
        flushedEvents.push(...events);
      },
    });

    // Add events with sequence numbers
    for (let i = 0; i < 20; i++) {
      await buffer.push(
        createTestEvent({
          serviceId: 'test-service',
          details: { sequence: i },
        }),
      );
    }

    await buffer.shutdown();

    // Filter to just test-service events
    const serviceEvents = flushedEvents.filter(
      (e) => e.serviceId === 'test-service',
    );

    // Check ordering
    for (let i = 0; i < serviceEvents.length; i++) {
      expect(serviceEvents[i].details.sequence).toBe(i);
    }
  });
});

describe('Error Handling', () => {
  it('should emit error event on flush failure', async () => {
    const store = new MockAuditStore();
    store.shouldFail = true;

    let errorEmitted = false;

    const buffer = new AuditEventBuffer({
      maxSize: 100,
      flushIntervalMs: 1000,
      batchSize: 10,
      backpressureThreshold: 0.8,
      criticalEventsBypass: true,
      onFlush: async (events) => {
        await store.appendEventsBatch(events);
      },
    });

    buffer.on('error', () => {
      errorEmitted = true;
    });

    // Fill to batch size to trigger flush
    for (let i = 0; i < 10; i++) {
      await buffer.push(createTestEvent({ id: `event-${i}` }));
    }

    // Wait for flush attempt
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(errorEmitted).toBe(true);

    await buffer.shutdown().catch(() => {});
  });
});

describe('Security Event Handling', () => {
  it('should prioritize security events', async () => {
    const flushedEvents: AuditEvent[] = [];

    const buffer = new AuditEventBuffer({
      maxSize: 100,
      flushIntervalMs: 1000,
      batchSize: 5,
      backpressureThreshold: 0.8,
      criticalEventsBypass: true,
      onFlush: async (events) => {
        flushedEvents.push(...events);
      },
    });

    // Add normal events
    await buffer.push(createTestEvent({ eventType: 'resource_read', level: 'info' }));
    await buffer.push(createTestEvent({ eventType: 'resource_read', level: 'info' }));

    // Add security event
    await buffer.push(
      createTestEvent({
        eventType: 'security_alert',
        level: 'critical',
        criticalCategory: 'security',
      }),
    );

    // Add more normal events
    await buffer.push(createTestEvent({ eventType: 'resource_read', level: 'info' }));
    await buffer.push(createTestEvent({ eventType: 'resource_read', level: 'info' }));

    // Trigger flush
    await buffer.flush();

    // Security event should be first (critical queue processed first)
    expect(flushedEvents[0].eventType).toBe('security_alert');

    await buffer.shutdown();
  });

  it('should handle data breach events with highest priority', async () => {
    const flushedEvents: AuditEvent[] = [];

    const buffer = new AuditEventBuffer({
      maxSize: 100,
      flushIntervalMs: 1000,
      batchSize: 10,
      backpressureThreshold: 0.8,
      criticalEventsBypass: true,
      onFlush: async (events) => {
        flushedEvents.push(...events);
      },
    });

    // Add data breach event
    await buffer.push(
      createTestEvent({
        eventType: 'data_breach',
        level: 'critical',
        criticalCategory: 'security',
        complianceRelevant: true,
        complianceFrameworks: ['SOC2', 'GDPR', 'HIPAA'],
      }),
    );

    const stats = buffer.getStats();
    expect(stats.criticalQueueSize).toBe(1);

    await buffer.shutdown();
  });
});
