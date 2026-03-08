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
// Use unstable_mockModule for ESM mocking
// Mock Redis
globals_1.jest.unstable_mockModule('../cache/redis.js', () => ({
    RedisService: {
        getInstance: () => ({
            ping: async () => 'PONG',
            getClient: () => ({
                bgsave: async () => 'OK',
                nodes: () => [],
                lpush: async () => 1,
                ltrim: async () => 'OK',
            }),
        }),
    }
}));
// Mock Postgres
globals_1.jest.unstable_mockModule('../db/postgres.js', () => ({
    getPostgresPool: () => ({
        connect: async () => ({
            query: async () => ({ rows: [{ to_regclass: null }] }), // Mock no existing partition
            release: () => { },
        }),
    }),
}));
// Mock Logger
const loggerMock = {
    info: () => { },
    error: () => { },
    warn: () => { },
};
globals_1.jest.unstable_mockModule('../config/logger.js', () => ({
    logger: loggerMock,
    default: loggerMock,
}));
// Mock ColdStorage
globals_1.jest.unstable_mockModule('../services/ColdStorageService.js', () => ({
    coldStorageService: {
        archivePartition: async () => { },
        upload: async () => { },
    }
}));
// Mock Neo4j
globals_1.jest.unstable_mockModule('../db/neo4j.js', () => ({
    getNeo4jDriver: () => ({
        session: () => ({
            run: async () => ({ records: [] }),
            close: async () => { },
        }),
    }),
}));
// Mock FS
globals_1.jest.unstable_mockModule('fs/promises', () => ({
    mkdir: async () => { },
    writeFile: async () => { },
    stat: async () => ({ size: 100 }),
    unlink: async () => { },
    default: {
        mkdir: async () => { },
        writeFile: async () => { },
        stat: async () => ({ size: 100 }),
        unlink: async () => { },
    }
}));
// Mock child_process
globals_1.jest.unstable_mockModule('child_process', () => ({
    exec: (cmd, cb) => cb(null, { stdout: 'done', stderr: '' }),
    default: {
        exec: (cmd, cb) => cb(null, { stdout: 'done', stderr: '' }),
    }
}));
// Import modules under test dynamically
const { RedisService } = await Promise.resolve().then(() => __importStar(require('../cache/redis.js')));
const { PartitionManager } = await Promise.resolve().then(() => __importStar(require('../db/partitioning.js')));
const { BackupService } = await Promise.resolve().then(() => __importStar(require('../backup/BackupService.js')));
describe('Infrastructure Components', () => {
    it('RedisService mock should work', async () => {
        const redis = RedisService.getInstance();
        expect(redis).toBeDefined();
        const pong = await redis.ping();
        expect(pong).toBe('PONG');
    });
    it('PartitionManager should be instantiable and methods callable', async () => {
        const manager = new PartitionManager();
        await expect(manager.createMonthlyPartition('audit_logs', new Date())).resolves.not.toThrow();
    });
    it('BackupService should run Redis backup', async () => {
        const backupService = new BackupService();
        await expect(backupService.backupRedis({ uploadToS3: false })).resolves.not.toThrow();
    });
});
