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
describe('recordPoolSelectionAudit', () => {
    afterEach(() => {
        globals_1.jest.resetModules();
        delete process.env.DATABASE_URL;
    });
    it('skips gracefully when DATABASE_URL is missing', async () => {
        const warnSpy = globals_1.jest.spyOn(console, 'warn').mockImplementation(() => { });
        const { recordPoolSelectionAudit } = await Promise.resolve().then(() => __importStar(require('../pool-selection-audit')));
        await expect(recordPoolSelectionAudit({
            tenantId: 'tenant-1',
            requestId: 'req-1',
            est: { cpuSec: 1 },
        })).resolves.toBeUndefined();
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
    });
    it('inserts an audit row when database is configured', async () => {
        process.env.DATABASE_URL = 'postgres://test-db';
        const queryMock = globals_1.jest.fn();
        globals_1.jest.doMock('pg', () => ({
            Pool: globals_1.jest.fn(() => ({ query: queryMock })),
        }));
        const { recordPoolSelectionAudit } = await Promise.resolve().then(() => __importStar(require('../pool-selection-audit')));
        await recordPoolSelectionAudit({
            tenantId: 'tenant-2',
            requestId: 'req-2',
            poolId: 'pool-1',
            poolPriceUsd: 1.23,
            residency: 'us-east-1',
            est: { cpuSec: 2, gbSec: 3, egressGb: 1 },
            purpose: 'test-purpose',
        });
        expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('pool_selection_audit'), [
            'tenant-2',
            'req-2',
            'pool-1',
            1.23,
            'us-east-1',
            JSON.stringify({ cpuSec: 2, gbSec: 3, egressGb: 1 }),
            'test-purpose',
        ]);
    });
});
