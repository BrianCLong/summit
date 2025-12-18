/**
 * Forensics Logger Tests
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  ForensicsLogger,
  ForensicsEvent,
  ActorInfo,
  TargetInfo,
  getForensicsLogger,
  resetForensicsLogger,
} from '../forensics-logger.js';

// Mock Redis with stream support
jest.mock('ioredis', () => {
  const streams = new Map<string, Array<[string, string[]]>>();
  let idCounter = 0;

  return jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue(undefined),
    ping: jest.fn().mockResolvedValue('PONG'),
    xgroup: jest.fn().mockResolvedValue('OK'),
    xadd: jest.fn((stream: string, ...args: any[]) => {
      if (!streams.has(stream)) streams.set(stream, []);
      const id = `${Date.now()}-${idCounter++}`;
      const fields = args.slice(args.indexOf('*') + 1);
      streams.get(stream)!.push([id, fields]);
      return Promise.resolve(id);
    }),
    xrange: jest.fn((stream: string, start: string, end: string, ...args: any[]) => {
      const entries = streams.get(stream) || [];
      const count = args.includes('COUNT') ? args[args.indexOf('COUNT') + 1] : entries.length;
      return Promise.resolve(entries.slice(0, count));
    }),
    xrevrange: jest.fn((stream: string, start: string, end: string, ...args: any[]) => {
      const entries = streams.get(stream) || [];
      const count = args.includes('COUNT') ? args[args.indexOf('COUNT') + 1] : entries.length;
      return Promise.resolve([...entries].reverse().slice(0, count));
    }),
    xreadgroup: jest.fn().mockResolvedValue([]),
    xack: jest.fn().mockResolvedValue(1),
    xinfo: jest.fn().mockResolvedValue([
      'length', 10,
      'first-entry', ['123-0', ['data', 'test']],
      'last-entry', ['456-0', ['data', 'test']],
      'groups', 1,
      'last-generated-id', '456-0'
    ]),
    pipeline: jest.fn(() => ({
      xadd: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    })),
    on: jest.fn(),
  }));
});

describe('ForensicsLogger', () => {
  let logger: ForensicsLogger;

  const testActor: ActorInfo = {
    id: 'user-123',
    type: 'user',
    email: 'test@example.com',
    name: 'Test User',
    tenantId: 'tenant-1',
    ip: '192.168.1.1',
    sessionId: 'session-abc',
  };

  const testTarget: TargetInfo = {
    type: 'investigation',
    id: 'inv-456',
    name: 'Test Investigation',
    tenantId: 'tenant-1',
    classification: 'secret',
  };

  beforeEach(async () => {
    resetForensicsLogger();
    logger = new ForensicsLogger(undefined, {
      streamName: 'test:forensics',
      maxStreamLength: 1000,
      enableChainHashing: true,
      batchSize: 10,
    });
    await logger.initialize();
  });

  afterEach(async () => {
    await logger.shutdown();
    resetForensicsLogger();
  });

  describe('Event Logging', () => {
    it('should log authentication events', async () => {
      const hash = await logger.logAuthentication(
        testActor,
        'login',
        'success',
        { method: 'OIDC' }
      );

      expect(hash).toBeDefined();
      expect(hash.length).toBe(64); // SHA-256 hex
    });

    it('should log authorization events', async () => {
      const hash = await logger.logAuthorization(
        testActor,
        testTarget,
        'read',
        'success',
        { permission: 'investigation:read' }
      );

      expect(hash).toBeDefined();
    });

    it('should log data access events', async () => {
      const hash = await logger.logDataAccess(
        testActor,
        testTarget,
        'view',
        { query: 'SELECT *' }
      );

      expect(hash).toBeDefined();
    });

    it('should log security events', async () => {
      const hash = await logger.logSecurityEvent(
        testActor,
        'suspicious_login_attempt',
        'warning',
        { attempts: 3, blocked: false }
      );

      expect(hash).toBeDefined();
    });

    it('should log policy violations', async () => {
      const hash = await logger.logPolicyViolation(
        testActor,
        testTarget,
        'DLP_EXPORT_BLOCKED',
        { reason: 'Sensitive data export attempted' }
      );

      expect(hash).toBeDefined();
    });

    it('should log admin actions', async () => {
      const hash = await logger.logAdminAction(
        testActor,
        'user_role_changed',
        testTarget,
        { oldRole: 'viewer', newRole: 'analyst' }
      );

      expect(hash).toBeDefined();
    });
  });

  describe('Chain Hashing', () => {
    it('should create chain of hashes', async () => {
      const hash1 = await logger.logAuthentication(testActor, 'login1', 'success');
      const hash2 = await logger.logAuthentication(testActor, 'login2', 'success');
      const hash3 = await logger.logAuthentication(testActor, 'login3', 'success');

      // Each hash should be different
      expect(hash1).not.toBe(hash2);
      expect(hash2).not.toBe(hash3);
      expect(hash1).not.toBe(hash3);
    });

    it('should include previous hash in chain', async () => {
      const events: ForensicsEvent[] = [];

      logger.on('event', (event: ForensicsEvent) => {
        events.push(event);
      });

      await logger.logAuthentication(testActor, 'action1', 'success');
      await logger.logAuthentication(testActor, 'action2', 'success');

      // Allow event emission
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(events.length).toBe(2);
      expect(events[0].previousHash).toBe('GENESIS');
      expect(events[1].previousHash).toBe(events[0].hash);
    });
  });

  describe('Event Emission', () => {
    it('should emit events in real-time', async () => {
      const receivedEvents: ForensicsEvent[] = [];

      logger.on('event', (event: ForensicsEvent) => {
        receivedEvents.push(event);
      });

      await logger.logAuthentication(testActor, 'test-action', 'success');

      // Allow event emission
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(receivedEvents.length).toBe(1);
      expect(receivedEvents[0].action).toBe('test-action');
      expect(receivedEvents[0].actor.id).toBe('user-123');
    });
  });

  describe('Generic Log Method', () => {
    it('should log custom events', async () => {
      const hash = await logger.log({
        eventType: 'system_event',
        severity: 'info',
        category: 'system',
        source: {
          service: 'test-service',
          instance: 'test-instance',
        },
        actor: testActor,
        action: 'custom_action',
        outcome: 'success',
        details: { custom: 'data' },
        context: {
          environment: 'test',
          requestId: 'req-123',
        },
      });

      expect(hash).toBeDefined();
    });
  });

  describe('Stream Info', () => {
    it('should get stream info', async () => {
      const info = await logger.getStreamInfo();

      expect(info).toBeDefined();
      expect(info.length).toBe(10);
      expect(info.groups).toBe(1);
    });
  });

  describe('Chain Integrity Verification', () => {
    it('should verify chain integrity', async () => {
      await logger.logAuthentication(testActor, 'action1', 'success');
      await logger.logAuthentication(testActor, 'action2', 'success');
      await logger.logAuthentication(testActor, 'action3', 'success');

      const result = await logger.verifyChainIntegrity(undefined, 100);

      expect(result.valid).toBe(true);
      expect(result.eventsChecked).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Event Reading', () => {
    it('should read events from stream', async () => {
      await logger.logAuthentication(testActor, 'read-test', 'success');

      const events = await logger.readEvents('-', 10);
      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('Event Querying', () => {
    it('should query events by criteria', async () => {
      await logger.logAuthentication(testActor, 'query-test', 'success');

      const events = await logger.queryEvents({
        eventType: 'authentication',
        actorId: 'user-123',
      }, 10);

      expect(Array.isArray(events)).toBe(true);
    });

    it('should filter by time range', async () => {
      const startTime = new Date(Date.now() - 1000);
      await logger.logAuthentication(testActor, 'time-test', 'success');
      const endTime = new Date();

      const events = await logger.queryEvents({
        startTime,
        endTime,
      }, 10);

      expect(Array.isArray(events)).toBe(true);
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const health = await logger.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.redis).toBe('connected');
    });
  });

  describe('Singleton Management', () => {
    it('should return same instance', () => {
      resetForensicsLogger();
      const instance1 = getForensicsLogger();
      const instance2 = getForensicsLogger();
      expect(instance1).toBe(instance2);
    });

    it('should reset instance', () => {
      const instance1 = getForensicsLogger();
      resetForensicsLogger();
      const instance2 = getForensicsLogger();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Severity Levels', () => {
    it('should log with different severity levels', async () => {
      const events: ForensicsEvent[] = [];
      logger.on('event', (e: ForensicsEvent) => events.push(e));

      await logger.logSecurityEvent(testActor, 'info-event', 'info');
      await logger.logSecurityEvent(testActor, 'warning-event', 'warning');
      await logger.logSecurityEvent(testActor, 'critical-event', 'critical');

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(events.find(e => e.severity === 'info')).toBeDefined();
      expect(events.find(e => e.severity === 'warning')).toBeDefined();
      expect(events.find(e => e.severity === 'critical')).toBeDefined();
    });
  });

  describe('Classification Handling', () => {
    it('should set appropriate severity for classified data', async () => {
      const events: ForensicsEvent[] = [];
      logger.on('event', (e: ForensicsEvent) => events.push(e));

      await logger.logDataAccess(
        testActor,
        { ...testTarget, classification: 'top-secret' },
        'view'
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(events.length).toBe(1);
      expect(events[0].severity).toBe('notice');
    });
  });
});
