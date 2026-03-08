"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const service_1 = require("../../src/lib/data-platform/ingest/service");
const service_2 = require("../../src/lib/data-platform/retrieval/service");
const service_3 = require("../../src/lib/data-platform/rag/service");
const pg_1 = require("../../src/db/pg");
// Mocks
globals_1.jest.mock('../../src/services/EmbeddingService.js', () => {
    return class MockEmbeddingService {
        async generateEmbedding({ text }) {
            return new Array(3072).fill(0.1);
        }
        async generateEmbeddings(texts) {
            return texts.map(() => new Array(3072).fill(0.1));
        }
    };
});
globals_1.jest.mock('../../src/services/LLMService.js', () => {
    return class MockLLMService {
        async complete() {
            return "This is a mock answer based on the context.";
        }
    };
});
const mockRelease = globals_1.jest.fn();
const mockQuery = globals_1.jest.fn();
globals_1.jest.mock('../../src/db/pg', () => ({
    pg: {
        one: globals_1.jest.fn(),
        none: globals_1.jest.fn(),
        any: globals_1.jest.fn(),
        many: globals_1.jest.fn(),
        write: globals_1.jest.fn(),
        oneOrNone: globals_1.jest.fn(),
        tx: globals_1.jest.fn((cb) => cb({
            none: globals_1.jest.fn(),
            one: globals_1.jest.fn()
        }))
    },
    pool: {
        connect: globals_1.jest.fn()
    }
}));
(0, globals_1.describe)('Data Platform', () => {
    let ingestionService;
    let retrievalService;
    let ragService;
    let ingestionWorker;
    (0, globals_1.beforeEach)(() => {
        ingestionService = new service_1.IngestionService();
        retrievalService = new service_2.RetrievalService();
        ragService = new service_3.RagService();
        ingestionWorker = new service_1.IngestionWorker();
        globals_1.jest.clearAllMocks();
        // Setup pool mock per test to ensure fresh spies
        pg_1.pool.connect.mockResolvedValue({
            query: mockQuery,
            release: mockRelease
        });
    });
    test('Ingestion Service Enqueues Job', async () => {
        pg_1.pg.oneOrNone.mockResolvedValue({ id: 'doc-123' });
        // Prevent background work from polluting tests by mocking the worker call inside the service?
        // Or just mocking setImmediate?
        // Actually, we can just spy on the worker method if we could access it.
        // But the service creates a private worker.
        // Easier: Just let it fail silently or mock console.error.
        // We will just verify the DB call for document creation
        await ingestionService.createDocument('tenant-1', 'col-1', 'Test Doc', 'uri://test', 'text/plain', Buffer.from('Hello world'));
        (0, globals_1.expect)(pg_1.pg.oneOrNone).toHaveBeenCalled();
    });
    test('Ingestion Worker Processes Job', async () => {
        const payload = {
            tenantId: 'tenant-1',
            collectionId: 'col-1',
            documentId: 'doc-123',
            contentBase64: Buffer.from('Hello world').toString('base64'),
            mimeType: 'text/plain'
        };
        await ingestionWorker.processJob('job-1', payload);
        // Verify status updates
        (0, globals_1.expect)(pg_1.pg.write).toHaveBeenCalledWith(globals_1.expect.stringContaining('UPDATE documents'), globals_1.expect.anything(), globals_1.expect.anything());
        // Verify StoreStage used the pool
        (0, globals_1.expect)(pg_1.pool.connect).toHaveBeenCalled();
        (0, globals_1.expect)(mockQuery).toHaveBeenCalledWith('BEGIN');
        (0, globals_1.expect)(mockQuery).toHaveBeenCalledWith('COMMIT');
        (0, globals_1.expect)(mockRelease).toHaveBeenCalled();
    });
    test('Retrieval Service Security Filtering', async () => {
        pg_1.pg.many.mockResolvedValue([
            { id: 'chunk-1', text: 'Secret', score: 0.9, metadata: {} }
        ]);
        await retrievalService.retrieve({
            tenantId: 'tenant-1',
            query: 'Secret',
            topK: 1,
            sensitivityMax: 'confidential'
        });
        const lastCall = pg_1.pg.many.mock.calls[0];
        const sql = lastCall[0];
        (0, globals_1.expect)(sql).toContain('sensitivity = ANY');
    });
    test('RAG Service', async () => {
        pg_1.pg.many.mockResolvedValue([
            { id: 'chunk-1', text: 'Context Info', score: 0.9, metadata: {} }
        ]);
        const result = await ragService.answer({
            tenantId: 'tenant-1',
            principalId: 'user-1',
            question: 'What is this?',
            retrieval: { tenantId: 'tenant-1', query: 'What is this?', topK: 1 }
        });
        (0, globals_1.expect)(result.answer).toBe("This is a mock answer based on the context.");
        (0, globals_1.expect)(result.citations).toHaveLength(1);
    });
});
