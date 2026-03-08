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
describe('slow query logging', () => {
    let baseLogger;
    let correlationStorage;
    let __private;
    let mockLogger;
    beforeAll(async () => {
        globals_1.jest.resetModules();
        // @ts-ignore - dynamic import for test harness
        ({ logger: baseLogger, correlationStorage } = (await Promise.resolve().then(() => __importStar(require('../../src/config/logger')))));
        mockLogger = {
            warn: globals_1.jest.fn(),
            info: globals_1.jest.fn(),
            error: globals_1.jest.fn(),
            child: globals_1.jest.fn(),
        };
        baseLogger.child.mockReturnValue(mockLogger);
        // @ts-ignore - dynamic import for test harness
        ({ __private } = (await Promise.resolve().then(() => __importStar(require('../../src/db/postgres')))));
    });
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
        baseLogger.child.mockReturnValue(mockLogger);
    });
    it('emits a structured log for slow queries', () => {
        const store = new Map([
            ['traceId', 'trace-123'],
            ['tenantId', 'tenant-abc'],
        ]);
        correlationStorage.getStore.mockReturnValue(store);
        __private.recordSlowQuery('stmt_test', 312, 'write', 'SELECT * FROM users');
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.objectContaining({
            pool: 'write',
            durationMs: 312,
            queryName: 'stmt_test',
            traceId: 'trace-123',
            tenantId: 'tenant-abc',
        }), 'Slow PostgreSQL query detected');
    });
});
