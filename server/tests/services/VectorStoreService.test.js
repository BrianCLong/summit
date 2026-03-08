"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const VectorStoreService_js_1 = require("../../src/services/VectorStoreService.js");
const postgres_js_1 = require("../../src/db/postgres.js");
const EmbeddingService_js_1 = __importDefault(require("../../src/services/EmbeddingService.js"));
// Mock EmbeddingService
globals_1.jest.mock('../../src/services/EmbeddingService.js');
// Mock Postgres Pool
// Mock Postgres Pool
const mockPoolFactory = () => ({
    write: globals_1.jest.fn(),
    read: globals_1.jest.fn(),
    withTransaction: globals_1.jest.fn((callback) => callback({
        query: globals_1.jest.fn(),
        release: globals_1.jest.fn(),
    })),
});
globals_1.jest.mock('../../src/db/postgres', () => ({
    __esModule: true,
    getPostgresPool: globals_1.jest.fn().mockReturnValue({
        write: globals_1.jest.fn(),
        read: globals_1.jest.fn(),
        withTransaction: globals_1.jest.fn((callback) => callback({
            query: globals_1.jest.fn(),
            release: globals_1.jest.fn(),
        })),
    }),
}));
globals_1.jest.mock('../../src/db/postgres.js', () => ({
    __esModule: true,
    getPostgresPool: globals_1.jest.fn().mockReturnValue({
        write: globals_1.jest.fn(),
        read: globals_1.jest.fn(),
        withTransaction: globals_1.jest.fn((callback) => callback({
            query: globals_1.jest.fn(),
            release: globals_1.jest.fn(),
        })),
    }),
}));
(0, globals_1.describe)('VectorStoreService', () => {
    let service;
    let mockGenerateEmbedding;
    let pool; // Changed from mockPool
    beforeEach(async () => {
        // Reset mocks
        globals_1.jest.clearAllMocks();
        console.log('VectorStoreService Test: getPostgresPool type:', typeof postgres_js_1.getPostgresPool);
        if (typeof postgres_js_1.getPostgresPool === 'function') {
            console.log('VectorStoreService Test: getPostgresPool return:', (0, postgres_js_1.getPostgresPool)());
        }
        else {
            console.log('VectorStoreService Test: getPostgresPool is not a function');
        }
        pool = (0, postgres_js_1.getPostgresPool)(); // Assign to 'pool'
        // Mock EmbeddingService
        EmbeddingService_js_1.default.mockImplementation(() => ({
            generateEmbeddings: globals_1.jest.fn().mockResolvedValue([
                [0.1, 0.2, 0.3],
                [0.4, 0.5, 0.6],
            ]),
            generateEmbedding: globals_1.jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
        }));
        // Singleton reset
        VectorStoreService_js_1.VectorStoreService.instance = null;
        service = VectorStoreService_js_1.VectorStoreService.getInstance();
    });
    (0, globals_1.afterAll)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.it)('should ingest a document correctly', async () => {
        const tenantId = 'tenant-123';
        const docData = {
            title: 'Test Doc',
            content: 'Hello world. This is a test.',
            metadata: { author: 'Jules' },
        };
        mockPool.write.mockResolvedValueOnce({ rowCount: 1 }); // Insert doc
        const result = await service.ingestDocument(tenantId, docData);
        (0, globals_1.expect)(result.chunkCount).toBeGreaterThan(0);
        (0, globals_1.expect)(mockPool.write).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO documents'), globals_1.expect.arrayContaining([tenantId, docData.title]));
        // Check if transaction was called for chunks
        (0, globals_1.expect)(mockPool.withTransaction).toHaveBeenCalled();
    });
    (0, globals_1.it)('should search for documents', async () => {
        const tenantId = 'tenant-123';
        const query = 'Hello';
        // Mock search result
        mockPool.read.mockResolvedValueOnce({
            rows: [
                {
                    id: 'chunk-1',
                    document_id: 'doc-1',
                    chunk_index: 0,
                    content: 'Hello world',
                    metadata: {},
                    similarity: 0.9
                }
            ]
        });
        const results = await service.search(query, { tenantId });
        (0, globals_1.expect)(results).toHaveLength(1);
        (0, globals_1.expect)(results[0].content).toBe('Hello world');
        (0, globals_1.expect)(mockGenerateEmbedding).toHaveBeenCalledWith({ text: query });
        (0, globals_1.expect)(mockPool.read).toHaveBeenCalledWith(globals_1.expect.stringContaining('SELECT'), globals_1.expect.arrayContaining([tenantId]));
    });
});
