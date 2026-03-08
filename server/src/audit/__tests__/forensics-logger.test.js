"use strict";
/**
 * Forensics Logger Tests
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock Redis with stream support
globals_1.jest.unstable_mockModule('ioredis', () => {
    const streams = new Map();
    let idCounter = 0;
    const MockRedis = globals_1.jest.fn().mockImplementation(() => ({
        connect: globals_1.jest.fn().mockResolvedValue(undefined),
        quit: globals_1.jest.fn().mockResolvedValue(undefined),
        ping: globals_1.jest.fn().mockResolvedValue('PONG'),
        xgroup: globals_1.jest.fn().mockResolvedValue('OK'),
        xadd: globals_1.jest.fn((stream, ...args) => {
            if (!streams.has(stream))
                streams.set(stream, []);
            const id = `${Date.now()}-${idCounter++}`;
            const fields = args.slice(args.indexOf('*') + 1);
            streams.get(stream).push([id, fields]);
            return Promise.resolve(id);
        }),
        xrange: globals_1.jest.fn((stream, start, end, ...args) => {
            const entries = streams.get(stream) || [];
            const count = args.includes('COUNT') ? args[args.indexOf('COUNT') + 1] : entries.length;
            return Promise.resolve(entries.slice(0, count));
        }),
        xrevrange: globals_1.jest.fn((stream, start, end, ...args) => {
            const entries = streams.get(stream) || [];
            const count = args.includes('COUNT') ? args[args.indexOf('COUNT') + 1] : entries.length;
            return Promise.resolve([...entries].reverse().slice(0, count));
        }),
        xreadgroup: globals_1.jest.fn().mockResolvedValue([]),
        xack: globals_1.jest.fn().mockResolvedValue(1),
        xinfo: globals_1.jest.fn().mockResolvedValue([
            'length', 10,
            'first-entry', ['123-0', ['data', 'test']],
            'last-entry', ['456-0', ['data', 'test']],
            'groups', 1,
            'last-generated-id', '456-0'
        ]),
        pipeline: globals_1.jest.fn(() => ({
            xadd: globals_1.jest.fn().mockReturnThis(),
            exec: globals_1.jest.fn().mockResolvedValue([]),
        })),
        on: globals_1.jest.fn(),
    }));
    return {
        __esModule: true,
        default: MockRedis,
    };
});
(0, globals_1.describe)('ForensicsLogger', () => {
    let ForensicsLogger;
    let getForensicsLogger;
    let resetForensicsLogger;
    let logger;
    const testActor = {
        id: 'user-123',
        type: 'user',
        email: 'test@example.com',
        name: 'Test User',
        tenantId: 'tenant-1',
        ip: '192.168.1.1',
        sessionId: 'session-abc',
    };
    const testTarget = {
        type: 'investigation',
        id: 'inv-456',
        name: 'Test Investigation',
        tenantId: 'tenant-1',
        classification: 'secret',
    };
    (0, globals_1.beforeAll)(async () => {
        const module = await Promise.resolve().then(() => __importStar(require('../forensics-logger.js')));
        ForensicsLogger = module.ForensicsLogger;
        getForensicsLogger = module.getForensicsLogger;
        resetForensicsLogger = module.resetForensicsLogger;
    });
    (0, globals_1.beforeEach)(async () => {
        resetForensicsLogger();
        logger = new ForensicsLogger(undefined, {
            streamName: 'test:forensics',
            maxStreamLength: 1000,
            enableChainHashing: true,
            batchSize: 10,
        });
        await logger.initialize();
    });
    (0, globals_1.afterEach)(async () => {
        await logger.shutdown();
        resetForensicsLogger();
    });
    (0, globals_1.describe)('Event Logging', () => {
        (0, globals_1.it)('should log authentication events', async () => {
            const hash = await logger.logAuthentication(testActor, 'login', 'success', { method: 'OIDC' });
            (0, globals_1.expect)(hash).toBeDefined();
            (0, globals_1.expect)(hash.length).toBe(64); // SHA-256 hex
        });
        (0, globals_1.it)('should log authorization events', async () => {
            const hash = await logger.logAuthorization(testActor, testTarget, 'read', 'success', { permission: 'investigation:read' });
            (0, globals_1.expect)(hash).toBeDefined();
        });
        (0, globals_1.it)('should log data access events', async () => {
            const hash = await logger.logDataAccess(testActor, testTarget, 'view', { query: 'SELECT *' });
            (0, globals_1.expect)(hash).toBeDefined();
        });
        (0, globals_1.it)('should log security events', async () => {
            const hash = await logger.logSecurityEvent(testActor, 'suspicious_login_attempt', 'warning', { attempts: 3, blocked: false });
            (0, globals_1.expect)(hash).toBeDefined();
        });
        (0, globals_1.it)('should log policy violations', async () => {
            const hash = await logger.logPolicyViolation(testActor, testTarget, 'DLP_EXPORT_BLOCKED', { reason: 'Sensitive data export attempted' });
            (0, globals_1.expect)(hash).toBeDefined();
        });
        (0, globals_1.it)('should log admin actions', async () => {
            const hash = await logger.logAdminAction(testActor, 'user_role_changed', testTarget, { oldRole: 'viewer', newRole: 'analyst' });
            (0, globals_1.expect)(hash).toBeDefined();
        });
    });
    (0, globals_1.describe)('Chain Hashing', () => {
        (0, globals_1.it)('should create chain of hashes', async () => {
            const hash1 = await logger.logAuthentication(testActor, 'login1', 'success');
            const hash2 = await logger.logAuthentication(testActor, 'login2', 'success');
            const hash3 = await logger.logAuthentication(testActor, 'login3', 'success');
            // Each hash should be different
            (0, globals_1.expect)(hash1).not.toBe(hash2);
            (0, globals_1.expect)(hash2).not.toBe(hash3);
            (0, globals_1.expect)(hash1).not.toBe(hash3);
        });
        (0, globals_1.it)('should include previous hash in chain', async () => {
            const events = [];
            logger.on('event', (event) => {
                events.push(event);
            });
            await logger.logAuthentication(testActor, 'action1', 'success');
            await logger.logAuthentication(testActor, 'action2', 'success');
            // Allow event emission
            await new Promise(resolve => setTimeout(resolve, 10));
            (0, globals_1.expect)(events.length).toBe(2);
            (0, globals_1.expect)(events[0].previousHash).toBe('GENESIS');
            (0, globals_1.expect)(events[1].previousHash).toBe(events[0].hash);
        });
    });
    (0, globals_1.describe)('Event Emission', () => {
        (0, globals_1.it)('should emit events in real-time', async () => {
            const receivedEvents = [];
            logger.on('event', (event) => {
                receivedEvents.push(event);
            });
            await logger.logAuthentication(testActor, 'test-action', 'success');
            // Allow event emission
            await new Promise(resolve => setTimeout(resolve, 10));
            (0, globals_1.expect)(receivedEvents.length).toBe(1);
            (0, globals_1.expect)(receivedEvents[0].action).toBe('test-action');
            (0, globals_1.expect)(receivedEvents[0].actor.id).toBe('user-123');
        });
    });
    (0, globals_1.describe)('Generic Log Method', () => {
        (0, globals_1.it)('should log custom events', async () => {
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
            (0, globals_1.expect)(hash).toBeDefined();
        });
    });
    (0, globals_1.describe)('Stream Info', () => {
        (0, globals_1.it)('should get stream info', async () => {
            const info = await logger.getStreamInfo();
            (0, globals_1.expect)(info).toBeDefined();
            (0, globals_1.expect)(info.length).toBe(10);
            (0, globals_1.expect)(info.groups).toBe(1);
        });
    });
    (0, globals_1.describe)('Chain Integrity Verification', () => {
        (0, globals_1.it)('should verify chain integrity', async () => {
            await logger.logAuthentication(testActor, 'action1', 'success');
            await logger.logAuthentication(testActor, 'action2', 'success');
            await logger.logAuthentication(testActor, 'action3', 'success');
            const result = await logger.verifyChainIntegrity(undefined, 100);
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.eventsChecked).toBeGreaterThanOrEqual(0);
        });
    });
    (0, globals_1.describe)('Event Reading', () => {
        (0, globals_1.it)('should read events from stream', async () => {
            await logger.logAuthentication(testActor, 'read-test', 'success');
            const events = await logger.readEvents('-', 10);
            (0, globals_1.expect)(Array.isArray(events)).toBe(true);
        });
    });
    (0, globals_1.describe)('Event Querying', () => {
        (0, globals_1.it)('should query events by criteria', async () => {
            await logger.logAuthentication(testActor, 'query-test', 'success');
            const events = await logger.queryEvents({
                eventType: 'authentication',
                actorId: 'user-123',
            }, 10);
            (0, globals_1.expect)(Array.isArray(events)).toBe(true);
        });
        (0, globals_1.it)('should filter by time range', async () => {
            const startTime = new Date(Date.now() - 1000);
            await logger.logAuthentication(testActor, 'time-test', 'success');
            const endTime = new Date();
            const events = await logger.queryEvents({
                startTime,
                endTime,
            }, 10);
            (0, globals_1.expect)(Array.isArray(events)).toBe(true);
        });
    });
    (0, globals_1.describe)('Health Check', () => {
        (0, globals_1.it)('should return healthy status', async () => {
            const health = await logger.healthCheck();
            (0, globals_1.expect)(health.status).toBe('healthy');
            (0, globals_1.expect)(health.details.redis).toBe('connected');
        });
    });
    (0, globals_1.describe)('Singleton Management', () => {
        (0, globals_1.it)('should return same instance', () => {
            resetForensicsLogger();
            const instance1 = getForensicsLogger();
            const instance2 = getForensicsLogger();
            (0, globals_1.expect)(instance1).toBe(instance2);
        });
        (0, globals_1.it)('should reset instance', () => {
            const instance1 = getForensicsLogger();
            resetForensicsLogger();
            const instance2 = getForensicsLogger();
            (0, globals_1.expect)(instance1).not.toBe(instance2);
        });
    });
    (0, globals_1.describe)('Severity Levels', () => {
        (0, globals_1.it)('should log with different severity levels', async () => {
            const events = [];
            logger.on('event', (e) => events.push(e));
            await logger.logSecurityEvent(testActor, 'info-event', 'info');
            await logger.logSecurityEvent(testActor, 'warning-event', 'warning');
            await logger.logSecurityEvent(testActor, 'critical-event', 'critical');
            await new Promise(resolve => setTimeout(resolve, 10));
            (0, globals_1.expect)(events.find(e => e.severity === 'info')).toBeDefined();
            (0, globals_1.expect)(events.find(e => e.severity === 'warning')).toBeDefined();
            (0, globals_1.expect)(events.find(e => e.severity === 'critical')).toBeDefined();
        });
    });
    (0, globals_1.describe)('Classification Handling', () => {
        (0, globals_1.it)('should set appropriate severity for classified data', async () => {
            const events = [];
            logger.on('event', (e) => events.push(e));
            await logger.logDataAccess(testActor, { ...testTarget, classification: 'top-secret' }, 'view');
            await new Promise(resolve => setTimeout(resolve, 10));
            (0, globals_1.expect)(events.length).toBe(1);
            (0, globals_1.expect)(events[0].severity).toBe('notice');
        });
    });
});
