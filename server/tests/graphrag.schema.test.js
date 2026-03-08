"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GraphRAGService_js_1 = require("../src/services/GraphRAGService.js");
const globals_1 = require("@jest/globals");
(0, globals_1.test)('graphRagAnswer validates JSON schema', async () => {
    const mockNeo4jDriver = {
        session: () => ({
            run: globals_1.jest.fn().mockResolvedValue({
                records: [
                    {
                        get: (key) => {
                            if (key === 'nodes') {
                                return [
                                    {
                                        properties: {
                                            id: 'ent1',
                                            type: 'Person',
                                            label: 'John Doe',
                                            properties: '{}',
                                        },
                                    },
                                ];
                            }
                            if (key === 'relationships') {
                                return [
                                    {
                                        properties: {
                                            id: 'rel1',
                                            type: 'WORKS_AT',
                                            fromEntityId: 'ent1',
                                            toEntityId: 'ent2',
                                            properties: '{}',
                                        },
                                    },
                                ];
                            }
                        },
                    },
                ],
            }),
            close: globals_1.jest.fn(),
        }),
    };
    const mockLlmService = {
        complete: globals_1.jest.fn().mockResolvedValue(JSON.stringify({
            answer: 'John Doe works at Acme Corp.',
            confidence: 0.9,
            citations: { entityIds: ['ent1'] },
            why_paths: [
                { from: 'ent1', to: 'ent2', relId: 'rel1', type: 'WORKS_AT' },
            ],
        })),
    };
    const mockEmbeddingService = {
        generateEmbedding: globals_1.jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    };
    const svc = new GraphRAGService_js_1.GraphRAGService(mockNeo4jDriver, mockLlmService, mockEmbeddingService);
    const res = await svc.answer({ investigationId: 'inv1', question: 'Test?' });
    (0, globals_1.expect)(res.answer.length).toBeGreaterThan(0);
    (0, globals_1.expect)(res.why_paths).toBeInstanceOf(Array);
});
