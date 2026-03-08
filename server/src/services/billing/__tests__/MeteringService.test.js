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
const types_js_1 = require("../../../lib/billing/types.js");
const mockPool = {
    connect: globals_1.jest.fn(),
    query: globals_1.jest.fn(),
};
const mockAppendEntry = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('../../../db/pg', () => ({ pool: mockPool }));
globals_1.jest.unstable_mockModule('../../../provenance/ledger', () => ({
    provenanceLedger: {
        appendEntry: mockAppendEntry,
    },
}));
globals_1.jest.unstable_mockModule('../../../lib/resources/quota-manager', () => ({
    __esModule: true,
    default: {
        getQuotaForTenant: globals_1.jest.fn().mockReturnValue({}),
    },
}));
const { MeteringService } = await Promise.resolve().then(() => __importStar(require('../MeteringService.js')));
const { pool } = await Promise.resolve().then(() => __importStar(require('../../../db/pg.js')));
const { provenanceLedger } = await Promise.resolve().then(() => __importStar(require('../../../provenance/ledger.js')));
(0, globals_1.describe)('MeteringService', () => {
    let meteringService;
    let mockClient;
    (0, globals_1.beforeAll)(() => {
        mockClient = {
            query: globals_1.jest.fn(),
            release: globals_1.jest.fn(),
        };
        pool.connect.mockImplementation(async () => mockClient);
        meteringService = MeteringService.getInstance();
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        pool.connect.mockImplementation(async () => mockClient);
    });
    (0, globals_1.it)('should record usage and log to provenance ledger', async () => {
        const event = {
            tenantId: 'tenant-123',
            eventType: types_js_1.BillableEventType.READ_QUERY,
            quantity: 1,
            unit: 'query',
            timestamp: new Date(),
            idempotencyKey: 'key-1',
            actorId: 'user-1'
        };
        // Mock DB insert success
        mockClient.query.mockImplementation((sql) => {
            if (sql.includes('INSERT')) {
                return Promise.resolve({ rows: [{ id: 'evt-1' }] });
            }
            return Promise.resolve({ rows: [] });
        });
        const receipt = await meteringService.recordUsage(event);
        (0, globals_1.expect)(receipt.eventId).toBe('evt-1');
        (0, globals_1.expect)(receipt.status).toBe('recorded');
        (0, globals_1.expect)(provenanceLedger.appendEntry).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            actionType: 'BILLABLE_EVENT',
            resourceId: 'evt-1'
        }));
        (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
    (0, globals_1.it)('should handle duplicates idempotently', async () => {
        const event = {
            tenantId: 'tenant-123',
            eventType: types_js_1.BillableEventType.READ_QUERY,
            quantity: 1,
            unit: 'query',
            timestamp: new Date(),
            idempotencyKey: 'key-1',
        };
        // BEGIN succeeds, INSERT throws unique violation, ROLLBACK succeeds
        mockClient.query
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce({ code: '23505' })
            .mockResolvedValueOnce(undefined);
        // Mock fetch existing
        pool.query.mockImplementation(async () => ({ rows: [{ id: 'evt-existing' }] }));
        const receipt = await meteringService.recordUsage(event);
        (0, globals_1.expect)(receipt.eventId).toBe('evt-existing');
        (0, globals_1.expect)(receipt.status).toBe('duplicate');
        (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        // Should NOT log to provenance again for duplicate
        (0, globals_1.expect)(provenanceLedger.appendEntry).not.toHaveBeenCalled();
    });
    (0, globals_1.it)('should generate usage preview', async () => {
        const rows = [
            { kind: 'read_query', total_quantity: '100', unit: 'query' },
            { kind: 'planning_run', total_quantity: '5', unit: 'run' }
        ];
        pool.query.mockImplementation(async () => ({ rows }));
        const preview = await meteringService.getUsagePreview('tenant-1', new Date(), new Date());
        (0, globals_1.expect)(preview.breakdown['read_query'].quantity).toBe(100);
        (0, globals_1.expect)(preview.breakdown['planning_run'].quantity).toBe(5);
        (0, globals_1.expect)(preview.totalCost).toBeGreaterThan(0);
    });
});
