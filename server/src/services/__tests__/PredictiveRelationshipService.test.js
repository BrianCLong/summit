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
const mockRun = globals_1.jest.fn();
const mockClose = globals_1.jest.fn();
const mockSession = globals_1.jest.fn().mockReturnValue({
    run: mockRun,
    close: mockClose,
});
const mockDriver = {
    session: mockSession,
};
const mockEmbeddingServiceInstance = {
    generateEmbedding: globals_1.jest.fn(),
    cosineSimilarity: globals_1.jest.fn(),
};
const mockRelationshipServiceInstance = {
    suggestRelationshipTypes: globals_1.jest.fn(),
    setDriver: globals_1.jest.fn(),
};
let PredictiveRelationshipService;
(0, globals_1.beforeAll)(async () => {
    const jestAny = globals_1.jest;
    await jestAny.unstable_mockModule('../../config/database.js', () => ({
        getNeo4jDriver: globals_1.jest.fn().mockReturnValue(mockDriver),
    }));
    await jestAny.unstable_mockModule('../EmbeddingService.js', () => ({
        default: globals_1.jest.fn().mockImplementation(() => mockEmbeddingServiceInstance),
    }));
    ({ PredictiveRelationshipService } = await Promise.resolve().then(() => __importStar(require('../PredictiveRelationshipService.js'))));
});
describe('PredictiveRelationshipService', () => {
    let service;
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
        mockSession.mockReturnValue({
            run: mockRun,
            close: mockClose,
        });
        service = new PredictiveRelationshipService(mockEmbeddingServiceInstance, mockRelationshipServiceInstance, mockDriver);
    });
    describe('predictRelationships', () => {
        it('should predict relationships based on embeddings and heuristics', async () => {
            const entityId = 'source-1';
            const sourceProps = {
                id: entityId,
                label: 'Source Entity',
                type: 'Person',
                embedding: [0.1, 0.2]
            };
            const candidateProps = {
                id: 'target-1',
                label: 'Target Entity',
                type: 'Organization'
            };
            const candidateEmbedding = [0.15, 0.25]; // Similar
            // Mock Neo4j responses
            // 1. Fetch Source
            mockRun.mockResolvedValueOnce({
                records: [{
                        get: (key) => ({ properties: sourceProps })
                    }]
            });
            // 2. Fetch Candidates
            mockRun.mockResolvedValueOnce({
                records: [{
                        get: (key) => {
                            if (key === 'target')
                                return { properties: candidateProps };
                            if (key === 'embedding')
                                return candidateEmbedding;
                            return null;
                        }
                    }]
            });
            // Mock Embedding Service
            mockEmbeddingServiceInstance.cosineSimilarity.mockReturnValue(0.95);
            // Mock Relationship Service
            mockRelationshipServiceInstance.suggestRelationshipTypes.mockReturnValue([
                { type: 'EMPLOYMENT', weight: 0.8 }
            ]);
            const results = await service.predictRelationships(entityId);
            expect(results).toHaveLength(1);
            expect(results[0].sourceId).toBe(entityId);
            expect(results[0].targetId).toBe(candidateProps.id);
            expect(results[0].suggestedType).toBe('EMPLOYMENT');
            expect(results[0].similarity).toBe(0.95);
            // Check that neo4j was called correctly
            expect(mockRun).toHaveBeenCalledTimes(2);
        });
        it('should generate missing embeddings if requested', async () => {
            const entityId = 'source-2';
            const sourceProps = {
                id: entityId,
                label: 'Source No Embedding',
                type: 'Person',
                text: 'Some text content'
            };
            const newEmbedding = [0.5, 0.5];
            // 1. Fetch Source (no embedding)
            mockRun.mockResolvedValueOnce({
                records: [{
                        get: (key) => ({ properties: sourceProps })
                    }]
            });
            // 2. Mock generation and storage
            mockEmbeddingServiceInstance.generateEmbedding.mockResolvedValue(newEmbedding);
            // 3. Mock store embedding query
            mockRun.mockResolvedValueOnce({});
            // 4. Fetch Candidates (return empty for simplicity)
            mockRun.mockResolvedValueOnce({ records: [] });
            await service.predictRelationships(entityId);
            expect(mockEmbeddingServiceInstance.generateEmbedding).toHaveBeenCalledWith({
                text: expect.stringContaining('Some text content')
            });
            // Verify update query
            expect(mockRun).toHaveBeenCalledWith(expect.stringContaining('SET e.embedding = $embedding'), expect.objectContaining({ id: entityId, embedding: newEmbedding }));
        });
    });
});
