/**
 * GraphRAG Retrieval Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  retrieveGraphContext,
  buildLlmContextPayload,
  getContextSummary,
  getValidEvidenceIds,
  getValidClaimIds,
} from '../../services/graphrag/retrieval.js';
import {
  InMemoryCaseGraphRepository,
} from '../../services/graphrag/repositories/CaseGraphRepository.js';
import {
  InMemoryEvidenceRepository,
} from '../../services/graphrag/repositories/EvidenceRepository.js';
import { GraphRagRequest, EvidenceSnippet, GraphContextNode, GraphContextEdge } from '../../services/graphrag/types.js';

describe('GraphRAG Retrieval', () => {
  let caseGraphRepo: InMemoryCaseGraphRepository;
  let evidenceRepo: InMemoryEvidenceRepository;

  // Test data
  const testCaseId = 'case-123';
  const testNodes: GraphContextNode[] = [
    { id: 'node-1', type: 'Person', label: 'John Smith', properties: { role: 'suspect' } },
    { id: 'node-2', type: 'Person', label: 'Jane Doe', properties: { role: 'witness' } },
    { id: 'node-3', type: 'Location', label: 'Downtown Office', properties: { city: 'NYC' } },
    { id: 'node-4', type: 'Event', label: 'Meeting', properties: { date: '2024-01-15' } },
    { id: 'node-5', type: 'Document', label: 'Contract', properties: { status: 'signed' } },
  ];

  const testEdges: GraphContextEdge[] = [
    { id: 'edge-1', type: 'MET_WITH', fromId: 'node-1', toId: 'node-2', properties: {} },
    { id: 'edge-2', type: 'LOCATED_AT', fromId: 'node-1', toId: 'node-3', properties: {} },
    { id: 'edge-3', type: 'ATTENDED', fromId: 'node-2', toId: 'node-4', properties: {} },
    { id: 'edge-4', type: 'SIGNED', fromId: 'node-1', toId: 'node-5', properties: {} },
  ];

  const testEvidence: EvidenceSnippet[] = [
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

  beforeEach(() => {
    caseGraphRepo = new InMemoryCaseGraphRepository();
    evidenceRepo = new InMemoryEvidenceRepository();

    // Set up test data
    caseGraphRepo.addCaseData(testCaseId, testNodes, testEdges);
    evidenceRepo.addCaseEvidence(testCaseId, testEvidence);
  });

  describe('retrieveGraphContext', () => {
    it('should retrieve nodes and edges for a case', async () => {
      const req: GraphRagRequest = {
        caseId: testCaseId,
        question: 'Who met with John Smith?',
        userId: 'user-1',
      };

      const result = await retrieveGraphContext(
        req,
        { maxNodes: 10, maxDepth: 3, maxEvidenceSnippets: 5 },
        caseGraphRepo,
        evidenceRepo,
      );

      expect(result.context.nodes.length).toBeGreaterThan(0);
      expect(result.context.edges.length).toBeGreaterThan(0);
    });

    it('should retrieve evidence snippets matching the question', async () => {
      const req: GraphRagRequest = {
        caseId: testCaseId,
        question: 'When did John meet Jane?',
        userId: 'user-1',
      };

      const result = await retrieveGraphContext(
        req,
        { maxNodes: 10, maxDepth: 3, maxEvidenceSnippets: 5 },
        caseGraphRepo,
        evidenceRepo,
      );

      expect(result.context.evidenceSnippets.length).toBeGreaterThan(0);
      expect(
        result.context.evidenceSnippets.some((e) =>
          e.snippet.toLowerCase().includes('john'),
        ),
      ).toBe(true);
    });

    it('should respect maxNodes limit', async () => {
      const req: GraphRagRequest = {
        caseId: testCaseId,
        question: 'Tell me about this case',
        userId: 'user-1',
      };

      const result = await retrieveGraphContext(
        req,
        { maxNodes: 2, maxDepth: 3, maxEvidenceSnippets: 5 },
        caseGraphRepo,
        evidenceRepo,
      );

      expect(result.context.nodes.length).toBeLessThanOrEqual(2);
    });

    it('should respect maxEvidenceSnippets limit', async () => {
      const req: GraphRagRequest = {
        caseId: testCaseId,
        question: 'What happened?',
        userId: 'user-1',
      };

      const result = await retrieveGraphContext(
        req,
        { maxNodes: 10, maxDepth: 3, maxEvidenceSnippets: 1 },
        caseGraphRepo,
        evidenceRepo,
      );

      expect(result.context.evidenceSnippets.length).toBeLessThanOrEqual(1);
    });

    it('should return empty context for non-existent case', async () => {
      const req: GraphRagRequest = {
        caseId: 'non-existent-case',
        question: 'What happened?',
        userId: 'user-1',
      };

      const result = await retrieveGraphContext(
        req,
        { maxNodes: 10, maxDepth: 3, maxEvidenceSnippets: 5 },
        caseGraphRepo,
        evidenceRepo,
      );

      expect(result.context.nodes.length).toBe(0);
      expect(result.context.evidenceSnippets.length).toBe(0);
    });
  });

  describe('buildLlmContextPayload', () => {
    it('should build LLM-ready context from retrieval result', async () => {
      const req: GraphRagRequest = {
        caseId: testCaseId,
        question: 'Who signed the contract?',
        userId: 'user-1',
      };

      const retrievalResult = await retrieveGraphContext(
        req,
        { maxNodes: 10, maxDepth: 3, maxEvidenceSnippets: 5 },
        caseGraphRepo,
        evidenceRepo,
      );

      const payload = buildLlmContextPayload(req, retrievalResult);

      expect(payload.question).toBe(req.question);
      expect(payload.caseId).toBe(req.caseId);
      expect(payload.nodes).toBeDefined();
      expect(payload.edges).toBeDefined();
      expect(payload.evidenceSnippets).toBeDefined();
    });

    it('should extract key properties from nodes', async () => {
      const req: GraphRagRequest = {
        caseId: testCaseId,
        question: 'Tell me about John',
        userId: 'user-1',
      };

      const retrievalResult = await retrieveGraphContext(
        req,
        { maxNodes: 10, maxDepth: 3, maxEvidenceSnippets: 5 },
        caseGraphRepo,
        evidenceRepo,
      );

      const payload = buildLlmContextPayload(req, retrievalResult);

      // Nodes should have keyProperties extracted
      for (const node of payload.nodes) {
        expect(node.keyProperties).toBeDefined();
      }
    });
  });

  describe('getContextSummary', () => {
    it('should return correct counts', () => {
      const context = {
        nodes: testNodes,
        edges: testEdges,
        evidenceSnippets: testEvidence,
      };

      const summary = getContextSummary(context);

      expect(summary.numNodes).toBe(5);
      expect(summary.numEdges).toBe(4);
      expect(summary.numEvidenceSnippets).toBe(3);
    });

    it('should handle empty context', () => {
      const context = {
        nodes: [],
        edges: [],
        evidenceSnippets: [],
      };

      const summary = getContextSummary(context);

      expect(summary.numNodes).toBe(0);
      expect(summary.numEdges).toBe(0);
      expect(summary.numEvidenceSnippets).toBe(0);
    });
  });

  describe('getValidEvidenceIds', () => {
    it('should return set of evidence IDs', () => {
      const ids = getValidEvidenceIds(testEvidence);

      expect(ids.has('ev-1')).toBe(true);
      expect(ids.has('ev-2')).toBe(true);
      expect(ids.has('ev-3')).toBe(true);
      expect(ids.has('ev-99')).toBe(false);
    });
  });

  describe('getValidClaimIds', () => {
    it('should return set of claim IDs', () => {
      const ids = getValidClaimIds(testEvidence);

      expect(ids.has('claim-1')).toBe(true);
      expect(ids.has('claim-2')).toBe(true);
      // ev-3 has no claimId
      expect(ids.size).toBe(2);
    });
  });
});
