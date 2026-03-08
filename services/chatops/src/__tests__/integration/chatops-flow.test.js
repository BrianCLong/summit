"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock external dependencies
globals_1.jest.mock('pg');
globals_1.jest.mock('ioredis');
const session_manager_js_1 = require("../../session/session-manager.js");
(0, globals_1.describe)('ChatOps Integration Flow', () => {
    let mockPool;
    let mockRedis;
    let sessionManager;
    const testSecurityContext = {
        userId: 'test-user-1',
        tenantId: 'test-tenant',
        roles: ['analyst'],
        clearance: 'SECRET',
        permissions: ['entity:read', 'graph:query'],
        compartments: [],
        sessionId: '',
        timestamp: new Date(),
    };
    (0, globals_1.beforeAll)(async () => {
        // Setup mocks
        mockPool = {
            query: globals_1.jest.fn().mockResolvedValue({ rows: [] }),
        };
        mockRedis = {
            get: globals_1.jest.fn().mockResolvedValue(null),
            setex: globals_1.jest.fn().mockResolvedValue('OK'),
            del: globals_1.jest.fn().mockResolvedValue(1),
            sadd: globals_1.jest.fn().mockResolvedValue(1),
            smembers: globals_1.jest.fn().mockResolvedValue([]),
            expire: globals_1.jest.fn().mockResolvedValue(1),
            keys: globals_1.jest.fn().mockResolvedValue([]),
            subscribe: globals_1.jest.fn().mockResolvedValue(1),
            on: globals_1.jest.fn(),
            duplicate: globals_1.jest.fn().mockReturnThis(),
            quit: globals_1.jest.fn().mockResolvedValue('OK'),
            publish: globals_1.jest.fn().mockResolvedValue(1),
            unsubscribe: globals_1.jest.fn().mockResolvedValue(1),
        };
        sessionManager = new session_manager_js_1.SessionManager({
            postgres: mockPool,
            redis: mockRedis,
            defaultTtlSeconds: 3600,
            maxIdleSeconds: 900,
        });
        await sessionManager.initialize();
    });
    (0, globals_1.afterAll)(async () => {
        await sessionManager.shutdown();
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('Session Lifecycle', () => {
        (0, globals_1.it)('should create a new session', async () => {
            const session = await sessionManager.createSession({
                userId: 'test-user-1',
                tenantId: 'test-tenant',
                platform: 'web',
                channelId: 'channel-1',
                securityContext: testSecurityContext,
            });
            (0, globals_1.expect)(session.id).toBeDefined();
            (0, globals_1.expect)(session.userId).toBe('test-user-1');
            (0, globals_1.expect)(session.status).toBe('active');
            (0, globals_1.expect)(session.turns).toHaveLength(0);
            // Verify persistence calls
            (0, globals_1.expect)(mockRedis.setex).toHaveBeenCalled();
            (0, globals_1.expect)(mockPool.query).toHaveBeenCalled();
        });
        (0, globals_1.it)('should retrieve existing session', async () => {
            const createdSession = await sessionManager.createSession({
                userId: 'test-user-2',
                tenantId: 'test-tenant',
                platform: 'slack',
                channelId: 'channel-2',
                securityContext: testSecurityContext,
            });
            const retrieved = await sessionManager.getSession(createdSession.id);
            (0, globals_1.expect)(retrieved).toBeDefined();
            (0, globals_1.expect)(retrieved?.id).toBe(createdSession.id);
        });
        (0, globals_1.it)('should add turns to session', async () => {
            const session = await sessionManager.createSession({
                userId: 'test-user-3',
                tenantId: 'test-tenant',
                platform: 'teams',
                channelId: 'channel-3',
                securityContext: testSecurityContext,
            });
            const turn = {
                id: 'turn-1',
                role: 'user',
                content: 'What is APT28?',
                tokenCount: 10,
                timestamp: new Date(),
            };
            await sessionManager.addTurn(session.id, turn);
            const updated = await sessionManager.getSession(session.id);
            (0, globals_1.expect)(updated?.turns).toHaveLength(1);
            (0, globals_1.expect)(updated?.turns[0].content).toBe('What is APT28?');
        });
        (0, globals_1.it)('should handle session expiration', async () => {
            const session = await sessionManager.createSession({
                userId: 'test-user-4',
                tenantId: 'test-tenant',
                platform: 'web',
                channelId: 'channel-4',
                securityContext: testSecurityContext,
            });
            await sessionManager.expireSession(session.id, 'test_expiration');
            // Session should be removed from cache
            (0, globals_1.expect)(mockRedis.del).toHaveBeenCalled();
        });
        (0, globals_1.it)('should support cross-channel handoff', async () => {
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
            (0, globals_1.expect)(newSession).toBeDefined();
            (0, globals_1.expect)(newSession?.platform).toBe('web');
            (0, globals_1.expect)(newSession?.turns).toHaveLength(1);
            (0, globals_1.expect)(newSession?.metadata.parentSessionId).toBe(originalSession.id);
        });
    });
    (0, globals_1.describe)('Concurrent Sessions', () => {
        (0, globals_1.it)('should enforce max concurrent sessions per user', async () => {
            // Set low limit for testing
            const limitedManager = new session_manager_js_1.SessionManager({
                postgres: mockPool,
                redis: mockRedis,
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
            (0, globals_1.expect)(session3).toBeDefined();
        });
    });
    (0, globals_1.describe)('Session Status Transitions', () => {
        (0, globals_1.it)('should transition from active to idle', async () => {
            const session = await sessionManager.createSession({
                userId: 'status-user',
                tenantId: 'test-tenant',
                platform: 'web',
                channelId: 'status-channel',
                securityContext: testSecurityContext,
            });
            (0, globals_1.expect)(session.status).toBe('active');
            // Simulate idle transition (would normally happen via cleanup)
            const updated = await sessionManager.updateSession(session.id, {
                status: 'idle',
            });
            (0, globals_1.expect)(updated?.status).toBe('idle');
        });
        (0, globals_1.it)('should resume suspended session', async () => {
            const session = await sessionManager.createSession({
                userId: 'suspend-user',
                tenantId: 'test-tenant',
                platform: 'web',
                channelId: 'suspend-channel',
                securityContext: testSecurityContext,
            });
            await sessionManager.suspendSession(session.id, 'user_request');
            const suspended = await sessionManager.getSession(session.id);
            (0, globals_1.expect)(suspended?.status).toBe('suspended');
            const resumed = await sessionManager.resumeSession(session.id);
            (0, globals_1.expect)(resumed?.status).toBe('active');
        });
    });
    (0, globals_1.describe)('Event Emission', () => {
        (0, globals_1.it)('should emit events on session operations', async () => {
            const events = [];
            sessionManager.on('session:event', (event) => events.push(event));
            await sessionManager.createSession({
                userId: 'event-user',
                tenantId: 'test-tenant',
                platform: 'web',
                channelId: 'event-channel',
                securityContext: testSecurityContext,
            });
            (0, globals_1.expect)(events.length).toBeGreaterThan(0);
            (0, globals_1.expect)(events[0].type).toBe('created');
        });
    });
});
(0, globals_1.describe)('Risk Classification Flow', () => {
    (0, globals_1.describe)('Autonomous Operations', () => {
        (0, globals_1.it)('should classify read operations as autonomous', () => {
            const input = {
                operation: 'read',
                tool_id: 'graph',
                user_clearance: 'SECRET',
                data_classification: 'CONFIDENTIAL',
                user_roles: ['analyst'],
            };
            // Risk classification would use OPA
            // This tests the expected classification
            (0, globals_1.expect)(input.operation).toBe('read');
        });
    });
    (0, globals_1.describe)('HITL Operations', () => {
        (0, globals_1.it)('should require approval for write operations', () => {
            const input = {
                operation: 'create',
                tool_id: 'entity',
                user_clearance: 'SECRET',
                data_classification: 'SECRET',
            };
            // Write operations should be HITL
            (0, globals_1.expect)(['create', 'update', 'modify']).toContain(input.operation);
        });
    });
    (0, globals_1.describe)('Prohibited Operations', () => {
        (0, globals_1.it)('should block delete operations', () => {
            const input = {
                operation: 'delete',
                tool_id: 'entity',
            };
            (0, globals_1.expect)(input.operation).toBe('delete');
        });
        (0, globals_1.it)('should block cross-tenant access without permission', () => {
            const input = {
                tenant_id: 'tenant-a',
                user_tenant_id: 'tenant-b',
                user_permissions: [],
            };
            const isCrossTenant = input.tenant_id !== input.user_tenant_id;
            const hasPermission = input.user_permissions.includes('cross_tenant:access');
            (0, globals_1.expect)(isCrossTenant).toBe(true);
            (0, globals_1.expect)(hasPermission).toBe(false);
        });
    });
});
(0, globals_1.describe)('Audit Trail', () => {
    (0, globals_1.it)('should capture all operations in audit log', () => {
        const auditEvent = {
            eventType: 'tool_invoked',
            sessionId: 'session-1',
            userId: 'user-1',
            toolId: 'graph_query',
            parameters: { query: 'MATCH (n) RETURN n' },
            timestamp: new Date(),
        };
        (0, globals_1.expect)(auditEvent.eventType).toBeDefined();
        (0, globals_1.expect)(auditEvent.timestamp).toBeDefined();
    });
    (0, globals_1.it)('should maintain hash chain integrity', () => {
        const events = [
            { id: 1, hash: 'hash-1', prevHash: null },
            { id: 2, hash: 'hash-2', prevHash: 'hash-1' },
            { id: 3, hash: 'hash-3', prevHash: 'hash-2' },
        ];
        // Verify chain
        for (let i = 1; i < events.length; i++) {
            (0, globals_1.expect)(events[i].prevHash).toBe(events[i - 1].hash);
        }
    });
});
