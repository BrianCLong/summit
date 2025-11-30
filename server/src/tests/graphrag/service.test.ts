/**
 * GraphRAG Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  EvidenceFirstGraphRagService,
  createGraphRagService,
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
import {
  GraphRagRequest,
  UserContext,
  GraphContextNode,
  GraphContextEdge,
  EvidenceSnippet,
} from '../../services/graphrag/types.js';

describe('GraphRAG Service', () => {
  let caseGraphRepo: InMemoryCaseGraphRepository;
  let evidenceRepo: InMemoryEvidenceRepository;
  let llmAdapter: MockGraphRagLlmAdapter;
  let policyEngine: MockPolicyEngine;
  let auditLog: InMemoryGraphRagAuditLog;
  let service: EvidenceFirstGraphRagService;

  // Test data
  const testCaseId = 'case-123';
  const testNodes: GraphContextNode[] = [
    { id: 'node-1', type: 'Person', label: 'John Smith' },
    { id: 'node-2', type: 'Person', label: 'Jane Doe' },
  ];
  const testEdges: GraphContextEdge[] = [
    { id: 'edge-1', type: 'MET_WITH', fromId: 'node-1', toId: 'node-2' },
  ];
  const testEvidence: EvidenceSnippet[] = [
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
  const testUser: UserContext = {
    userId: 'user-1',
    roles: ['analyst'],
    clearances: ['SECRET'],
    cases: [testCaseId],
  };

  beforeEach(() => {
    caseGraphRepo = new InMemoryCaseGraphRepository();
    evidenceRepo = new InMemoryEvidenceRepository();
    llmAdapter = new MockGraphRagLlmAdapter();
    policyEngine = new MockPolicyEngine();
    auditLog = new InMemoryGraphRagAuditLog();

    // Set up test data
    caseGraphRepo.addCaseData(testCaseId, testNodes, testEdges);
    evidenceRepo.addCaseEvidence(testCaseId, testEvidence);

    service = new EvidenceFirstGraphRagService({
      caseGraphRepo,
      evidenceRepo,
      llmAdapter,
      policyEngine,
      auditLog,
    });
  });

  describe('answer', () => {
    it('should return answer with citations when evidence is available', async () => {
      const req: GraphRagRequest = {
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

      expect(response.answer.answerText).toContain('Tuesday');
      expect(response.answer.citations.length).toBe(1);
      expect(response.answer.citations[0].evidenceId).toBe('ev-1');
      expect(response.answer.unknowns.length).toBe(0);
    });

    it('should include unknowns when LLM reports gaps', async () => {
      const req: GraphRagRequest = {
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

      expect(response.answer.unknowns.length).toBe(1);
      expect(response.answer.unknowns[0]).toContain('topics discussed');
    });

    it('should reject answer without citations for substantive content', async () => {
      const req: GraphRagRequest = {
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
      expect(response.answer.answerText).toContain('citation-backed answer');
      expect(response.answer.citations.length).toBe(0);
      expect(response.answer.unknowns.length).toBeGreaterThan(0);
    });

    it('should filter invalid citations from LLM response', async () => {
      const req: GraphRagRequest = {
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
      expect(response.answer.citations.length).toBe(1);
      expect(response.answer.citations[0].evidenceId).toBe('ev-1');
    });

    it('should return no-evidence message when all evidence is filtered by policy', async () => {
      const req: GraphRagRequest = {
        caseId: testCaseId,
        question: 'What happened?',
        userId: testUser.userId,
      };

      // Policy denies all evidence
      policyEngine.setAllowAll(false);

      const response = await service.answer(req, testUser);

      expect(response.answer.answerText).toContain('No evidence is available');
      expect(response.answer.citations.length).toBe(0);
      expect(response.answer.unknowns.length).toBeGreaterThan(0);
    });

    it('should deny access when user not member of case', async () => {
      const req: GraphRagRequest = {
        caseId: testCaseId,
        question: 'What happened?',
        userId: 'unauthorized-user',
      };

      const unauthorizedUser: UserContext = {
        userId: 'unauthorized-user',
        roles: [],
        clearances: [],
        cases: ['other-case'], // Not a member of testCaseId
      };

      const response = await service.answer(req, unauthorizedUser);

      expect(response.answer.answerText).toContain('do not have access');
    });

    it('should log audit record for each request', async () => {
      const req: GraphRagRequest = {
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
      expect(auditRecords.length).toBe(1);
      expect(auditRecords[0].userId).toBe(testUser.userId);
      expect(auditRecords[0].caseId).toBe(testCaseId);
      expect(auditRecords[0].question).toBe(req.question);
    });

    it('should include context summary in response', async () => {
      const req: GraphRagRequest = {
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

      expect(response.answer.usedContextSummary).toBeDefined();
      expect(response.answer.usedContextSummary.numNodes).toBeGreaterThanOrEqual(0);
      expect(response.answer.usedContextSummary.numEvidenceSnippets).toBeGreaterThanOrEqual(0);
    });

    it('should include raw context in response', async () => {
      const req: GraphRagRequest = {
        caseId: testCaseId,
        question: 'What happened?',
        userId: testUser.userId,
      };

      const response = await service.answer(req, testUser);

      expect(response.rawContext).toBeDefined();
      expect(response.rawContext.nodes).toBeDefined();
      expect(response.rawContext.edges).toBeDefined();
      expect(response.rawContext.evidenceSnippets).toBeDefined();
    });

    it('should include requestId and timestamp in response', async () => {
      const req: GraphRagRequest = {
        caseId: testCaseId,
        question: 'What happened?',
        userId: testUser.userId,
      };

      const response = await service.answer(req, testUser);

      expect(response.requestId).toBeDefined();
      expect(response.requestId.length).toBeGreaterThan(0);
      expect(response.timestamp).toBeDefined();
    });
  });

  describe('createGraphRagService factory', () => {
    it('should create service with provided dependencies', () => {
      const service = createGraphRagService({
        caseGraphRepo,
        evidenceRepo,
        llmAdapter,
        policyEngine,
        auditLog,
      });

      expect(service).toBeDefined();
      expect(typeof service.answer).toBe('function');
    });

    it('should accept custom retrieval params', () => {
      const service = createGraphRagService({
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

      expect(service).toBeDefined();
    });
  });
});
