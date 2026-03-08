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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const getPostgresPoolMock = globals_1.jest.fn();
const getRedisClientMock = globals_1.jest.fn(() => null);
globals_1.jest.unstable_mockModule('../../config/database.js', () => ({
    getPostgresPool: getPostgresPoolMock,
    getRedisClient: getRedisClientMock,
}));
(0, globals_1.describe)('Audit Archiving and Tiered Storage', () => {
    let AuditArchivingService;
    let AdvancedAuditSystem;
    let archiver;
    let auditSystem;
    let mockPool;
    const ARCHIVE_DIR = path_1.default.join(process.cwd(), 'archive/audit');
    (0, globals_1.beforeAll)(async () => {
        const bootstrapPool = {
            query: globals_1.jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        };
        getPostgresPoolMock.mockReturnValue(bootstrapPool);
        ({ AuditArchivingService } = await Promise.resolve().then(() => __importStar(require('../AuditArchivingService.js'))));
        ({ AdvancedAuditSystem } = await Promise.resolve().then(() => __importStar(require('../../audit/advanced-audit-system.js'))));
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mockPool = {
            query: globals_1.jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        };
        getPostgresPoolMock.mockReturnValue(mockPool);
        getRedisClientMock.mockReturnValue(null);
        const system = AdvancedAuditSystem.getInstance();
        system.db = mockPool;
        auditSystem = system;
        const archiverInstance = AuditArchivingService.getInstance();
        archiverInstance.db = mockPool;
        archiver = archiverInstance;
        auditSystem.archiveThresholdDays = 1;
        auditSystem.retentionPeriodDays = 2;
        auditSystem.retentionEnabled = true;
    });
    (0, globals_1.afterEach)(() => {
        if ((0, fs_1.existsSync)(ARCHIVE_DIR)) {
            // Intentionally keeping artifacts for local debugging.
        }
    });
    (0, globals_1.it)('should archive events before pruning', async () => {
        const mockRecords = [
            {
                id: '1',
                event_type: 'user_login',
                timestamp: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000),
            },
        ];
        mockPool.query.mockResolvedValueOnce({ rows: mockRecords, rowCount: 1 });
        mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
        const deletedCount = await auditSystem.pruneExpiredEvents(2);
        (0, globals_1.expect)(deletedCount).toBe(1);
        (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('SELECT * FROM audit_events'), globals_1.expect.any(Array));
        (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('DELETE FROM audit_events'), globals_1.expect.any(Array));
        (0, globals_1.expect)(archiver).toBeDefined();
    });
    (0, globals_1.it)('should handle no records for archival gracefully', async () => {
        mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
        mockPool.query.mockResolvedValueOnce({ rowCount: 0 });
        const deletedCount = await auditSystem.pruneExpiredEvents(2);
        (0, globals_1.expect)(deletedCount).toBe(0);
    });
});
