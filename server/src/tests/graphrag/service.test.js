"use strict";
/**
 * GraphRAG Service Tests
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
const service_js_1 = require("../../services/graphrag/service.js");
const CaseGraphRepository_js_1 = require("../../services/graphrag/repositories/CaseGraphRepository.js");
const EvidenceRepository_js_1 = require("../../services/graphrag/repositories/EvidenceRepository.js");
const llm_adapter_js_1 = require("../../services/graphrag/llm-adapter.js");
const policy_guard_js_1 = require("../../services/graphrag/policy-guard.js");
const audit_log_js_1 = require("../../services/graphrag/audit-log.js");
(0, globals_1.describe)('GraphRAG Service', () => {
    let caseGraphRepo;
    let evidenceRepo;
    let llmAdapter;
    let policyEngine;
    let auditLog;
    let service;
    // Test data
    const testCaseId = 'case-123';
    const testNodes = [
        { id: 'node-1', type: 'Person', label: 'John Smith' },
        { id: 'node-2', type: 'Person', label: 'Jane Doe' },
    ];
    const testEdges = [
        { id: 'edge-1', type: 'MET_WITH', fromId: 'node-1', toId: 'node-2' },
    ];
    const testEvidence = [
        {
            evidenceId: 'ev-1',
            claimId: 'claim-1',
            sourceSystem: 'email',
            snippet: 'John met Jane on Tuesday.',
            score: 0.9,
        },
        {
            evidenceId: 'ev-2',
            sourceSystem: 'document',
            snippet: 'Contract signed on Wednesday.',
            score: 0.8,
        },
    ];
    const testUser = {
        userId: 'user-1',
        roles: ['analyst'],
        clearances: ['SECRET'],
        cases: [testCaseId],
    };
    (0, globals_1.beforeEach)(() => {
        caseGraphRepo = new CaseGraphRepository_js_1.InMemoryCaseGraphRepository();
        evidenceRepo = new EvidenceRepository_js_1.InMemoryEvidenceRepository();
        llmAdapter = new llm_adapter_js_1.MockGraphRagLlmAdapter();
        policyEngine = new policy_guard_js_1.MockPolicyEngine();
        auditLog = new audit_log_js_1.InMemoryGraphRagAuditLog();
        // Set up test data
        caseGraphRepo.addCaseData(testCaseId, testNodes, testEdges);
        evidenceRepo.addCaseEvidence(testCaseId, testEvidence);
        service = new service_js_1.EvidenceFirstGraphRagService({
            caseGraphRepo,
            evidenceRepo,
            llmAdapter,
            policyEngine,
            auditLog,
        });
    });
    (0, globals_1.describe)('answer', () => {
        (0, globals_1.it)('should return answer with citations when evidence is available', async () => {
            const req = {
                caseId: testCaseId,
                question: 'When did John meet Jane?',
                userId: testUser.userId,
            };
            llmAdapter.setMockResponse({
                answerText: 'John met Jane on Tuesday [evidence: ev-1].',
                citations: [{ evidenceId: 'ev-1', claimId: 'claim-1' }],
                unknowns: [],
            });
            const response = await service.answer(req, testUser);
            (0, globals_1.expect)(response.answer.answerText).toContain('Tuesday');
            (0, globals_1.expect)(response.answer.citations.length).toBe(1);
            (0, globals_1.expect)(response.answer.citations[0].evidenceId).toBe('ev-1');
            (0, globals_1.expect)(response.answer.unknowns.length).toBe(0);
        });
        (0, globals_1.it)('should include unknowns when LLM reports gaps', async () => {
            const req = {
                caseId: testCaseId,
                question: 'What was discussed in the meeting?',
                userId: testUser.userId,
            };
            llmAdapter.setMockResponse({
                answerText: 'The evidence shows John met Jane [evidence: ev-1], but meeting details are not available.',
                citations: [{ evidenceId: 'ev-1' }],
                unknowns: ['The topics discussed in the meeting are not recorded in the evidence.'],
            });
            const response = await service.answer(req, testUser);
            (0, globals_1.expect)(response.answer.unknowns.length).toBe(1);
            (0, globals_1.expect)(response.answer.unknowns[0]).toContain('topics discussed');
        });
        (0, globals_1.it)('should reject answer without citations for substantive content', async () => {
            const req = {
                caseId: testCaseId,
                question: 'What happened?',
                userId: testUser.userId,
            };
            // LLM returns answer without citations
            llmAdapter.setMockResponse({
                answerText: 'A significant event occurred involving multiple parties and had various consequences for the investigation.',
                citations: [], // No citations!
                unknowns: [],
            });
            const response = await service.answer(req, testUser);
            // Answer should be replaced with fallback
            (0, globals_1.expect)(response.answer.answerText).toContain('citation-backed answer');
            (0, globals_1.expect)(response.answer.citations.length).toBe(0);
            (0, globals_1.expect)(response.answer.unknowns.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should filter invalid citations from LLM response', async () => {
            const req = {
                caseId: testCaseId,
                question: 'What happened?',
                userId: testUser.userId,
            };
            // LLM returns citations with invalid IDs
            llmAdapter.setMockResponse({
                answerText: 'John met Jane [evidence: ev-1]. Also a fake event [evidence: fake-123].',
                citations: [
                    { evidenceId: 'ev-1' }, // Valid
                    { evidenceId: 'fake-123' }, // Invalid - not in context
                ],
                unknowns: [],
            });
            const response = await service.answer(req, testUser);
            // Only valid citation should remain
            (0, globals_1.expect)(response.answer.citations.length).toBe(1);
            (0, globals_1.expect)(response.answer.citations[0].evidenceId).toBe('ev-1');
        });
        (0, globals_1.it)('should return no-evidence message when all evidence is filtered by policy', async () => {
            const req = {
                caseId: testCaseId,
                question: 'What happened?',
                userId: testUser.userId,
            };
            // Policy denies all evidence
            policyEngine.setAllowAll(false);
            const response = await service.answer(req, testUser);
            (0, globals_1.expect)(response.answer.answerText).toContain('No evidence is available');
            (0, globals_1.expect)(response.answer.citations.length).toBe(0);
            (0, globals_1.expect)(response.answer.unknowns.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should deny access when user not member of case', async () => {
            const req = {
                caseId: testCaseId,
                question: 'What happened?',
                userId: 'unauthorized-user',
            };
            const unauthorizedUser = {
                userId: 'unauthorized-user',
                roles: [],
                clearances: [],
                cases: ['other-case'], // Not a member of testCaseId
            };
            const response = await service.answer(req, unauthorizedUser);
            (0, globals_1.expect)(response.answer.answerText).toContain('do not have access');
        });
        (0, globals_1.it)('should log audit record for each request', async () => {
            const req = {
                caseId: testCaseId,
                question: 'When did John meet Jane?',
                userId: testUser.userId,
            };
            llmAdapter.setMockResponse({
                answerText: 'John met Jane on Tuesday [evidence: ev-1].',
                citations: [{ evidenceId: 'ev-1' }],
                unknowns: [],
            });
            await service.answer(req, testUser);
            const auditRecords = auditLog.getAll();
            (0, globals_1.expect)(auditRecords.length).toBe(1);
            (0, globals_1.expect)(auditRecords[0].userId).toBe(testUser.userId);
            (0, globals_1.expect)(auditRecords[0].caseId).toBe(testCaseId);
            (0, globals_1.expect)(auditRecords[0].question).toBe(req.question);
        });
        (0, globals_1.it)('should include context summary in response', async () => {
            const req = {
                caseId: testCaseId,
                question: 'What happened?',
                userId: testUser.userId,
            };
            llmAdapter.setMockResponse({
                answerText: 'Based on evidence [evidence: ev-1].',
                citations: [{ evidenceId: 'ev-1' }],
                unknowns: [],
            });
            const response = await service.answer(req, testUser);
            (0, globals_1.expect)(response.answer.usedContextSummary).toBeDefined();
            (0, globals_1.expect)(response.answer.usedContextSummary.numNodes).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(response.answer.usedContextSummary.numEvidenceSnippets).toBeGreaterThanOrEqual(0);
        });
        (0, globals_1.it)('should include raw context in response', async () => {
            const req = {
                caseId: testCaseId,
                question: 'What happened?',
                userId: testUser.userId,
            };
            const response = await service.answer(req, testUser);
            (0, globals_1.expect)(response.rawContext).toBeDefined();
            (0, globals_1.expect)(response.rawContext.nodes).toBeDefined();
            (0, globals_1.expect)(response.rawContext.edges).toBeDefined();
            (0, globals_1.expect)(response.rawContext.evidenceSnippets).toBeDefined();
        });
        (0, globals_1.it)('should include requestId and timestamp in response', async () => {
            const req = {
                caseId: testCaseId,
                question: 'What happened?',
                userId: testUser.userId,
            };
            const response = await service.answer(req, testUser);
            (0, globals_1.expect)(response.requestId).toBeDefined();
            (0, globals_1.expect)(response.requestId.length).toBeGreaterThan(0);
            (0, globals_1.expect)(response.timestamp).toBeDefined();
        });
    });
    (0, globals_1.describe)('createGraphRagService factory', () => {
        (0, globals_1.it)('should create service with provided dependencies', () => {
            const service = (0, service_js_1.createGraphRagService)({
                caseGraphRepo,
                evidenceRepo,
                llmAdapter,
                policyEngine,
                auditLog,
            });
            (0, globals_1.expect)(service).toBeDefined();
            (0, globals_1.expect)(typeof service.answer).toBe('function');
        });
        (0, globals_1.it)('should accept custom retrieval params', () => {
            const service = (0, service_js_1.createGraphRagService)({
                caseGraphRepo,
                evidenceRepo,
                llmAdapter,
                policyEngine,
                auditLog,
                retrievalParams: {
                    maxNodes: 100,
                    maxEvidenceSnippets: 50,
                },
            });
            (0, globals_1.expect)(service).toBeDefined();
        });
    });
});
