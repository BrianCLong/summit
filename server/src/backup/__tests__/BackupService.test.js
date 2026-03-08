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
const stream_1 = require("stream");
// Mocks must be hoisted
globals_1.jest.unstable_mockModule('../../cache/redis.js', () => ({
    RedisService: {
        getInstance: globals_1.jest.fn(),
    },
}));
globals_1.jest.unstable_mockModule('fs/promises', () => {
    const mock = {
        mkdir: globals_1.jest.fn().mockResolvedValue(undefined),
        stat: globals_1.jest.fn().mockResolvedValue({ size: 100 }),
        writeFile: globals_1.jest.fn().mockResolvedValue(undefined),
        unlink: globals_1.jest.fn().mockResolvedValue(undefined),
    };
    return {
        ...mock,
        default: mock
    };
});
globals_1.jest.unstable_mockModule('fs', () => ({
    createWriteStream: globals_1.jest.fn(),
    createReadStream: globals_1.jest.fn(),
}));
globals_1.jest.unstable_mockModule('@aws-sdk/client-s3', () => ({
    S3Client: globals_1.jest.fn().mockImplementation(() => ({
        send: globals_1.jest.fn().mockResolvedValue({}),
    })),
    PutObjectCommand: globals_1.jest.fn(),
}));
globals_1.jest.unstable_mockModule('../../db/neo4j.js', () => ({
    getNeo4jDriver: () => ({
        session: () => ({
            run: globals_1.jest.fn().mockReturnValue({
                records: [],
                [Symbol.asyncIterator]: async function* () { yield* []; }
            }),
            close: globals_1.jest.fn(),
        }),
    }),
}));
describe('BackupService', () => {
    let BackupServiceClass;
    let mockRedisClient;
    let backupService;
    beforeEach(async () => {
        globals_1.jest.clearAllMocks();
        mockRedisClient = {
            // Mock scanStream returning an async iterator of arrays of keys
            scanStream: globals_1.jest.fn().mockReturnValue(stream_1.Readable.from([['key1']])),
            type: globals_1.jest.fn().mockResolvedValue('string'),
            ttl: globals_1.jest.fn().mockResolvedValue(100),
            dump: globals_1.jest.fn().mockResolvedValue(Buffer.from('test')),
            lpush: globals_1.jest.fn().mockResolvedValue(1),
            ltrim: globals_1.jest.fn().mockResolvedValue('OK'),
            constructor: { name: 'Redis' }
        };
        const { RedisService } = await Promise.resolve().then(() => __importStar(require('../../cache/redis.js')));
        RedisService.getInstance.mockReturnValue({
            getClient: () => mockRedisClient,
        });
        const fs = await Promise.resolve().then(() => __importStar(require('fs')));
        fs.createWriteStream.mockReturnValue({
            write: globals_1.jest.fn(),
            end: globals_1.jest.fn(),
            on: function (event, cb) {
                if (event === 'finish')
                    cb();
                return this;
            },
            once: function (event, cb) {
                if (event === 'drain')
                    cb();
                return this;
            },
            pipe: globals_1.jest.fn()
        });
        const mod = await Promise.resolve().then(() => __importStar(require('../BackupService.js')));
        BackupServiceClass = mod.BackupService;
        backupService = new BackupServiceClass('/tmp/backups');
    });
    describe('backupRedis', () => {
        it('should perform logical backup', async () => {
            await backupService.backupRedis();
            expect(mockRedisClient.scanStream).toHaveBeenCalled();
            expect(mockRedisClient.dump).toHaveBeenCalledWith('key1');
            expect(mockRedisClient.lpush).toHaveBeenCalled();
            const fs = await Promise.resolve().then(() => __importStar(require('fs')));
            expect(fs.createWriteStream).toHaveBeenCalled();
        });
    });
});
