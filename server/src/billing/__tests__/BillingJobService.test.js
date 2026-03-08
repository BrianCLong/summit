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
const mockGetPostgresPool = globals_1.jest.fn();
const mockGenerateAndExportReport = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('../../config/database.js', () => ({
    getPostgresPool: mockGetPostgresPool,
}));
globals_1.jest.unstable_mockModule('../../config/logger.js', () => ({
    __esModule: true,
    default: {
        info: globals_1.jest.fn(),
        warn: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
    },
}));
globals_1.jest.unstable_mockModule('../BillingService.js', () => ({
    billingService: {
        generateAndExportReport: mockGenerateAndExportReport,
    },
}));
const { BillingJobService } = await Promise.resolve().then(() => __importStar(require('../BillingJobService.js')));
const { getPostgresPool } = await Promise.resolve().then(() => __importStar(require('../../config/database.js')));
const { billingService } = await Promise.resolve().then(() => __importStar(require('../BillingService.js')));
describe('BillingJobService', () => {
    let jobService;
    let mockQuery;
    let mockRelease;
    let mockConnect;
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
        mockQuery = globals_1.jest.fn();
        mockRelease = globals_1.jest.fn();
        mockConnect = globals_1.jest.fn();
        mockConnect.mockResolvedValue({
            query: mockQuery,
            release: mockRelease,
        });
        getPostgresPool.mockReturnValue({
            connect: mockConnect,
        });
        jobService = new BillingJobService();
    });
    it('processes billing when advisory lock is acquired', async () => {
        mockQuery
            .mockResolvedValueOnce({ rows: [{ acquired: true }] })
            .mockResolvedValueOnce({ rows: [{ tenant_id: 'tenant-1' }, { tenant_id: 'tenant-2' }] })
            .mockResolvedValue({ rows: [] });
        await jobService.processBillingClose();
        expect(mockConnect).toHaveBeenCalled();
        expect(mockQuery.mock.calls[0][0]).toMatch(/pg_try_advisory_lock/i);
        expect(mockQuery.mock.calls[0][1]).toEqual(expect.any(Array));
        expect(billingService.generateAndExportReport).toHaveBeenCalledTimes(2);
        const hasUnlock = mockQuery.mock.calls.some((call) => /pg_advisory_unlock/i.test(call[0]));
        expect(hasUnlock).toBe(true);
        expect(mockRelease).toHaveBeenCalled();
    });
    it('skips processing when advisory lock is held elsewhere', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ acquired: false }] });
        await jobService.processBillingClose({ lockTimeoutMs: 1 });
        expect(billingService.generateAndExportReport).not.toHaveBeenCalled();
        expect(mockQuery).toHaveBeenCalled();
        const hasUnlock = mockQuery.mock.calls.some((call) => /pg_advisory_unlock/i.test(call[0]));
        expect(hasUnlock).toBe(false);
        expect(mockRelease).toHaveBeenCalled();
    });
});
