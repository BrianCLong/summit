"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const advanced_audit_system_js_1 = require("../advanced-audit-system.js");
globals_1.jest.mock('../../config/database.js', () => ({
    getPostgresPool: globals_1.jest.fn(() => null),
    getRedisClient: globals_1.jest.fn(() => null),
}));
const buildLogger = () => ({
    info: globals_1.jest.fn(),
    warn: globals_1.jest.fn(),
    error: globals_1.jest.fn(),
    debug: globals_1.jest.fn(),
});
(0, globals_1.describe)('AdvancedAuditSystem', () => {
    (0, globals_1.beforeEach)(() => {
        process.env.AUDIT_RETENTION_SCHEDULE_ENABLED = 'false';
    });
    (0, globals_1.it)('flushes audit events to the database', async () => {
        const db = {
            query: globals_1.jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        };
        const redis = {
            publish: globals_1.jest.fn().mockResolvedValue(undefined),
        };
        const logger = buildLogger();
        const system = advanced_audit_system_js_1.AdvancedAuditSystem.createForTest({
            db,
            redis,
            logger,
        });
        await system.recordEvent({
            eventType: 'user_action',
            level: 'info',
            correlationId: 'corr-123',
            tenantId: 'tenant-1',
            serviceId: 'realtime',
            action: 'comment.added',
            outcome: 'success',
            message: 'Comment added',
            details: { commentId: 'comment-1' },
            complianceRelevant: true,
            complianceFrameworks: [],
            userId: 'user-1',
        });
        const insertCall = db.query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO audit_events'));
        (0, globals_1.expect)(insertCall).toBeDefined();
        await system.shutdown();
    });
    (0, globals_1.it)('prunes audit events based on retention policy', async () => {
        const db = {
            query: globals_1.jest
                .fn()
                .mockResolvedValueOnce({ rows: [], rowCount: 0 })
                .mockResolvedValueOnce({ rows: [], rowCount: 7 }),
        };
        const logger = buildLogger();
        const system = advanced_audit_system_js_1.AdvancedAuditSystem.createForTest({
            db,
            redis: null,
            logger,
        });
        const deleted = await system.pruneExpiredEvents(30);
        (0, globals_1.expect)(deleted).toBe(7);
        const deleteCall = db.query.mock.calls.find(([sql]) => String(sql).includes('DELETE FROM audit_events'));
        (0, globals_1.expect)(deleteCall).toBeDefined();
        await system.shutdown();
    });
});
