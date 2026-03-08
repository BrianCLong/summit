"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const service_js_1 = require("../../services/graphrag/service.js");
const CaseGraphRepository_js_1 = require("../../services/graphrag/repositories/CaseGraphRepository.js");
const EvidenceRepository_js_1 = require("../../services/graphrag/repositories/EvidenceRepository.js");
const llm_adapter_js_1 = require("../../services/graphrag/llm-adapter.js");
const policy_guard_js_1 = require("../../services/graphrag/policy-guard.js");
const audit_log_js_1 = require("../../services/graphrag/audit-log.js");
(0, globals_1.describe)('GraphRAG citation gate integration', () => {
    let caseGraphRepo;
    let evidenceRepo;
    let llmAdapter;
    let policyEngine;
    let auditLog;
    let service;
    const testCaseId = 'case-xyz';
    const testUser = {
        userId: 'user-1',
        roles: ['analyst'],
        clearances: ['SECRET'],
        cases: [testCaseId],
    };
    const baseRequest = {
        caseId: testCaseId,
        question: 'Provide a detailed summary of the meeting timeline.',
        userId: testUser.userId,
    };
    (0, globals_1.beforeEach)(() => {
        process.env.CITATION_GATE = '1';
        caseGraphRepo = new CaseGraphRepository_js_1.InMemoryCaseGraphRepository();
        evidenceRepo = new EvidenceRepository_js_1.InMemoryEvidenceRepository();
        llmAdapter = new llm_adapter_js_1.MockGraphRagLlmAdapter();
        policyEngine = new policy_guard_js_1.MockPolicyEngine();
        auditLog = new audit_log_js_1.InMemoryGraphRagAuditLog();
        caseGraphRepo.addCaseData(testCaseId, [{ id: 'n1', type: 'Person', label: 'Analyst' }], []);
        evidenceRepo.addCaseEvidence(testCaseId, [
            {
                evidenceId: 'ev-1',
                snippet: 'Meeting occurred on Monday.',
                score: 0.9,
            },
        ]);
        service = new service_js_1.EvidenceFirstGraphRagService({
            caseGraphRepo,
            evidenceRepo,
            llmAdapter,
            policyEngine,
            auditLog,
        });
    });
    (0, globals_1.afterEach)(() => {
        process.env.CITATION_GATE = undefined;
    });
    (0, globals_1.it)('returns valid cited answer', async () => {
        llmAdapter.setMockResponse({
            answerText: 'The meeting occurred on Monday and concluded with action items. [evidence: ev-1]',
            citations: [{ evidenceId: 'ev-1' }],
            unknowns: [],
        });
        const response = await service.answer(baseRequest, testUser);
        (0, globals_1.expect)(response.answer.citations).toHaveLength(1);
        (0, globals_1.expect)(response.citationDiagnostics).toBeUndefined();
    });
    (0, globals_1.it)('emits diagnostics when citations are missing', async () => {
        llmAdapter.setMockResponse({
            answerText: 'The meeting covered multiple agenda items and lasted for several hours with notable participants throughout the session.',
            citations: [],
            unknowns: [],
        });
        const response = await service.answer(baseRequest, testUser);
        (0, globals_1.expect)(response.answer.citations.length).toBe(0);
        (0, globals_1.expect)(response.citationDiagnostics?.missingCitations?.message).toContain('CITATION_GATE');
    });
    (0, globals_1.it)('blocks dangling citations with diagnostics', async () => {
        llmAdapter.setMockResponse({
            answerText: 'The meeting occurred across departments and produced a decision memo for leadership review with formal approvals.',
            citations: [{ evidenceId: 'ev-missing' }],
            unknowns: [],
        });
        const response = await service.answer(baseRequest, testUser);
        (0, globals_1.expect)(response.answer.citations.length).toBe(0);
        (0, globals_1.expect)(response.answer.answerText).toContain('citation-backed');
        (0, globals_1.expect)(response.citationDiagnostics?.danglingCitations?.evidenceIds).toContain('ev-missing');
    });
});
