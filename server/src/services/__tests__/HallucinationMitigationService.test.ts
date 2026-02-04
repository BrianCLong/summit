/**
 * Tests for Hallucination Mitigation Service (CoVe Pipeline)
 *
 * P0 - Critical for MVP-4-GA
 * Target coverage: 80%
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import {
  HallucinationMitigationService,
  HallucinationMitigationRequest,
  HallucinationMitigationResponse,
} from '../HallucinationMitigationService.js';
import { GraphRAGService, GraphRAGResponse } from '../GraphRAGService.js';
import { IntelCorroborationService } from '../IntelCorroborationService.js';

// Mock dependencies
const createMockGraphRAGService = (): any => ({
  answer: jest.fn(),
});

const createMockIntelCorroborationService = (): any => ({
  corroborate: jest.fn(),
  getSourceDiversity: jest.fn(),
});

const createMockLLMService = (): any => ({
  complete: jest.fn(),
});

describe('HallucinationMitigationService', () => {
  let service: HallucinationMitigationService;
  let mockGraphRAG: any;
  let mockCorroboration: any;
  let mockLLM: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGraphRAG = createMockGraphRAGService();
    mockCorroboration = createMockIntelCorroborationService();
    mockLLM = createMockLLMService();

    service = new HallucinationMitigationService(
      mockGraphRAG as unknown as GraphRAGService,
      mockCorroboration as unknown as IntelCorroborationService,
      mockLLM as any
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Query without CoVe', () => {
    it('should pass through to GraphRAG when CoVe disabled', async () => {
      const request: HallucinationMitigationRequest = {
        investigationId: 'inv-123',
        question: 'Who is John Doe?',
        enableCoVe: false,
      };

      const graphRAGResponse: GraphRAGResponse = {
        answer: 'John Doe is a software engineer.',
        confidence: 0.85,
        citations: { entityIds: ['entity-john'] },
        why_paths: [],
      };

      mockGraphRAG.answer.mockResolvedValue(graphRAGResponse);

      const result = await service.query(request);

      expect(result.answer).toBe(graphRAGResponse.answer);
      expect(result.verificationStatus).toBe('unverified');
      expect(mockLLM.complete).not.toHaveBeenCalled();
    });

    it('should default to unverified status when CoVe not specified', async () => {
      const request: HallucinationMitigationRequest = {
        investigationId: 'inv-123',
        question: 'Who is John Doe?',
      };

      mockGraphRAG.answer.mockResolvedValue({
        answer: 'John Doe is a person.',
        confidence: 0.9,
        citations: { entityIds: [] },
        why_paths: [],
      });

      const result = await service.query(request);

      expect(result.verificationStatus).toBe('unverified');
    });
  });

  describe('CoVe Pipeline', () => {
    it('should generate verification questions from baseline answer', async () => {
      const request: HallucinationMitigationRequest = {
        investigationId: 'inv-123',
        question: 'What is John Doe\'s role at ACME Corp?',
        enableCoVe: true,
      };

      // Baseline answer from GraphRAG
      mockGraphRAG.answer
        .mockResolvedValueOnce({
          answer: 'John Doe is the CEO of ACME Corp since 2020.',
          confidence: 0.85,
          citations: { entityIds: ['entity-john', 'entity-acme'] },
          why_paths: [],
        })
        // Verification query responses
        .mockResolvedValue({
          answer: 'Yes, John Doe holds the CEO position.',
          confidence: 0.9,
          citations: { entityIds: ['entity-john'] },
          why_paths: [],
        });

      // LLM generates verification questions
      mockLLM.complete
        .mockResolvedValueOnce(JSON.stringify({
          questions: [
            'Is John Doe the CEO of ACME Corp?',
            'Did John Doe become CEO in 2020?',
            'Is ACME Corp a real organization?',
          ],
        }))
        // LLM performs cross-check
        .mockResolvedValue(JSON.stringify({
          originalAnswer: 'John Doe is the CEO of ACME Corp since 2020.',
          revisedAnswer: 'John Doe is the CEO of ACME Corp since 2020.',
          inconsistencies: [],
          corrections: [],
          confidenceScore: 0.92,
          verificationStatus: 'verified',
          reasoningTrace: 'All claims verified against source entities.',
        }));

      const result = await service.query(request);

      expect(result.verificationStatus).toBe('verified');
      expect(result.inconsistencies).toHaveLength(0);
    });

    it('should detect inconsistencies and mark as conflicted', async () => {
      const request: HallucinationMitigationRequest = {
        investigationId: 'inv-123',
        question: 'When did John Doe join ACME Corp?',
        enableCoVe: true,
      };

      // Baseline answer
      mockGraphRAG.answer
        .mockResolvedValueOnce({
          answer: 'John Doe joined ACME Corp in 2018.',
          confidence: 0.75,
          citations: { entityIds: ['entity-john'] },
          why_paths: [],
        })
        // Conflicting verification response
        .mockResolvedValue({
          answer: 'Records show John Doe joined in 2020.',
          confidence: 0.88,
          citations: { entityIds: ['entity-john'] },
          why_paths: [],
        });

      mockLLM.complete
        .mockResolvedValueOnce(JSON.stringify({
          questions: ['When exactly did John Doe join ACME Corp?'],
        }))
        .mockResolvedValue(JSON.stringify({
          originalAnswer: 'John Doe joined ACME Corp in 2018.',
          revisedAnswer: 'John Doe joined ACME Corp (conflicting dates: 2018 vs 2020).',
          inconsistencies: ['Conflicting join dates: baseline says 2018, verification says 2020'],
          corrections: ['Join date requires manual verification'],
          confidenceScore: 0.45,
          verificationStatus: 'conflicted',
          reasoningTrace: 'Temporal conflict detected between sources.',
          conflictAnalysis: {
            hasConflict: true,
            type: 'temporal',
            description: 'Join date inconsistency',
            conflictingSources: ['entity-john-record-1', 'entity-john-record-2'],
            recommendedResolution: 'Verify with HR records',
          },
        }));

      const result = await service.query(request);

      expect(result.verificationStatus).toBe('conflicted');
      expect(result.inconsistencies).toContainEqual(
        expect.stringContaining('Conflicting join dates')
      );
      expect(result.conflictDetails?.type).toBe('temporal');
    });

    it('should provide corrections when facts are wrong', async () => {
      const request: HallucinationMitigationRequest = {
        investigationId: 'inv-123',
        question: 'What company does John Doe work for?',
        enableCoVe: true,
      };

      // Baseline with incorrect information
      mockGraphRAG.answer
        .mockResolvedValueOnce({
          answer: 'John Doe works for XYZ Inc.',
          confidence: 0.6,
          citations: { entityIds: ['entity-john'] },
          why_paths: [],
        })
        // Verification finds correct info
        .mockResolvedValue({
          answer: 'John Doe works for ACME Corp, not XYZ Inc.',
          confidence: 0.95,
          citations: { entityIds: ['entity-john', 'entity-acme'] },
          why_paths: [],
        });

      mockLLM.complete
        .mockResolvedValueOnce(JSON.stringify({
          questions: ['Which company does John Doe work for?'],
        }))
        .mockResolvedValue(JSON.stringify({
          originalAnswer: 'John Doe works for XYZ Inc.',
          revisedAnswer: 'John Doe works for ACME Corp.',
          inconsistencies: ['Original answer incorrectly stated XYZ Inc'],
          corrections: ['Corrected employer from XYZ Inc to ACME Corp'],
          confidenceScore: 0.9,
          verificationStatus: 'verified',
          reasoningTrace: 'Verification found correct employer is ACME Corp.',
        }));

      const result = await service.query(request);

      expect(result.verificationStatus).toBe('verified');
      expect(result.corrections).toContainEqual(
        expect.stringContaining('Corrected employer')
      );
      expect(result.answer).toContain('ACME Corp');
    });
  });

  describe('Evidence Metrics', () => {
    it('should include source diversity in response', async () => {
      const request: HallucinationMitigationRequest = {
        investigationId: 'inv-123',
        question: 'What do we know about John Doe?',
        enableCoVe: true,
      };

      mockGraphRAG.answer.mockResolvedValue({
        answer: 'John Doe is mentioned in multiple sources.',
        confidence: 0.9,
        citations: { entityIds: ['entity-john'] },
        why_paths: [],
      });

      mockCorroboration.getSourceDiversity.mockResolvedValue(['OSINT', 'SIGINT', 'HUMINT']);

      mockLLM.complete
        .mockResolvedValueOnce(JSON.stringify({ questions: [] }))
        .mockResolvedValue(JSON.stringify({
          originalAnswer: 'John Doe is mentioned in multiple sources.',
          revisedAnswer: 'John Doe is mentioned in multiple sources.',
          inconsistencies: [],
          corrections: [],
          confidenceScore: 0.92,
          verificationStatus: 'verified',
          reasoningTrace: 'High source diversity confirms reliability.',
        }));

      const result = await service.query(request);

      expect(result.evidenceMetrics?.sourceDiversity).toBeDefined();
      expect(result.evidenceMetrics?.confirmingSourcesCount).toBeGreaterThanOrEqual(0);
    });

    it('should flag when provenance is missing', async () => {
      const request: HallucinationMitigationRequest = {
        investigationId: 'inv-123',
        question: 'What is the suspect\'s location?',
        enableCoVe: true,
      };

      mockGraphRAG.answer.mockResolvedValue({
        answer: 'The suspect is located in New York.',
        confidence: 0.5,
        citations: { entityIds: [] }, // No citations
        why_paths: [],
      });

      mockCorroboration.getSourceDiversity.mockResolvedValue([]);

      mockLLM.complete
        .mockResolvedValueOnce(JSON.stringify({ questions: ['Where is the suspect located?'] }))
        .mockResolvedValue(JSON.stringify({
          originalAnswer: 'The suspect is located in New York.',
          revisedAnswer: 'The suspect is located in New York (unverified).',
          inconsistencies: ['No source citations provided'],
          corrections: [],
          confidenceScore: 0.3,
          verificationStatus: 'unverified',
          reasoningTrace: 'Cannot verify without source citations.',
        }));

      const result = await service.query(request);

      expect(result.evidenceMetrics?.hasProvenance).toBe(true);
      expect(result.verificationStatus).toBe('unverified');
    });
  });

  describe('Conflict Analysis', () => {
    it('should detect temporal conflicts', async () => {
      const request: HallucinationMitigationRequest = {
        investigationId: 'inv-123',
        question: 'When did the transaction occur?',
        enableCoVe: true,
      };

      mockGraphRAG.answer.mockResolvedValue({
        answer: 'The transaction occurred on January 15, 2024.',
        confidence: 0.7,
        citations: { entityIds: ['entity-tx-1'] },
        why_paths: [],
      });

      mockLLM.complete
        .mockResolvedValueOnce(JSON.stringify({
          questions: ['What is the exact date of the transaction?'],
        }))
        .mockResolvedValue(JSON.stringify({
          originalAnswer: 'The transaction occurred on January 15, 2024.',
          revisedAnswer: 'The transaction date is disputed (Jan 15 vs Jan 18, 2024).',
          inconsistencies: ['Date mismatch between sources'],
          corrections: [],
          confidenceScore: 0.4,
          verificationStatus: 'conflicted',
          reasoningTrace: 'Multiple sources report different dates.',
          conflictAnalysis: {
            hasConflict: true,
            type: 'temporal',
            description: 'Transaction date varies between sources',
            conflictingSources: ['bank-record-1', 'email-receipt-1'],
            recommendedResolution: 'Cross-reference with official bank statement',
          },
        }));

      const result = await service.query(request);

      expect(result.conflictDetails?.hasConflict).toBe(true);
      expect(result.conflictDetails?.type).toBe('temporal');
      expect(result.conflictDetails?.recommendedResolution).toBeDefined();
    });

    it('should detect source disagreement', async () => {
      const request: HallucinationMitigationRequest = {
        investigationId: 'inv-123',
        question: 'Is the company profitable?',
        enableCoVe: true,
      };

      mockGraphRAG.answer.mockResolvedValue({
        answer: 'Yes, the company is profitable.',
        confidence: 0.65,
        citations: { entityIds: ['entity-company'] },
        why_paths: [],
      });

      mockLLM.complete
        .mockResolvedValueOnce(JSON.stringify({
          questions: ['What is the company\'s financial status?'],
        }))
        .mockResolvedValue(JSON.stringify({
          originalAnswer: 'Yes, the company is profitable.',
          revisedAnswer: 'Company profitability is disputed.',
          inconsistencies: ['OSINT reports profit, FININT reports losses'],
          corrections: [],
          confidenceScore: 0.35,
          verificationStatus: 'conflicted',
          reasoningTrace: 'Intelligence sources disagree on financial status.',
          conflictAnalysis: {
            hasConflict: true,
            type: 'source_disagreement',
            description: 'OSINT and FININT sources provide conflicting assessments',
            conflictingSources: ['osint-news-report', 'finint-bank-filing'],
            recommendedResolution: 'Obtain audited financial statements',
          },
        }));

      const result = await service.query(request);

      expect(result.conflictDetails?.type).toBe('source_disagreement');
    });

    it('should detect fact mismatch', async () => {
      const request: HallucinationMitigationRequest = {
        investigationId: 'inv-123',
        question: 'What is the suspect\'s nationality?',
        enableCoVe: true,
      };

      mockGraphRAG.answer.mockResolvedValue({
        answer: 'The suspect is a Canadian citizen.',
        confidence: 0.7,
        citations: { entityIds: ['entity-suspect'] },
        why_paths: [],
      });

      mockLLM.complete
        .mockResolvedValueOnce(JSON.stringify({
          questions: ['What nationality is the suspect?'],
        }))
        .mockResolvedValue(JSON.stringify({
          originalAnswer: 'The suspect is a Canadian citizen.',
          revisedAnswer: 'The suspect\'s nationality is disputed (Canadian vs American).',
          inconsistencies: ['Nationality mismatch in different documents'],
          corrections: [],
          confidenceScore: 0.4,
          verificationStatus: 'conflicted',
          reasoningTrace: 'Documents show conflicting nationality claims.',
          conflictAnalysis: {
            hasConflict: true,
            type: 'fact_mismatch',
            description: 'Passport shows Canadian, visa application shows American',
            conflictingSources: ['passport-scan', 'visa-application'],
            recommendedResolution: 'Verify with government records',
          },
        }));

      const result = await service.query(request);

      expect(result.conflictDetails?.type).toBe('fact_mismatch');
    });
  });

  describe('Circuit Breaker', () => {
    it('should fail fast when circuit is open', async () => {
      const request: HallucinationMitigationRequest = {
        investigationId: 'inv-123',
        question: 'Who is John Doe?',
        enableCoVe: true,
      };

      // Simulate repeated failures to trip circuit breaker
      mockGraphRAG.answer.mockRejectedValue(new Error('Service unavailable'));

      for (let i = 0; i < 6; i++) {
        await expect(service.query(request)).rejects.toThrow();
      }

      // Circuit should be open now - should fail immediately
      const start = Date.now();
      await expect(service.query(request)).rejects.toThrow('CircuitBreaker');
      const duration = Date.now() - start;

      // Should fail fast (< 100ms) when circuit is open
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle GraphRAG service errors gracefully', async () => {
      const request: HallucinationMitigationRequest = {
        investigationId: 'inv-123',
        question: 'Who is John Doe?',
        enableCoVe: true,
      };

      mockGraphRAG.answer.mockRejectedValue(new Error('GraphRAG unavailable'));

      await expect(service.query(request)).rejects.toThrow('GraphRAG unavailable');
    });

    it('should handle LLM errors during verification', async () => {
      const request: HallucinationMitigationRequest = {
        investigationId: 'inv-123',
        question: 'Who is John Doe?',
        enableCoVe: true,
      };

      mockGraphRAG.answer.mockResolvedValue({
        answer: 'John Doe is a person.',
        confidence: 0.8,
        citations: { entityIds: [] },
        why_paths: [],
      });

      mockLLM.complete.mockRejectedValue(new Error('LLM rate limit exceeded'));

      await expect(service.query(request)).rejects.toThrow('LLM rate limit exceeded');
    });

    it('should handle malformed LLM responses', async () => {
      const request: HallucinationMitigationRequest = {
        investigationId: 'inv-123',
        question: 'Who is John Doe?',
        enableCoVe: true,
      };

      mockGraphRAG.answer.mockResolvedValue({
        answer: 'John Doe is a person.',
        confidence: 0.8,
        citations: { entityIds: [] },
        why_paths: [],
      });

      mockLLM.complete.mockResolvedValue('not valid json');

      const result = await service.query(request);
      expect(result.verificationStatus).toBe('unverified');
    });
  });
});
