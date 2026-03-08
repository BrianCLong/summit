"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const pino_1 = __importDefault(require("pino"));
// Mock dependencies
const mockQuery = globals_1.jest.fn();
const mockPool = {
    query: mockQuery,
};
const mockRedis = {
    publish: globals_1.jest.fn(),
};
const mockLogger = pino_1.default({ level: 'silent' });
(0, globals_1.describe)('AdvancedAuditSystem', () => {
    let auditSystem;
    const signingKey = 'test-signing-key';
    const encryptionKey = 'test-encryption-key';
    const { AdvancedAuditSystem } = globals_1.jest.requireActual('../../audit/advanced-audit-system.js');
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mockQuery.mockResolvedValue({ rows: [] });
        auditSystem = AdvancedAuditSystem.createForTest({
            db: mockPool,
            redis: mockRedis,
            logger: mockLogger,
            signingKey,
            encryptionKey,
        });
    });
    afterEach(async () => {
        await auditSystem.shutdown();
    });
    (0, globals_1.it)('should initialize schema on startup', async () => {
        await new Promise((resolve) => setImmediate(resolve));
        (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('CREATE TABLE IF NOT EXISTS audit_events'));
    });
    (0, globals_1.it)('should record an audit event successfully', async () => {
        const eventData = {
            eventType: 'user_login',
            action: 'login',
            outcome: 'success',
            userId: 'user-123',
            tenantId: 'tenant-1',
            serviceId: 'auth-service',
            message: 'User logged in',
            level: 'info',
            details: {},
            complianceRelevant: true,
            complianceFrameworks: ['SOC2'],
        };
        const eventId = await auditSystem.recordEvent(eventData);
        (0, globals_1.expect)(eventId).toBeDefined();
        (0, globals_1.expect)(typeof eventId).toBe('string');
        // Flush happens immediately for compliance relevant events
        (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO audit_events'), globals_1.expect.any(Array));
    });
    (0, globals_1.it)('should validate event data', async () => {
        const invalidEvent = {
            // Missing required fields
            eventType: 'user_login',
        };
        await (0, globals_1.expect)(auditSystem.recordEvent(invalidEvent)).rejects.toThrow(/Invalid audit event/);
    });
    (0, globals_1.it)('should query events', async () => {
        mockQuery.mockImplementation((query) => {
            if (typeof query === 'string' && query.includes('SELECT * FROM audit_events')) {
                return Promise.resolve({
                    rows: [
                        {
                            id: 'event-1',
                            event_type: 'user_login',
                            timestamp: new Date(),
                            // ... other fields mapped by deserializeEvent
                        },
                    ],
                });
            }
            return Promise.resolve({ rows: [] });
        });
        const events = await auditSystem.queryEvents({
            userIds: ['user-123']
        });
        (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('SELECT * FROM audit_events'), globals_1.expect.arrayContaining([['user-123']]));
        (0, globals_1.expect)(events).toHaveLength(1);
    });
});
