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
const promises_1 = __importDefault(require("fs/promises"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
let DisasterRecoveryService;
const mockRedisSet = globals_1.jest.fn();
const mockRedisGet = globals_1.jest.fn();
const resolved = (value) => globals_1.jest.fn().mockImplementation(async () => value);
(0, globals_1.beforeAll)(async () => {
    globals_1.jest.resetModules();
    await globals_1.jest.unstable_mockModule('../../src/cache/redis.js', () => ({
        RedisService: {
            getInstance: globals_1.jest.fn(() => ({
                set: mockRedisSet,
                get: mockRedisGet,
            })),
        },
    }));
    await globals_1.jest.unstable_mockModule('../../src/config/logger.js', () => ({
        default: {
            info: globals_1.jest.fn(),
            warn: globals_1.jest.fn(),
            error: globals_1.jest.fn(),
            debug: globals_1.jest.fn(),
            child: () => ({
                info: globals_1.jest.fn(),
                warn: globals_1.jest.fn(),
                error: globals_1.jest.fn(),
                debug: globals_1.jest.fn(),
            }),
        },
        logger: {
            child: () => ({
                info: globals_1.jest.fn(),
                warn: globals_1.jest.fn(),
                error: globals_1.jest.fn(),
                debug: globals_1.jest.fn(),
            }),
        },
        correlationStorage: {
            getStore: globals_1.jest.fn(),
            run: globals_1.jest.fn(),
            enterWith: globals_1.jest.fn(),
        },
        info: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        debug: globals_1.jest.fn(),
    }));
    ({ DisasterRecoveryService } = await Promise.resolve().then(() => __importStar(require('../../src/dr/DisasterRecoveryService.js'))));
});
(0, globals_1.describe)('Disaster recovery restore validation', () => {
    (0, globals_1.beforeEach)(() => {
        mockRedisSet.mockClear();
        mockRedisSet.mockImplementation(async () => undefined);
        mockRedisGet.mockImplementation(async () => null);
        delete process.env.BACKUP_ROOT_DIR;
    });
    (0, globals_1.afterEach)(async () => {
        if (process.env.BACKUP_ROOT_DIR) {
            await promises_1.default.rm(process.env.BACKUP_ROOT_DIR, { recursive: true, force: true });
            delete process.env.BACKUP_ROOT_DIR;
        }
    });
    (0, globals_1.it)('records a failed drill when backups are missing', async () => {
        const service = new DisasterRecoveryService();
        const recordSpy = resolved(undefined);
        service.recordDrillResult = recordSpy;
        service.listBackups = resolved([]);
        const result = await service.runDrill('postgres');
        (0, globals_1.expect)(result).toBe(false);
        (0, globals_1.expect)(recordSpy).toHaveBeenCalledWith(false, globals_1.expect.any(Number), globals_1.expect.any(String));
    });
    (0, globals_1.it)('records a successful drill when backups are available', async () => {
        const service = new DisasterRecoveryService();
        const recordSpy = resolved(undefined);
        service.recordDrillResult = recordSpy;
        const rootDir = await promises_1.default.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'dr-backups-'));
        process.env.BACKUP_ROOT_DIR = rootDir;
        const backupDir = path_1.default.join(rootDir, 'postgres', '2026-01-01');
        await promises_1.default.mkdir(backupDir, { recursive: true });
        await promises_1.default.writeFile(path_1.default.join(backupDir, 'backup.sql'), 'stub');
        service.listBackups = resolved(['2026-01-01']);
        service.verifyPostgresRestore = resolved(undefined);
        const result = await service.runDrill('postgres');
        const errorMessage = recordSpy.mock.calls[0]?.[2];
        (0, globals_1.expect)(errorMessage).toBeUndefined();
        (0, globals_1.expect)(result).toBe(true);
        (0, globals_1.expect)(recordSpy).toHaveBeenCalledWith(true, globals_1.expect.any(Number));
    });
});
