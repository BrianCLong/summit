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
globals_1.jest.unstable_mockModule('child_process', () => ({
    exec: globals_1.jest.fn(),
}));
globals_1.jest.unstable_mockModule('fs', () => ({
    default: {
        existsSync: globals_1.jest.fn(),
        mkdirSync: globals_1.jest.fn(),
        renameSync: globals_1.jest.fn(),
    },
    existsSync: globals_1.jest.fn(),
    mkdirSync: globals_1.jest.fn(),
    renameSync: globals_1.jest.fn(),
}));
// Dynamic imports are required after unstable_mockModule
const { BackupManager } = await Promise.resolve().then(() => __importStar(require('../BackupManager.js')));
const { exec } = await Promise.resolve().then(() => __importStar(require('child_process')));
const fs = await Promise.resolve().then(() => __importStar(require('fs')));
(0, globals_1.describe)('BackupManager', () => {
    let backupManager;
    const mockExec = exec;
    // fs default export mock
    const mockFsExistsSync = fs.default.existsSync;
    (0, globals_1.beforeEach)(() => {
        backupManager = new BackupManager();
        globals_1.jest.clearAllMocks();
        mockExec.mockImplementation(((cmd, callback) => {
            callback(null, 'stdout', 'stderr');
        }));
        mockFsExistsSync.mockReturnValue(true);
    });
    (0, globals_1.it)('should backup postgres successfully', async () => {
        const options = { outputDir: '/tmp/backups' };
        await backupManager.backupPostgres(options);
        (0, globals_1.expect)(mockExec).toHaveBeenCalledWith(globals_1.expect.stringContaining('pg_dump'), globals_1.expect.any(Function));
    });
    (0, globals_1.it)('should backup redis successfully', async () => {
        const options = { outputDir: '/tmp/backups' };
        await backupManager.backupRedis(options);
        (0, globals_1.expect)(mockExec).toHaveBeenCalledWith(globals_1.expect.stringContaining('redis-cli'), globals_1.expect.any(Function));
    });
    (0, globals_1.it)('should backup redis with password', async () => {
        process.env.REDIS_PASSWORD = 'secret';
        const options = { outputDir: '/tmp/backups' };
        await backupManager.backupRedis(options);
        (0, globals_1.expect)(mockExec).toHaveBeenCalledWith(globals_1.expect.stringContaining('-a "secret"'), globals_1.expect.any(Function));
        delete process.env.REDIS_PASSWORD;
    });
    (0, globals_1.it)('should backup neo4j successfully when neo4j-admin is present', async () => {
        const options = { outputDir: '/tmp/backups' };
        mockExec.mockImplementation(((cmd, callback) => {
            callback(null, 'ver', '');
        }));
        await backupManager.backupNeo4j(options);
        (0, globals_1.expect)(mockExec).toHaveBeenCalledWith(globals_1.expect.stringContaining('neo4j-admin database dump'), globals_1.expect.any(Function));
    });
    (0, globals_1.it)('should fail backup if exec fails', async () => {
        mockExec.mockImplementation(((cmd, callback) => {
            callback(new Error('Command failed'), '', 'stderr');
        }));
        await (0, globals_1.expect)(backupManager.backupPostgres({ outputDir: '/tmp' }))
            .rejects.toThrow('Command failed');
    });
});
