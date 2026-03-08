"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const RetrievalService_js_1 = require("../RetrievalService.js");
const pg_1 = require("pg");
// Mock KnowledgeRepository and EmbeddingService
globals_1.jest.mock('../KnowledgeRepository.js');
globals_1.jest.mock('../../services/EmbeddingService.js', () => {
    return globals_1.jest.fn().mockImplementation(() => ({
        config: { provider: 'test', model: 'test-model' },
        generateEmbedding: globals_1.jest.fn()
    }));
});
// Mock DB Pool
const mockPool = new pg_1.Pool();
(0, globals_1.describe)('RetrievalService', () => {
    let service;
    let mockRepo;
    (0, globals_1.beforeEach)(() => {
        // Reset mocks
        globals_1.jest.clearAllMocks();
        // Initialize service (which mocks EmbeddingService inside)
        service = new RetrievalService_js_1.RetrievalService(mockPool);
        // Manually mock the method on the instance
        service.embeddingService.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
        // Access the mocked repository instance
        // @ts-ignore
        mockRepo = service.repo;
    });
    (0, globals_1.describe)('search', () => {
        (0, globals_1.it)('should route semantic queries to searchVector', async () => {
            const query = {
                tenantId: 'tenant-1',
                queryKind: 'semantic',
                queryText: 'test query'
            };
            // Mock repo response
            mockRepo.searchVector.mockResolvedValue([
                {
                    object: { id: 'obj-1', title: 'Test' },
                    score: 0.9
                }
            ]);
            const result = await service.search(query);
            (0, globals_1.expect)(result.items).toHaveLength(1);
            (0, globals_1.expect)(mockRepo.searchVector).toHaveBeenCalled();
            (0, globals_1.expect)(mockRepo.searchKeyword).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should route keyword queries to searchKeyword', async () => {
            const query = {
                tenantId: 'tenant-1',
                queryKind: 'keyword',
                queryText: 'test query'
            };
            mockRepo.searchKeyword.mockResolvedValue([
                {
                    object: { id: 'obj-2', title: 'Test 2' },
                    score: 0.5
                }
            ]);
            const result = await service.search(query);
            (0, globals_1.expect)(result.items).toHaveLength(1);
            (0, globals_1.expect)(mockRepo.searchKeyword).toHaveBeenCalled();
            (0, globals_1.expect)(mockRepo.searchVector).not.toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('indexObject', () => {
        (0, globals_1.it)('should upsert object and generate embedding if body exists', async () => {
            const obj = {
                id: 'obj-1',
                tenantId: 'tenant-1',
                kind: 'document',
                title: 'Test Doc',
                body: 'This is a test document.',
                metadata: {},
                source: {},
                timestamps: { createdAt: new Date().toISOString() }
            };
            await service.indexObject(obj);
            (0, globals_1.expect)(mockRepo.upsertKnowledgeObject).toHaveBeenCalledWith(obj);
            // We expect upsertEmbedding to be called because body is present
            (0, globals_1.expect)(mockRepo.upsertEmbedding).toHaveBeenCalled();
        });
        (0, globals_1.it)('should not generate embedding if body is empty', async () => {
            const obj = {
                id: 'obj-1',
                tenantId: 'tenant-1',
                kind: 'graph_entity',
                title: 'Entity',
                metadata: {},
                source: {},
                timestamps: { createdAt: new Date().toISOString() }
            };
            await service.indexObject(obj);
            (0, globals_1.expect)(mockRepo.upsertKnowledgeObject).toHaveBeenCalledWith(obj);
            (0, globals_1.expect)(mockRepo.upsertEmbedding).not.toHaveBeenCalled();
        });
    });
});
