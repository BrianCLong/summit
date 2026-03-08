"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ai_js_1 = require("../resolvers/ai.js");
const node_crypto_1 = require("node:crypto");
const globals_1 = require("@jest/globals");
const node_module_1 = require("node:module");
const require = (0, node_module_1.createRequire)(import.meta.url);
// Mock dependencies
globals_1.jest.mock('axios');
globals_1.jest.mock('jsonwebtoken');
globals_1.jest.mock('../realtime/pubsub.js');
const mockAxios = require('axios');
const mockJwt = require('jsonwebtoken');
const mockPubsub = require('../realtime/pubsub');
(0, globals_1.describe)('AI Integration', () => {
    let mockContext;
    let mockDb;
    let mockNeo4j;
    (0, globals_1.beforeEach)(() => {
        // Setup mock database
        mockDb = {
            jobs: {
                insert: globals_1.jest.fn(),
                findById: globals_1.jest.fn(),
                update: globals_1.jest.fn(),
            },
            insights: {
                insert: globals_1.jest.fn(),
                findMany: globals_1.jest.fn(),
                update: globals_1.jest.fn(),
                markApplied: globals_1.jest.fn(),
            },
            audit: {
                insert: globals_1.jest.fn(),
            },
            feedback: {
                insert: globals_1.jest.fn(),
            },
        };
        // Setup mock Neo4j
        mockNeo4j = {
            session: globals_1.jest.fn(() => ({
                run: globals_1.jest.fn().mockResolvedValue({
                    records: [
                        {
                            get: globals_1.jest
                                .fn()
                                .mockReturnValueOnce('node1')
                                .mockReturnValueOnce('node2'),
                        },
                        {
                            get: globals_1.jest
                                .fn()
                                .mockReturnValueOnce('node3')
                                .mockReturnValueOnce('node4'),
                        },
                    ],
                }),
                close: globals_1.jest.fn(),
            })),
        };
        // Setup mock context
        mockContext = {
            user: { id: 'user123', roles: ['analyst'] },
            db: mockDb,
            neo4j: mockNeo4j,
            config: { publicBaseUrl: 'http://localhost:4000' },
        };
        // Setup mock responses
        mockJwt.sign.mockReturnValue('mock-jwt-token');
        mockAxios.post.mockResolvedValue({
            data: { queued: true, task_id: 'task123' },
        });
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('Entity Extraction', () => {
        (0, globals_1.it)('should queue entity extraction job', async () => {
            const docs = [{ id: 'doc1', text: 'Test document with entities' }];
            const jobId = (0, node_crypto_1.randomUUID)();
            const result = await ai_js_1.AIResolvers.Mutation.aiExtractEntities(null, { docs, jobId }, mockContext);
            (0, globals_1.expect)(mockDb.jobs.insert).toHaveBeenCalledWith({
                id: jobId,
                kind: 'nlp_entities',
                status: 'QUEUED',
                createdAt: globals_1.expect.any(String),
                meta: globals_1.expect.objectContaining({ docs }),
            });
            (0, globals_1.expect)(mockAxios.post).toHaveBeenCalledWith('http://intelgraph-ml:8081/nlp/entities', globals_1.expect.objectContaining({
                docs,
                job_id: jobId,
                callback_url: 'http://localhost:4000/ai/webhook',
            }), globals_1.expect.objectContaining({
                headers: { Authorization: 'Bearer mock-jwt-token' },
            }));
            (0, globals_1.expect)(result).toEqual({
                id: jobId,
                kind: 'nlp_entities',
                status: 'QUEUED',
                createdAt: globals_1.expect.any(String),
            });
        });
    });
    (0, globals_1.describe)('Entity Resolution', () => {
        (0, globals_1.it)('should queue entity resolution job', async () => {
            const records = [
                { id: 'e1', name: 'John Smith' },
                { id: 'e2', name: 'J. Smith' },
            ];
            const threshold = 0.85;
            const result = await ai_js_1.AIResolvers.Mutation.aiResolveEntities(null, { records, threshold }, mockContext);
            (0, globals_1.expect)(mockDb.jobs.insert).toHaveBeenCalled();
            (0, globals_1.expect)(mockAxios.post).toHaveBeenCalledWith('http://intelgraph-ml:8081/er/resolve', globals_1.expect.objectContaining({ records, threshold }), globals_1.expect.any(Object));
            (0, globals_1.expect)(result.kind).toBe('entity_resolution');
        });
    });
    (0, globals_1.describe)('Link Prediction', () => {
        (0, globals_1.it)('should fetch graph edges and queue link prediction', async () => {
            const graphSnapshotId = 'snapshot123';
            const topK = 10;
            const result = await ai_js_1.AIResolvers.Mutation.aiLinkPredict(null, { graphSnapshotId, topK }, mockContext);
            // Verify graph edges were fetched
            (0, globals_1.expect)(mockNeo4j.session).toHaveBeenCalled();
            // Verify job was queued
            (0, globals_1.expect)(mockDb.jobs.insert).toHaveBeenCalled();
            (0, globals_1.expect)(mockAxios.post).toHaveBeenCalledWith('http://intelgraph-ml:8081/graph/link_predict', globals_1.expect.objectContaining({
                graph_snapshot_id: graphSnapshotId,
                top_k: topK,
                edges: globals_1.expect.any(Array),
            }), globals_1.expect.any(Object));
            (0, globals_1.expect)(result.kind).toBe('link_prediction');
        });
    });
    (0, globals_1.describe)('Community Detection', () => {
        (0, globals_1.it)('should fetch graph edges and queue community detection', async () => {
            const graphSnapshotId = 'snapshot456';
            const result = await ai_js_1.AIResolvers.Mutation.aiCommunityDetect(null, { graphSnapshotId }, mockContext);
            (0, globals_1.expect)(mockNeo4j.session).toHaveBeenCalled();
            (0, globals_1.expect)(mockDb.jobs.insert).toHaveBeenCalled();
            (0, globals_1.expect)(mockAxios.post).toHaveBeenCalledWith('http://intelgraph-ml:8081/graph/community_detect', globals_1.expect.objectContaining({
                graph_snapshot_id: graphSnapshotId,
                edges: globals_1.expect.any(Array),
            }), globals_1.expect.any(Object));
            (0, globals_1.expect)(result.kind).toBe('community_detect');
        });
    });
    (0, globals_1.describe)('Insight Management', () => {
        (0, globals_1.it)('should approve insight and create audit trail', async () => {
            const insightId = (0, node_crypto_1.randomUUID)();
            const userId = 'user123';
            mockDb.insights.update.mockResolvedValue({
                id: insightId,
                status: 'APPROVED',
                decidedAt: globals_1.expect.any(String),
                decidedBy: userId,
            });
            const result = await ai_js_1.AIResolvers.Mutation.approveInsight(null, { id: insightId }, { db: mockDb, user: { id: userId } });
            (0, globals_1.expect)(mockDb.insights.update).toHaveBeenCalledWith(insightId, globals_1.expect.objectContaining({
                status: 'APPROVED',
                decidedBy: userId,
            }));
            (0, globals_1.expect)(mockDb.audit.insert).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                type: 'INSIGHT_DECISION',
                actorId: userId,
                meta: globals_1.expect.objectContaining({
                    insightId,
                    status: 'APPROVED',
                }),
            }));
            (0, globals_1.expect)(mockDb.feedback.insert).toHaveBeenCalled();
        });
        (0, globals_1.it)('should reject insight with reason', async () => {
            const insightId = (0, node_crypto_1.randomUUID)();
            const userId = 'user123';
            const reason = 'Insufficient confidence';
            mockDb.insights.update.mockResolvedValue({
                id: insightId,
                status: 'REJECTED',
                decidedAt: globals_1.expect.any(String),
                decidedBy: userId,
            });
            const result = await ai_js_1.AIResolvers.Mutation.rejectInsight(null, { id: insightId, reason }, { db: mockDb, user: { id: userId } });
            (0, globals_1.expect)(mockDb.insights.update).toHaveBeenCalledWith(insightId, globals_1.expect.objectContaining({
                status: 'REJECTED',
                decidedBy: userId,
            }));
            (0, globals_1.expect)(mockDb.audit.insert).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                meta: globals_1.expect.objectContaining({
                    reason,
                }),
            }));
        });
    });
    (0, globals_1.describe)('Query Operations', () => {
        (0, globals_1.it)('should retrieve AI job by ID', async () => {
            const jobId = (0, node_crypto_1.randomUUID)();
            const mockJob = {
                id: jobId,
                kind: 'nlp_entities',
                status: 'SUCCESS',
                createdAt: '2023-01-01T00:00:00Z',
            };
            mockDb.jobs.findById.mockResolvedValue(mockJob);
            const result = await ai_js_1.AIResolvers.Query.aiJob(null, { id: jobId }, { db: mockDb });
            (0, globals_1.expect)(mockDb.jobs.findById).toHaveBeenCalledWith(jobId);
            (0, globals_1.expect)(result).toEqual(mockJob);
        });
        (0, globals_1.it)('should retrieve insights with filters', async () => {
            const mockInsights = [
                {
                    id: (0, node_crypto_1.randomUUID)(),
                    kind: 'link_prediction',
                    status: 'PENDING',
                    payload: [{ u: 'a', v: 'b', score: 0.95 }],
                },
            ];
            mockDb.insights.findMany.mockResolvedValue(mockInsights);
            const result = await ai_js_1.AIResolvers.Query.insights(null, { status: 'PENDING', kind: 'link_prediction' }, { db: mockDb });
            (0, globals_1.expect)(mockDb.insights.findMany).toHaveBeenCalledWith({
                status: 'PENDING',
                kind: 'link_prediction',
            });
            (0, globals_1.expect)(result).toEqual(mockInsights);
        });
    });
    (0, globals_1.describe)('Error Handling', () => {
        (0, globals_1.it)('should handle ML service errors gracefully', async () => {
            mockAxios.post.mockRejectedValue(new Error('ML service unavailable'));
            await (0, globals_1.expect)(ai_js_1.AIResolvers.Mutation.aiExtractEntities(null, { docs: [{ id: 'doc1', text: 'test' }] }, mockContext)).rejects.toThrow('ML service unavailable');
            // Job should still be inserted and marked failed if ML service fails
            (0, globals_1.expect)(mockDb.jobs.insert).toHaveBeenCalled();
            (0, globals_1.expect)(mockDb.jobs.update).toHaveBeenCalledWith(globals_1.expect.any(String), globals_1.expect.objectContaining({
                status: 'FAILED',
                error: 'ML service unavailable',
            }));
        });
        (0, globals_1.it)('should handle database errors', async () => {
            mockDb.jobs.insert.mockRejectedValue(new Error('Database error'));
            await (0, globals_1.expect)(ai_js_1.AIResolvers.Mutation.aiExtractEntities(null, { docs: [{ id: 'doc1', text: 'test' }] }, mockContext)).rejects.toThrow('Database error');
        });
        (0, globals_1.it)('should handle Neo4j errors in graph operations', async () => {
            mockNeo4j.session.mockImplementation(() => ({
                run: globals_1.jest.fn().mockRejectedValue(new Error('Neo4j connection failed')),
                close: globals_1.jest.fn(),
            }));
            await (0, globals_1.expect)(ai_js_1.AIResolvers.Mutation.aiLinkPredict(null, { graphSnapshotId: 'snap1', topK: 10 }, mockContext)).rejects.toThrow('Neo4j connection failed');
        });
    });
});
