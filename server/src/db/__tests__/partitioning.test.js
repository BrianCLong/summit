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
// Mock dependencies
const mockQuery = globals_1.jest.fn();
const mockClient = {
    query: mockQuery,
    release: globals_1.jest.fn(),
};
const mockPool = {
    connect: globals_1.jest.fn(() => Promise.resolve(mockClient)),
};
globals_1.jest.unstable_mockModule('../postgres.js', () => ({
    getPostgresPool: globals_1.jest.fn(() => mockPool),
}));
globals_1.jest.unstable_mockModule('../../services/ColdStorageService.js', () => ({
    coldStorageService: {
        archivePartition: globals_1.jest.fn(),
    },
}));
globals_1.jest.unstable_mockModule('../../utils/logger.js', () => ({
    __esModule: true,
    default: {
        info: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
    },
}));
globals_1.jest.unstable_mockModule('../../cache/redis.js', () => ({
    RedisService: {
        getInstance: globals_1.jest.fn(() => ({})),
    },
}));
(0, globals_1.describe)('PartitionManager', () => {
    let PartitionManager;
    let getPostgresPool;
    let coldStorageService;
    let partitionManager;
    (0, globals_1.beforeAll)(async () => {
        ({ PartitionManager } = await Promise.resolve().then(() => __importStar(require('../partitioning.js'))));
        ({ getPostgresPool } = await Promise.resolve().then(() => __importStar(require('../postgres.js'))));
        ({ coldStorageService } = await Promise.resolve().then(() => __importStar(require('../../services/ColdStorageService.js'))));
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        getPostgresPool.mockReturnValue(mockPool);
        mockPool.connect.mockResolvedValue(mockClient);
        partitionManager = new PartitionManager();
    });
    (0, globals_1.describe)('createTenantPartition', () => {
        (0, globals_1.it)('should create a partition if it does not exist', async () => {
            mockQuery.mockImplementation((query) => {
                if (typeof query === 'string' && query.includes('SELECT to_regclass')) {
                    return Promise.resolve({ rows: [{ to_regclass: null }] });
                }
                return Promise.resolve({ rows: [] });
            });
            await partitionManager.createTenantPartition('tenant-1');
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith('BEGIN');
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('CREATE TABLE maestro_runs_tenant1'));
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith('COMMIT');
        });
        (0, globals_1.it)('should skip creation if partition exists', async () => {
            mockQuery.mockImplementation((query) => {
                if (typeof query === 'string' && query.includes('SELECT to_regclass')) {
                    return Promise.resolve({ rows: [{ to_regclass: 'exists' }] });
                }
                return Promise.resolve({ rows: [] });
            });
            await partitionManager.createTenantPartition('tenant-1');
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith('BEGIN');
            (0, globals_1.expect)(mockClient.query).not.toHaveBeenCalledWith(globals_1.expect.stringContaining('CREATE TABLE'));
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith('COMMIT');
        });
    });
    (0, globals_1.describe)('detachOldPartitions', () => {
        (0, globals_1.it)('should detach and archive old partitions', async () => {
            const now = new Date();
            const oldDate = new Date(now.getFullYear(), now.getMonth() - 13, 1);
            const newDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            const formatName = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                return `audit_logs_y${year}m${month}`;
            };
            const oldPartition = formatName(oldDate);
            const newPartition = formatName(newDate);
            // Mock finding partitions
            mockQuery.mockImplementation((query) => {
                if (typeof query === 'string' && query.includes('SELECT inhrelid')) {
                    return Promise.resolve({
                        rows: [
                            { partition_name: oldPartition },
                            { partition_name: newPartition }
                        ]
                    });
                }
                return Promise.resolve({ rows: [] });
            });
            await partitionManager.detachOldPartitions(['audit_logs'], 12);
            // Should detach/archve older partition
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith(globals_1.expect.stringContaining(`DETACH PARTITION ${oldPartition}`));
            (0, globals_1.expect)(coldStorageService.archivePartition).toHaveBeenCalledWith('audit_logs', oldPartition, true);
            // Should NOT detach newer partition
            (0, globals_1.expect)(mockClient.query).not.toHaveBeenCalledWith(globals_1.expect.stringContaining(`DETACH PARTITION ${newPartition}`));
        });
    });
});
