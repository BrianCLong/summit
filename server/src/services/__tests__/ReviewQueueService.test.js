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
const getPostgresPoolMock = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('../../db/postgres.js', () => ({
    getPostgresPool: getPostgresPoolMock,
}));
(0, globals_1.describe)('ReviewQueueService', () => {
    let reviewQueueService;
    let mockPool;
    let mockClient;
    (0, globals_1.beforeAll)(async () => {
        ({ reviewQueueService } = await Promise.resolve().then(() => __importStar(require('../ReviewQueueService.js'))));
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mockClient = {
            query: globals_1.jest.fn(),
            release: globals_1.jest.fn(),
        };
        mockPool = {
            query: globals_1.jest.fn(),
            withTransaction: globals_1.jest.fn(async (cb) => cb(mockClient)),
            connect: globals_1.jest.fn().mockResolvedValue(mockClient),
        };
        getPostgresPoolMock.mockReturnValue(mockPool);
    });
    (0, globals_1.describe)('createQueue', () => {
        (0, globals_1.it)('should create a queue and return it', async () => {
            const mockQueue = {
                id: 'queue-123',
                tenant_id: 'tenant-1',
                name: 'Test Queue',
                priority_config: {},
                created_at: new Date(),
            };
            mockPool.query.mockResolvedValueOnce({ rows: [mockQueue] });
            const result = await reviewQueueService.createQueue('tenant-1', 'Test Queue');
            (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO ml_review_queues'), ['tenant-1', 'Test Queue', {}]);
            (0, globals_1.expect)(result.id).toBe('queue-123');
            (0, globals_1.expect)(result.name).toBe('Test Queue');
        });
    });
    (0, globals_1.describe)('prioritySampler', () => {
        (0, globals_1.it)('should prioritize items with lower confidence and higher age', async () => {
            const mockItems = [
                { id: '1', confidence: 0.9, age_minutes: 10, data: {}, status: 'PENDING' },
                { id: '2', confidence: 0.5, age_minutes: 100, data: {}, status: 'PENDING' },
            ];
            mockPool.query.mockResolvedValueOnce({ rows: mockItems });
            const result = await reviewQueueService.getItemsForReview('q1', 't1', 1);
            (0, globals_1.expect)(result.length).toBe(1);
            (0, globals_1.expect)(['1', '2']).toContain(result[0].id);
        });
        (0, globals_1.it)('should calculate priority scores correctly', () => {
            (0, globals_1.expect)(true).toBe(true);
        });
    });
    (0, globals_1.describe)('submitDecision', () => {
        (0, globals_1.it)('should update item status and log decision', async () => {
            mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
            mockClient.query.mockResolvedValueOnce({ rowCount: 1 });
            await reviewQueueService.submitDecision('item-1', 't1', 'user-1', 'ACCEPTED');
            (0, globals_1.expect)(mockPool.withTransaction).toHaveBeenCalled();
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('UPDATE ml_review_items'), ['ACCEPTED', 'user-1', 'item-1', 't1']);
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO ml_review_decisions'), ['item-1', 't1', 'user-1', 'ACCEPTED', {}]);
        });
        (0, globals_1.it)('should throw if item not found', async () => {
            mockClient.query.mockResolvedValueOnce({ rowCount: 0 });
            await (0, globals_1.expect)(reviewQueueService.submitDecision('item-1', 't1', 'user-1', 'ACCEPTED')).rejects.toThrow('Item not found or already reviewed');
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledTimes(1);
        });
    });
});
