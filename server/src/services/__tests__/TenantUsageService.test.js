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
const readMock = globals_1.jest.fn();
const getPostgresPoolMock = globals_1.jest.fn();
const loggerErrorMock = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('../../config/database.js', () => ({
    getPostgresPool: getPostgresPoolMock,
}));
globals_1.jest.unstable_mockModule('../../utils/logger.js', () => ({
    default: {
        error: loggerErrorMock,
    },
}));
(0, globals_1.describe)('TenantUsageService', () => {
    let TenantUsageService;
    (0, globals_1.beforeAll)(async () => {
        ({ TenantUsageService } = await Promise.resolve().then(() => __importStar(require('../TenantUsageService.js'))));
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        readMock.mockReset();
        getPostgresPoolMock.mockReturnValue({
            read: readMock,
        });
    });
    (0, globals_1.it)('aggregates totals and breakdowns by workflow and environment', async () => {
        readMock
            .mockResolvedValueOnce({
            rows: [
                { kind: 'maestro.runs', unit: 'runs', total_quantity: '5' },
                { kind: 'external_api.requests', unit: 'requests', total_quantity: '12' },
            ],
        })
            .mockResolvedValueOnce({
            rows: [
                { workflow: 'ingest', kind: 'maestro.runs', unit: 'runs', total_quantity: '3' },
                { workflow: 'ingest', kind: 'external_api.requests', unit: 'requests', total_quantity: '8' },
                { workflow: 'review', kind: 'maestro.runs', unit: 'runs', total_quantity: '2' },
            ],
        })
            .mockResolvedValueOnce({
            rows: [
                { environment: 'prod', kind: 'maestro.runs', unit: 'runs', total_quantity: '4' },
                { environment: 'prod', kind: 'external_api.requests', unit: 'requests', total_quantity: '10' },
                { environment: 'staging', kind: 'external_api.requests', unit: 'requests', total_quantity: '2' },
            ],
        })
            .mockResolvedValueOnce({
            rows: [
                { workflow: 'ingest', environment: 'prod', kind: 'maestro.runs', unit: 'runs', total_quantity: '3' },
                { workflow: 'ingest', environment: 'prod', kind: 'external_api.requests', unit: 'requests', total_quantity: '8' },
                { workflow: 'review', environment: 'prod', kind: 'maestro.runs', unit: 'runs', total_quantity: '1' },
                { workflow: 'review', environment: 'staging', kind: 'maestro.runs', unit: 'runs', total_quantity: '1' },
            ],
        });
        const service = new TenantUsageService();
        const result = await service.getTenantUsage('tenant-1', '7d');
        (0, globals_1.expect)(result.tenantId).toBe('tenant-1');
        (0, globals_1.expect)(result.totals).toEqual([
            { kind: 'maestro.runs', unit: 'runs', total: 5 },
            { kind: 'external_api.requests', unit: 'requests', total: 12 },
        ]);
        const ingestWorkflow = result.breakdown.byWorkflow.find((entry) => entry.workflow === 'ingest');
        (0, globals_1.expect)(ingestWorkflow?.totals).toEqual([
            { kind: 'maestro.runs', unit: 'runs', total: 3 },
            { kind: 'external_api.requests', unit: 'requests', total: 8 },
        ]);
        const prodEnv = result.breakdown.byEnvironment.find((entry) => entry.environment === 'prod');
        (0, globals_1.expect)(prodEnv?.totals).toEqual([
            { kind: 'maestro.runs', unit: 'runs', total: 4 },
            { kind: 'external_api.requests', unit: 'requests', total: 10 },
        ]);
        (0, globals_1.expect)(result.breakdown.byWorkflowEnvironment).toEqual([
            {
                workflow: 'ingest',
                environment: 'prod',
                totals: [
                    { kind: 'maestro.runs', unit: 'runs', total: 3 },
                    { kind: 'external_api.requests', unit: 'requests', total: 8 },
                ],
            },
            {
                workflow: 'review',
                environment: 'prod',
                totals: [{ kind: 'maestro.runs', unit: 'runs', total: 1 }],
            },
            {
                workflow: 'review',
                environment: 'staging',
                totals: [{ kind: 'maestro.runs', unit: 'runs', total: 1 }],
            },
        ]);
        (0, globals_1.expect)(readMock).toHaveBeenCalledTimes(4);
    });
    (0, globals_1.it)('rejects invalid range keys', () => {
        const service = new TenantUsageService();
        (0, globals_1.expect)(() => service.getUsageRange('invalid')).toThrow('Invalid range');
    });
});
