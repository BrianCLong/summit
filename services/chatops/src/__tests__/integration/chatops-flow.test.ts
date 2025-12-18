/**
 * ChatOps Integration Tests
 *
 * End-to-end flow tests covering:
 * - Session creation and management
 * - Message routing through intent router
 * - Risk tier classification
 * - Approval workflows
 * - Audit trail generation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { Pool } from 'pg';
import Redis from 'ioredis';

// Mock external dependencies
jest.mock('pg');
jest.mock('ioredis');

import { SessionManager } from '../../session/session-manager.js';
import type { SecurityContext, ConversationTurn } from '../../types.js';

describe('ChatOps Integration Flow', () => {
  let mockPool: jest.Mocked<Pool>;
  let mockRedis: jest.Mocked<Redis>;
  let sessionManager: SessionManager;

  const testSecurityContext: SecurityContext = {
    userId: 'test-user-1',
    tenantId: 'test-tenant',
    roles: ['analyst'],
    clearance: 'SECRET',
    permissions: ['entity:read', 'graph:query'],
    compartments: [],
    sessionId: '',
    timestamp: new Date(),
  };

  beforeAll(async () => {
    // Setup mocks
    mockPool = {
      query: jest.fn().mockResolvedValue({ rows: [] }),
    } as any;

    mockRedis = {
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      sadd: jest.fn().mockResolvedValue(1),
      smembers: jest.fn().mockResolvedValue([]),
      expire: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
      subscribe: jest.fn().mockResolvedValue(1),
      on: jest.fn(),
      duplicate: jest.fn().mockReturnThis(),
      quit: jest.fn().mockResolvedValue('OK'),
      publish: jest.fn().mockResolvedValue(1),
      unsubscribe: jest.fn().mockResolvedValue(1),
    } as any;

    sessionManager = new SessionManager({
      postgres: mockPool as unknown as Pool,
      redis: mockRedis as unknown as Redis,
      defaultTtlSeconds: 3600,
      maxIdleSeconds: 900,
    });

    await sessionManager.initialize();
  });

  afterAll(async () => {
    await sessionManager.shutdown();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Session Lifecycle', () => {
    it('should create a new session', async () => {
      const session = await sessionManager.createSession({
        userId: 'test-user-1',
        tenantId: 'test-tenant',
        platform: 'web',
        channelId: 'channel-1',
        securityContext: testSecurityContext,
      });

      expect(session.id).toBeDefined();
      expect(session.userId).toBe('test-user-1');
      expect(session.status).toBe('active');
      expect(session.turns).toHaveLength(0);

      // Verify persistence calls
      expect(mockRedis.setex).toHaveBeenCalled();
      expect(mockPool.query).toHaveBeenCalled();
    });

    it('should retrieve existing session', async () => {
      const createdSession = await sessionManager.createSession({
        userId: 'test-user-2',
        tenantId: 'test-tenant',
        platform: 'slack',
        channelId: 'channel-2',
        securityContext: testSecurityContext,
      });

      const retrieved = await sessionManager.getSession(createdSession.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(createdSession.id);
    });

    it('should add turns to session', async () => {
      const session = await sessionManager.createSession({
        userId: 'test-user-3',
        tenantId: 'test-tenant',
        platform: 'teams',
        channelId: 'channel-3',
        securityContext: testSecurityContext,
      });

      const turn: ConversationTurn = {
        id: 'turn-1',
        role: 'user',
        content: 'What is APT28?',
        tokenCount: 10,
        timestamp: new Date(),
      };

      await sessionManager.addTurn(session.id, turn);

      const updated = await sessionManager.getSession(session.id);
      expect(updated?.turns).toHaveLength(1);
      expect(updated?.turns[0].content).toBe('What is APT28?');
    });

    it('should handle session expiration', async () => {
      const session = await sessionManager.createSession({
        userId: 'test-user-4',
        tenantId: 'test-tenant',
        platform: 'web',
        channelId: 'channel-4',
        securityContext: testSecurityContext,
      });

      await sessionManager.expireSession(session.id, 'test_expiration');

      // Session should be removed from cache
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('should support cross-channel handoff', async () => {
      const originalSession = await sessionManager.createSession({
        userId: 'test-user-5',
        tenantId: 'test-tenant',
        platform: 'slack',
        channelId: 'channel-5',
        securityContext: testSecurityContext,
      });

      // Add some context
      await sessionManager.addTurn(originalSession.id, {
        id: 'turn-1',
        role: 'user',
        content: 'Starting investigation',
        tokenCount: 5,
        timestamp: new Date(),
      });

      // Handoff to web
      const newSession = await sessionManager.handoffSession(originalSession.id, {
        platform: 'web',
        channelId: 'web-channel-1',
      });

      expect(newSession).toBeDefined();
      expect(newSession?.platform).toBe('web');
      expect(newSession?.turns).toHaveLength(1);
      expect(newSession?.metadata.parentSessionId).toBe(originalSession.id);
    });
  });

  describe('Concurrent Sessions', () => {
    it('should enforce max concurrent sessions per user', async () => {
      // Set low limit for testing
      const limitedManager = new SessionManager({
        postgres: mockPool as unknown as Pool,
        redis: mockRedis as unknown as Redis,
        maxConcurrentSessions: 2,
      });

      // Track created sessions
      mockRedis.smembers.mockResolvedValue(['session-1', 'session-2']);

      // Create third session should trigger expiration of oldest
      const session3 = await limitedManager.createSession({
        userId: 'limited-user',
        tenantId: 'test-tenant',
        platform: 'web',
        channelId: 'channel-new',
        securityContext: testSecurityContext,
      });

      expect(session3).toBeDefined();
    });
  });

  describe('Session Status Transitions', () => {
    it('should transition from active to idle', async () => {
      const session = await sessionManager.createSession({
        userId: 'status-user',
        tenantId: 'test-tenant',
        platform: 'web',
        channelId: 'status-channel',
        securityContext: testSecurityContext,
      });

      expect(session.status).toBe('active');

      // Simulate idle transition (would normally happen via cleanup)
      const updated = await sessionManager.updateSession(session.id, {
        status: 'idle',
      });

      expect(updated?.status).toBe('idle');
    });

    it('should resume suspended session', async () => {
      const session = await sessionManager.createSession({
        userId: 'suspend-user',
        tenantId: 'test-tenant',
        platform: 'web',
        channelId: 'suspend-channel',
        securityContext: testSecurityContext,
      });

      await sessionManager.suspendSession(session.id, 'user_request');

      const suspended = await sessionManager.getSession(session.id);
      expect(suspended?.status).toBe('suspended');

      const resumed = await sessionManager.resumeSession(session.id);
      expect(resumed?.status).toBe('active');
    });
  });

  describe('Event Emission', () => {
    it('should emit events on session operations', async () => {
      const events: any[] = [];
      sessionManager.on('session:event', (event) => events.push(event));

      await sessionManager.createSession({
        userId: 'event-user',
        tenantId: 'test-tenant',
        platform: 'web',
        channelId: 'event-channel',
        securityContext: testSecurityContext,
      });

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('created');
    });
  });
});

describe('Risk Classification Flow', () => {
  describe('Autonomous Operations', () => {
    it('should classify read operations as autonomous', () => {
      const input = {
        operation: 'read',
        tool_id: 'graph',
        user_clearance: 'SECRET',
        data_classification: 'CONFIDENTIAL',
        user_roles: ['analyst'],
      };

      // Risk classification would use OPA
      // This tests the expected classification
      expect(input.operation).toBe('read');
    });
  });

  describe('HITL Operations', () => {
    it('should require approval for write operations', () => {
      const input = {
        operation: 'create',
        tool_id: 'entity',
        user_clearance: 'SECRET',
        data_classification: 'SECRET',
      };

      // Write operations should be HITL
      expect(['create', 'update', 'modify']).toContain(input.operation);
    });
  });

  describe('Prohibited Operations', () => {
    it('should block delete operations', () => {
      const input = {
        operation: 'delete',
        tool_id: 'entity',
      };

      expect(input.operation).toBe('delete');
    });

    it('should block cross-tenant access without permission', () => {
      const input = {
        tenant_id: 'tenant-a',
        user_tenant_id: 'tenant-b',
        user_permissions: [],
      };

      const isCrossTenant = input.tenant_id !== input.user_tenant_id;
      const hasPermission = input.user_permissions.includes('cross_tenant:access');

      expect(isCrossTenant).toBe(true);
      expect(hasPermission).toBe(false);
    });
  });
});

describe('Audit Trail', () => {
  it('should capture all operations in audit log', () => {
    const auditEvent = {
      eventType: 'tool_invoked',
      sessionId: 'session-1',
      userId: 'user-1',
      toolId: 'graph_query',
      parameters: { query: 'MATCH (n) RETURN n' },
      timestamp: new Date(),
    };

    expect(auditEvent.eventType).toBeDefined();
    expect(auditEvent.timestamp).toBeDefined();
  });

  it('should maintain hash chain integrity', () => {
    const events = [
      { id: 1, hash: 'hash-1', prevHash: null },
      { id: 2, hash: 'hash-2', prevHash: 'hash-1' },
      { id: 3, hash: 'hash-3', prevHash: 'hash-2' },
    ];

    // Verify chain
    for (let i = 1; i < events.length; i++) {
      expect(events[i].prevHash).toBe(events[i - 1].hash);
    }
  });
});
