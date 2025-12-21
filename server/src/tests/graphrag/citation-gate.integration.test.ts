import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  EvidenceFirstGraphRagService,
} from '../../services/graphrag/service.js';
import {
  InMemoryCaseGraphRepository,
} from '../../services/graphrag/repositories/CaseGraphRepository.js';
import {
  InMemoryEvidenceRepository,
} from '../../services/graphrag/repositories/EvidenceRepository.js';
import { MockGraphRagLlmAdapter } from '../../services/graphrag/llm-adapter.js';
import { MockPolicyEngine } from '../../services/graphrag/policy-guard.js';
import { InMemoryGraphRagAuditLog } from '../../services/graphrag/audit-log.js';
import { GraphRagRequest, UserContext } from '../../services/graphrag/types.js';

describe('GraphRAG citation gate integration', () => {
  let caseGraphRepo: InMemoryCaseGraphRepository;
  let evidenceRepo: InMemoryEvidenceRepository;
  let llmAdapter: MockGraphRagLlmAdapter;
  let policyEngine: MockPolicyEngine;
  let auditLog: InMemoryGraphRagAuditLog;
  let service: EvidenceFirstGraphRagService;

  const testCaseId = 'case-xyz';
  const testUser: UserContext = {
    userId: 'user-1',
    roles: ['analyst'],
    clearances: ['SECRET'],
    cases: [testCaseId],
  };

  const baseRequest: GraphRagRequest = {
    caseId: testCaseId,
    question: 'Provide a detailed summary of the meeting timeline.',
    userId: testUser.userId,
  };

  beforeEach(() => {
    process.env.CITATION_GATE = '1';
    caseGraphRepo = new InMemoryCaseGraphRepository();
    evidenceRepo = new InMemoryEvidenceRepository();
    llmAdapter = new MockGraphRagLlmAdapter();
    policyEngine = new MockPolicyEngine();
    auditLog = new InMemoryGraphRagAuditLog();

    caseGraphRepo.addCaseData(
      testCaseId,
      [{ id: 'n1', type: 'Person', label: 'Analyst' }],
      [],
    );
    evidenceRepo.addCaseEvidence(testCaseId, [
      {
        evidenceId: 'ev-1',
        snippet: 'Meeting occurred on Monday.',
        score: 0.9,
      },
    ]);

    service = new EvidenceFirstGraphRagService({
      caseGraphRepo,
      evidenceRepo,
      llmAdapter,
      policyEngine,
      auditLog,
    });
  });

  afterEach(() => {
    process.env.CITATION_GATE = undefined;
  });

  it('returns valid cited answer', async () => {
    llmAdapter.setMockResponse({
      answerText:
        'The meeting occurred on Monday and concluded with action items. [evidence: ev-1]',
      citations: [{ evidenceId: 'ev-1' }],
      unknowns: [],
    });

    const response = await service.answer(baseRequest, testUser);

    expect(response.answer.citations).toHaveLength(1);
    expect(response.citationDiagnostics).toBeUndefined();
  });

  it('emits diagnostics when citations are missing', async () => {
    llmAdapter.setMockResponse({
      answerText:
        'The meeting covered multiple agenda items and lasted for several hours with notable participants throughout the session.',
      citations: [],
      unknowns: [],
    });

    const response = await service.answer(baseRequest, testUser);

    expect(response.answer.citations.length).toBe(0);
    expect(
      response.citationDiagnostics?.missingCitations?.message,
    ).toContain('CITATION_GATE');
  });

  it('blocks dangling citations with diagnostics', async () => {
    llmAdapter.setMockResponse({
      answerText:
        'The meeting occurred across departments and produced a decision memo for leadership review with formal approvals.',
      citations: [{ evidenceId: 'ev-missing' }],
      unknowns: [],
    });

    const response = await service.answer(baseRequest, testUser);

    expect(response.answer.citations.length).toBe(0);
    expect(response.answer.answerText).toContain('citation-backed');
    expect(
      response.citationDiagnostics?.danglingCitations?.evidenceIds,
    ).toContain('ev-missing');
  });
});
