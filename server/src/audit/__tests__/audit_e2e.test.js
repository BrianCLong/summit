"use strict";
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
// Define mock instances
const mPool = {
    query: globals_1.jest.fn(),
    connect: globals_1.jest.fn(),
    on: globals_1.jest.fn(),
};
const mRedis = {
    publish: globals_1.jest.fn(),
    subscribe: globals_1.jest.fn(),
    on: globals_1.jest.fn(),
};
// Mock modules using unstable_mockModule for ESM support
globals_1.jest.unstable_mockModule('pg', () => ({
    Pool: globals_1.jest.fn(() => mPool),
}));
globals_1.jest.unstable_mockModule('ioredis', () => ({
    default: globals_1.jest.fn(() => mRedis),
}));
// Dynamic import for the system under test
const { getAuditSystem } = await Promise.resolve().then(() => __importStar(require('../index.js')));
(0, globals_1.describe)('Audit Logging End-to-End', () => {
    let auditSystem;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mPool.query.mockResolvedValue({ rows: [], rowCount: 1 });
        auditSystem = getAuditSystem();
    });
    (0, globals_1.it)('should emit and store an audit event (who saw what when)', async () => {
        const event = {
            action: 'VIEW_DOCUMENT',
            actor: { id: 'user-123', role: 'admin' },
            target: { id: 'doc-456', type: 'document' },
            tenantId: 'tenant-1',
            details: { foo: 'bar' },
        };
        await auditSystem.recordEvent(event);
        (0, globals_1.expect)(mPool.query).toHaveBeenCalled();
        const callArgs = mPool.query.mock.calls[0];
        const sql = callArgs[0];
        const params = callArgs[1];
        (0, globals_1.expect)(sql).toMatch(/INSERT INTO audit_log/i);
        // Verify payload contains critical fields
        const paramString = JSON.stringify(params);
        (0, globals_1.expect)(paramString).toContain('user-123');
        (0, globals_1.expect)(paramString).toContain('doc-456');
        (0, globals_1.expect)(paramString).toContain('VIEW_DOCUMENT');
    });
    (0, globals_1.it)('should query events from the store', async () => {
        const mockRow = {
            id: 'evt-1',
            action: 'VIEW_DOCUMENT',
            actor_id: 'user-123',
            timestamp: new Date(),
            details: { foo: 'bar' }
        };
        mPool.query.mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 });
        // The queryEvents signature depends on implementation, passing generic filter
        const results = await auditSystem.queryEvents({ actorId: 'user-123' });
        (0, globals_1.expect)(mPool.query).toHaveBeenCalled();
        (0, globals_1.expect)(results).toHaveLength(1);
        (0, globals_1.expect)(results[0].id).toBe('evt-1');
    });
});
