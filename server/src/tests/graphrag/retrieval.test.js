"use strict";
/**
 * GraphRAG Retrieval Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
jest.mock('../../config/database', () => ({
    getPostgresPool: jest.fn(() => ({
        connect: jest.fn(),
        query: jest.fn(),
        end: jest.fn(),
    })),
    getRedisClient: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        on: jest.fn(),
        quit: jest.fn(),
        subscribe: jest.fn(),
    })),
}));
const retrieval_js_1 = require("../../services/graphrag/retrieval.js");
const CaseGraphRepository_js_1 = require("../../services/graphrag/repositories/CaseGraphRepository.js");
const EvidenceRepository_js_1 = require("../../services/graphrag/repositories/EvidenceRepository.js");
(0, globals_1.describe)('GraphRAG Retrieval', () => {
    let caseGraphRepo;
    let evidenceRepo;
    // Test data
    const testCaseId = 'case-123';
    const testNodes = [
        { id: 'node-1', type: 'Person', label: 'John Smith', properties: { role: 'suspect' } },
        { id: 'node-2', type: 'Person', label: 'Jane Doe', properties: { role: 'witness' } },
        { id: 'node-3', type: 'Location', label: 'Downtown Office', properties: { city: 'NYC' } },
        { id: 'node-4', type: 'Event', label: 'Meeting', properties: { date: '2024-01-15' } },
        { id: 'node-5', type: 'Document', label: 'Contract', properties: { status: 'signed' } },
    ];
    const testEdges = [
        { id: 'edge-1', type: 'MET_WITH', fromId: 'node-1', toId: 'node-2', properties: {} },
        { id: 'edge-2', type: 'LOCATED_AT', fromId: 'node-1', toId: 'node-3', properties: {} },
        { id: 'edge-3', type: 'ATTENDED', fromId: 'node-2', toId: 'node-4', properties: {} },
        { id: 'edge-4', type: 'SIGNED', fromId: 'node-1', toId: 'node-5', properties: {} },
    ];
    const testEvidence = [
        {
            evidenceId: 'ev-1',
            claimId: 'claim-1',
            sourceSystem: 'email',
            snippet: 'John Smith met with Jane Doe on January 15th at the downtown office.',
            score: 0.9,
        },
        {
            evidenceId: 'ev-2',
            claimId: 'claim-2',
            sourceSystem: 'document',
            snippet: 'The contract was signed by John Smith on January 20th.',
            score: 0.8,
        },
        {
            evidenceId: 'ev-3',
            sourceSystem: 'interview',
            snippet: 'Jane Doe witnessed the signing of the document.',
            score: 0.7,
        },
    ];
    (0, globals_1.beforeEach)(() => {
        caseGraphRepo = new CaseGraphRepository_js_1.InMemoryCaseGraphRepository();
        evidenceRepo = new EvidenceRepository_js_1.InMemoryEvidenceRepository();
        // Set up test data
        caseGraphRepo.addCaseData(testCaseId, testNodes, testEdges);
        evidenceRepo.addCaseEvidence(testCaseId, testEvidence);
    });
    (0, globals_1.describe)('retrieveGraphContext', () => {
        (0, globals_1.it)('should retrieve nodes and edges for a case', async () => {
            const req = {
                caseId: testCaseId,
                question: 'Who met with John Smith?',
                userId: 'user-1',
            };
            const result = await (0, retrieval_js_1.retrieveGraphContext)(req, { maxNodes: 10, maxDepth: 3, maxEvidenceSnippets: 5 }, caseGraphRepo, evidenceRepo);
            (0, globals_1.expect)(result.context.nodes.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.context.edges.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should retrieve evidence snippets matching the question', async () => {
            const req = {
                caseId: testCaseId,
                question: 'When did John meet Jane?',
                userId: 'user-1',
            };
            const result = await (0, retrieval_js_1.retrieveGraphContext)(req, { maxNodes: 10, maxDepth: 3, maxEvidenceSnippets: 5 }, caseGraphRepo, evidenceRepo);
            (0, globals_1.expect)(result.context.evidenceSnippets.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.context.evidenceSnippets.some((e) => e.snippet.toLowerCase().includes('john'))).toBe(true);
        });
        (0, globals_1.it)('should respect maxNodes limit', async () => {
            const req = {
                caseId: testCaseId,
                question: 'Tell me about this case',
                userId: 'user-1',
            };
            const result = await (0, retrieval_js_1.retrieveGraphContext)(req, { maxNodes: 2, maxDepth: 3, maxEvidenceSnippets: 5 }, caseGraphRepo, evidenceRepo);
            (0, globals_1.expect)(result.context.nodes.length).toBeLessThanOrEqual(2);
        });
        (0, globals_1.it)('should respect maxEvidenceSnippets limit', async () => {
            const req = {
                caseId: testCaseId,
                question: 'What happened?',
                userId: 'user-1',
            };
            const result = await (0, retrieval_js_1.retrieveGraphContext)(req, { maxNodes: 10, maxDepth: 3, maxEvidenceSnippets: 1 }, caseGraphRepo, evidenceRepo);
            (0, globals_1.expect)(result.context.evidenceSnippets.length).toBeLessThanOrEqual(1);
        });
        (0, globals_1.it)('should return empty context for non-existent case', async () => {
            const req = {
                caseId: 'non-existent-case',
                question: 'What happened?',
                userId: 'user-1',
            };
            const result = await (0, retrieval_js_1.retrieveGraphContext)(req, { maxNodes: 10, maxDepth: 3, maxEvidenceSnippets: 5 }, caseGraphRepo, evidenceRepo);
            (0, globals_1.expect)(result.context.nodes.length).toBe(0);
            (0, globals_1.expect)(result.context.evidenceSnippets.length).toBe(0);
        });
    });
    (0, globals_1.describe)('buildLlmContextPayload', () => {
        (0, globals_1.it)('should build LLM-ready context from retrieval result', async () => {
            const req = {
                caseId: testCaseId,
                question: 'Who signed the contract?',
                userId: 'user-1',
            };
            const retrievalResult = await (0, retrieval_js_1.retrieveGraphContext)(req, { maxNodes: 10, maxDepth: 3, maxEvidenceSnippets: 5 }, caseGraphRepo, evidenceRepo);
            const payload = (0, retrieval_js_1.buildLlmContextPayload)(req, retrievalResult);
            (0, globals_1.expect)(payload.question).toBe(req.question);
            (0, globals_1.expect)(payload.caseId).toBe(req.caseId);
            (0, globals_1.expect)(payload.nodes).toBeDefined();
            (0, globals_1.expect)(payload.edges).toBeDefined();
            (0, globals_1.expect)(payload.evidenceSnippets).toBeDefined();
        });
        (0, globals_1.it)('should extract key properties from nodes', async () => {
            const req = {
                caseId: testCaseId,
                question: 'Tell me about John',
                userId: 'user-1',
            };
            const retrievalResult = await (0, retrieval_js_1.retrieveGraphContext)(req, { maxNodes: 10, maxDepth: 3, maxEvidenceSnippets: 5 }, caseGraphRepo, evidenceRepo);
            const payload = (0, retrieval_js_1.buildLlmContextPayload)(req, retrievalResult);
            // Nodes should have keyProperties extracted
            for (const node of payload.nodes) {
                (0, globals_1.expect)(node.keyProperties).toBeDefined();
            }
        });
    });
    (0, globals_1.describe)('getContextSummary', () => {
        (0, globals_1.it)('should return correct counts', () => {
            const context = {
                nodes: testNodes,
                edges: testEdges,
                evidenceSnippets: testEvidence,
            };
            const summary = (0, retrieval_js_1.getContextSummary)(context);
            (0, globals_1.expect)(summary.numNodes).toBe(5);
            (0, globals_1.expect)(summary.numEdges).toBe(4);
            (0, globals_1.expect)(summary.numEvidenceSnippets).toBe(3);
        });
        (0, globals_1.it)('should handle empty context', () => {
            const context = {
                nodes: [],
                edges: [],
                evidenceSnippets: [],
            };
            const summary = (0, retrieval_js_1.getContextSummary)(context);
            (0, globals_1.expect)(summary.numNodes).toBe(0);
            (0, globals_1.expect)(summary.numEdges).toBe(0);
            (0, globals_1.expect)(summary.numEvidenceSnippets).toBe(0);
        });
    });
    (0, globals_1.describe)('getValidEvidenceIds', () => {
        (0, globals_1.it)('should return set of evidence IDs', () => {
            const ids = (0, retrieval_js_1.getValidEvidenceIds)(testEvidence);
            (0, globals_1.expect)(ids.has('ev-1')).toBe(true);
            (0, globals_1.expect)(ids.has('ev-2')).toBe(true);
            (0, globals_1.expect)(ids.has('ev-3')).toBe(true);
            (0, globals_1.expect)(ids.has('ev-99')).toBe(false);
        });
    });
    (0, globals_1.describe)('getValidClaimIds', () => {
        (0, globals_1.it)('should return set of claim IDs', () => {
            const ids = (0, retrieval_js_1.getValidClaimIds)(testEvidence);
            (0, globals_1.expect)(ids.has('claim-1')).toBe(true);
            (0, globals_1.expect)(ids.has('claim-2')).toBe(true);
            // ev-3 has no claimId
            (0, globals_1.expect)(ids.size).toBe(2);
        });
    });
});
