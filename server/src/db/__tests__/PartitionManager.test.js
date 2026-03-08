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
const mockPool = {
    connect: globals_1.jest.fn(),
    write: globals_1.jest.fn(),
    read: globals_1.jest.fn(),
};
const mockClient = {
    query: globals_1.jest.fn(),
    release: globals_1.jest.fn(),
};
globals_1.jest.unstable_mockModule('../postgres.js', () => ({
    getPostgresPool: () => mockPool,
}));
globals_1.jest.unstable_mockModule('../../cache/redis.js', () => ({
    RedisService: {
        getInstance: () => ({}),
    },
}));
globals_1.jest.unstable_mockModule('../../services/ColdStorageService.js', () => ({
    coldStorageService: {
        archivePartition: globals_1.jest.fn(),
    },
}));
// Dynamic import
const { partitionManager } = await Promise.resolve().then(() => __importStar(require('../partitioning.js')));
describe('PartitionManager', () => {
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
        mockPool.connect.mockResolvedValue(mockClient);
        mockClient.query.mockResolvedValue({ rows: [] }); // Default
    });
    describe('createMonthlyPartition', () => {
        it('should create a partition if it does not exist', async () => {
            mockClient.query.mockResolvedValueOnce({}); // BEGIN
            mockClient.query.mockResolvedValueOnce({ rows: [{ to_regclass: null }] }); // Check existence (null = not exists)
            mockClient.query.mockResolvedValueOnce({}); // CREATE TABLE
            mockClient.query.mockResolvedValueOnce({}); // COMMIT
            const date = new Date('2023-01-15T00:00:00Z');
            await partitionManager.createMonthlyPartition('test_table', date);
            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            // Check for correct partition name logic (UTC)
            expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('to_regclass'), expect.any(Array));
            // Fix: expect only one argument for CREATE TABLE
            expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE'));
            // More specific checks
            const createCall = mockClient.query.mock.calls.find(call => call[0].includes('CREATE TABLE'));
            expect(createCall[0]).toContain('test_table_y2023m01');
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
            expect(mockClient.release).toHaveBeenCalled();
        });
        it('should skip creation if partition exists', async () => {
            mockClient.query.mockResolvedValueOnce({}); // BEGIN
            mockClient.query.mockResolvedValueOnce({ rows: [{ to_regclass: 'exists' }] }); // Check existence
            mockClient.query.mockResolvedValueOnce({}); // COMMIT
            const date = new Date('2023-01-15T00:00:00Z');
            await partitionManager.createMonthlyPartition('test_table', date);
            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).not.toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE'));
            expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        });
    });
    describe('detachOldPartitions', () => {
        it('should detach and archive old partitions', async () => {
            // Mock fetch partitions result
            mockClient.query.mockImplementation((query) => {
                if (query.includes('SELECT to_regclass'))
                    return Promise.resolve({ rows: [{ to_regclass: 'exists' }] });
                if (query.includes('SELECT inhrelid')) {
                    return Promise.resolve({ rows: [
                            { partition_name: 'test_table_y2020m01' }, // Old
                            { partition_name: 'test_table_y2030m01' } // Future
                        ] });
                }
                return Promise.resolve({});
            });
            await partitionManager.detachOldPartitions(['test_table'], 12); // Retention 12 months
            const { coldStorageService } = await Promise.resolve().then(() => __importStar(require('../../services/ColdStorageService.js')));
            expect(coldStorageService.archivePartition).toHaveBeenCalledWith('test_table', 'test_table_y2020m01', false, 'GLACIER');
            expect(coldStorageService.archivePartition).not.toHaveBeenCalledWith('test_table', 'test_table_y2030m01', expect.anything(), expect.anything());
        });
    });
});
