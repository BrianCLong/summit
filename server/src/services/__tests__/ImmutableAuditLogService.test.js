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
const mockedFs = {
    mkdir: globals_1.jest.fn(),
    appendFile: globals_1.jest.fn(),
    readdir: globals_1.jest.fn(),
    access: globals_1.jest.fn(),
    stat: globals_1.jest.fn(),
    readFile: globals_1.jest.fn(),
    rm: globals_1.jest.fn(),
    writeFile: globals_1.jest.fn(),
};
globals_1.jest.unstable_mockModule('fs/promises', () => ({
    ...mockedFs,
    default: mockedFs,
}));
(0, globals_1.describe)('ImmutableAuditLogService', () => {
    let service;
    let ImmutableAuditLogService;
    (0, globals_1.beforeAll)(async () => {
        const module = await Promise.resolve().then(() => __importStar(require('../ImmutableAuditLogService.js')));
        ImmutableAuditLogService = module.ImmutableAuditLogService;
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mockedFs.mkdir.mockResolvedValue(undefined);
        mockedFs.appendFile.mockResolvedValue(undefined);
        mockedFs.readdir.mockResolvedValue([]);
        mockedFs.access.mockRejectedValue(new Error('ENOENT'));
        mockedFs.stat.mockResolvedValue({ size: 0 });
        mockedFs.readFile.mockResolvedValue('');
        mockedFs.rm.mockResolvedValue(undefined);
        mockedFs.writeFile.mockResolvedValue(undefined);
        service = new ImmutableAuditLogService({
            logPath: './test-audits',
            enabled: true,
            batchSize: 10,
            backpressureThreshold: 100,
        });
    });
    (0, globals_1.it)('queues and processes audit events', async () => {
        await service.logAuditEvent({
            eventType: 'TEST',
            userId: 'user1',
            tenantId: 'tenant1',
            action: 'test',
            resource: 'resource1',
            result: 'success',
            ipAddress: '127.0.0.1',
            currentHash: '',
            signature: '',
        });
        await service.processQueuedEvents();
        (0, globals_1.expect)(mockedFs.mkdir).toHaveBeenCalled();
        (0, globals_1.expect)(mockedFs.appendFile).toHaveBeenCalled();
        const appendCall = mockedFs.appendFile.mock.calls[0];
        const filePath = appendCall[0];
        const content = appendCall[1];
        (0, globals_1.expect)(filePath).toContain('test-audits');
        (0, globals_1.expect)(content).toContain('"eventType":"TEST"');
        (0, globals_1.expect)(content).toContain('"userId":"user1"');
    });
    (0, globals_1.it)('batches multiple events into a single write', async () => {
        const eventCount = 5;
        service.isProcessing = true;
        for (let i = 0; i < eventCount; i++) {
            await service.logAuditEvent({
                eventType: 'BATCH_TEST',
                userId: `user${i}`,
                tenantId: 'tenant1',
                action: 'test',
                resource: `resource${i}`,
                result: 'success',
                ipAddress: '127.0.0.1',
                currentHash: '',
                signature: '',
            });
        }
        service.isProcessing = false;
        await service.processQueuedEvents();
        const calls = mockedFs.appendFile.mock.calls;
        (0, globals_1.expect)(calls.length).toBe(1);
        const allContent = calls[0][1];
        for (let i = 0; i < eventCount; i++) {
            (0, globals_1.expect)(allContent).toContain(`"userId":"user${i}"`);
        }
    });
});
