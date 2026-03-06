
import { jest } from '@jest/globals';

// Use unstable_mockModule for ESM mocking

// Mock Redis
jest.unstable_mockModule('../cache/redis.js', () => ({
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
jest.unstable_mockModule('../db/postgres.js', () => ({
    getPostgresPool: () => ({
        connect: async () => ({
            query: async () => ({ rows: [{ to_regclass: null }] }), // Mock no existing partition
            release: () => {},
        }),
    }),
}));

// Mock Logger
const loggerMock = {
    info: () => {},
    error: () => {},
    warn: () => {},
};
jest.unstable_mockModule('../config/logger.js', () => ({
    logger: loggerMock,
    default: loggerMock,
}));

// Mock ColdStorage
jest.unstable_mockModule('../services/ColdStorageService.js', () => ({
    coldStorageService: {
        archivePartition: async () => {},
        upload: async () => {},
    }
}));

// Mock Neo4j
jest.unstable_mockModule('../db/neo4j.js', () => ({
    getNeo4jDriver: () => ({
        session: () => ({
            run: async () => ({ records: [] }),
            close: async () => {},
        }),
    }),
}));

// Mock FS
jest.unstable_mockModule('fs/promises', () => ({
    mkdir: async () => {},
    writeFile: async () => {},
    stat: async () => ({ size: 100 }),
    unlink: async () => {},
    default: {
        mkdir: async () => {},
        writeFile: async () => {},
        stat: async () => ({ size: 100 }),
        unlink: async () => {},
    }
}));

// Mock child_process
jest.unstable_mockModule('child_process', () => ({
    exec: (cmd: string, cb: any) => cb(null, { stdout: 'done', stderr: '' }),
    default: {
        exec: (cmd: string, cb: any) => cb(null, { stdout: 'done', stderr: '' }),
    }
}));

// Import modules under test dynamically
const { RedisService } = await import('../cache/redis.js');
const { PartitionManager } = await import('../db/partitioning.js');
const { BackupService } = await import('../backup/BackupService.js');

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
