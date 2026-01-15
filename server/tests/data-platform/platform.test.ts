import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { IngestionService, IngestionWorker } from '../../src/lib/data-platform/ingest/service';
import { RetrievalService } from '../../src/lib/data-platform/retrieval/service';
import { RagService } from '../../src/lib/data-platform/rag/service';
import { pg, pool } from '../../src/db/pg';

// Mocks
jest.mock('../../src/services/EmbeddingService.js', () => {
    return class MockEmbeddingService {
        async generateEmbedding({ text }: { text: string }) {
            return new Array(3072).fill(0.1);
        }
        async generateEmbeddings(texts: string[]) {
            return texts.map(() => new Array(3072).fill(0.1));
        }
    }
});

jest.mock('../../src/services/LLMService.js', () => {
    return class MockLLMService {
        async complete() {
            return "This is a mock answer based on the context.";
        }
    }
});

const mockRelease = jest.fn();
const mockQuery = jest.fn();

jest.mock('../../src/db/pg', () => ({
    pg: {
        one: jest.fn(),
        none: jest.fn(),
        any: jest.fn(),
        many: jest.fn(),
        write: jest.fn(),
        oneOrNone: jest.fn(),
        tx: jest.fn((cb) => cb({
            none: jest.fn(),
            one: jest.fn()
        }))
    },
    pool: {
        connect: jest.fn()
    }
}));

describe('Data Platform', () => {
    let ingestionService: IngestionService;
    let retrievalService: RetrievalService;
    let ragService: RagService;
    let ingestionWorker: IngestionWorker;

    beforeEach(() => {
        ingestionService = new IngestionService();
        retrievalService = new RetrievalService();
        ragService = new RagService();
        ingestionWorker = new IngestionWorker();
        jest.clearAllMocks();

        // Setup pool mock per test to ensure fresh spies
        (pool.connect as jest.Mock).mockResolvedValue({
            query: mockQuery,
            release: mockRelease
        });
    });

    test('Ingestion Service Enqueues Job', async () => {
        ((pg as any).oneOrNone as jest.Mock).mockResolvedValue({ id: 'doc-123' });

        // Prevent background work from polluting tests by mocking the worker call inside the service?
        // Or just mocking setImmediate?
        // Actually, we can just spy on the worker method if we could access it.
        // But the service creates a private worker.
        // Easier: Just let it fail silently or mock console.error.

        // We will just verify the DB call for document creation
        await ingestionService.createDocument(
            'tenant-1', 'col-1', 'Test Doc', 'uri://test', 'text/plain', Buffer.from('Hello world')
        );

        expect((pg as any).oneOrNone).toHaveBeenCalled();
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
        expect(pg.write).toHaveBeenCalledWith(expect.stringContaining('UPDATE documents'), expect.anything(), expect.anything());

        // Verify StoreStage used the pool
        expect(pool.connect).toHaveBeenCalled();
        expect(mockQuery).toHaveBeenCalledWith('BEGIN');
        expect(mockQuery).toHaveBeenCalledWith('COMMIT');
        expect(mockRelease).toHaveBeenCalled();
    });

    test('Retrieval Service Security Filtering', async () => {
        ((pg as any).many as jest.Mock).mockResolvedValue([
            { id: 'chunk-1', text: 'Secret', score: 0.9, metadata: {} }
        ]);

        await retrievalService.retrieve({
            tenantId: 'tenant-1',
            query: 'Secret',
            topK: 1,
            sensitivityMax: 'confidential'
        });

        const lastCall = ((pg as any).many as jest.Mock).mock.calls[0];
        const sql = lastCall[0];
        expect(sql).toContain('sensitivity = ANY');
    });

    test('RAG Service', async () => {
        ((pg as any).many as jest.Mock).mockResolvedValue([
             { id: 'chunk-1', text: 'Context Info', score: 0.9, metadata: {} }
        ]);

        const result = await ragService.answer({
            tenantId: 'tenant-1',
            principalId: 'user-1',
            question: 'What is this?',
            retrieval: { tenantId: 'tenant-1', query: 'What is this?', topK: 1 }
        });

        expect(result.answer).toBe("This is a mock answer based on the context.");
        expect(result.citations).toHaveLength(1);
    });
});
