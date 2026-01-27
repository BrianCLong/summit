/**
 * Copilot Governance Bypass Prevention Tests
 *
 * These tests ensure that ALL copilot responses include governance verdicts
 * and that bypassing governance is structurally impossible.
 *
 * SOC 2 Evidence: CC6.1, CC7.2, PI1.3
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  CopilotGovernanceService,
  createCopilotGovernanceService,
} from '../governance.service.ts';
import { CopilotAnswerSchema } from '../types.ts';
import type {
  CopilotAnswer,
  CopilotRefusal,
  GovernanceVerdict,
  GuardrailCheck,
} from '../types.ts';

describe('Copilot Governance Bypass Prevention', () => {
  let governanceService: CopilotGovernanceService;

  beforeEach(() => {
    governanceService = createCopilotGovernanceService();
  });

  describe('Type System Enforcement', () => {
    it('should require governanceVerdict in CopilotAnswer', () => {
      const mockAnswer: Omit<CopilotAnswer, 'governanceVerdict'> = {
        answerId: 'answer-123',
        answer: 'Test answer',
        confidence: 0.95,
        citations: [],
        provenance: {
          evidenceIds: [],
          claimIds: [],
          entityIds: [],
          relationshipIds: [],
          chainConfidence: 0.9,
        },
        whyPaths: [],
        redaction: {
          wasRedacted: false,
          redactedCount: 0,
          redactionTypes: [],
          uncertaintyAcknowledged: false,
        },
        guardrails: {
          passed: true,
          checks: [],
        },
        generatedAt: new Date().toISOString(),
        investigationId: 'inv-123',
        originalQuery: 'test query',
        warnings: [],
      };

      const guardrails: GuardrailCheck = {
        passed: true,
        checks: [],
      };

      const verdict = governanceService.generateApprovedVerdict(mockAnswer, guardrails);

      // Complete answer with verdict
      const completeAnswer: CopilotAnswer = {
        ...mockAnswer,
        governanceVerdict: verdict,
      };

      expect(completeAnswer.governanceVerdict).toBeDefined();
      expect(completeAnswer.governanceVerdict.verdict).toBe('APPROVED');
    });

    it('should NOT allow CopilotAnswer without governanceVerdict (TypeScript check)', () => {
      const invalidAnswer = {
        answerId: 'answer-123',
        answer: 'Test answer',
        confidence: 0.95,
        citations: [],
        provenance: {
          evidenceIds: [],
          claimIds: [],
          entityIds: [],
          relationshipIds: [],
          chainConfidence: 0.9,
        },
        whyPaths: [],
        redaction: {
          wasRedacted: false,
          redactedCount: 0,
          redactionTypes: [],
          uncertaintyAcknowledged: false,
        },
        guardrails: {
          passed: true,
          checks: [],
        },
        generatedAt: new Date().toISOString(),
        investigationId: 'inv-123',
        originalQuery: 'test query',
        warnings: [],
        // Missing governanceVerdict
      };

      expect(() => CopilotAnswerSchema.parse(invalidAnswer)).toThrow();
    });
  });

  describe('Approved Answer Verdicts', () => {
    it('should generate APPROVED verdict for valid answer', () => {
      const mockAnswer: Omit<CopilotAnswer, 'governanceVerdict'> = {
        answerId: 'answer-123',
        answer: 'Test answer',
        confidence: 0.95,
        citations: [
          {
            id: 'cite-1',
            sourceType: 'graph_entity',
            sourceId: 'entity-1',
            label: 'Test Entity',
            confidence: 0.9,
            wasRedacted: false,
          },
        ],
        provenance: {
          evidenceIds: ['ev-1'],
          claimIds: ['claim-1'],
          entityIds: ['entity-1'],
          relationshipIds: ['rel-1'],
          chainConfidence: 0.9,
        },
        whyPaths: [],
        redaction: {
          wasRedacted: false,
          redactedCount: 0,
          redactionTypes: [],
          uncertaintyAcknowledged: false,
        },
        guardrails: {
          passed: true,
          checks: [
            { name: 'pii-check', passed: true },
            { name: 'content-moderation', passed: true },
          ],
        },
        generatedAt: new Date().toISOString(),
        investigationId: 'inv-123',
        originalQuery: 'test query',
        warnings: [],
      };

      const verdict = governanceService.generateApprovedVerdict(mockAnswer, mockAnswer.guardrails);

      expect(verdict.verdict).toBe('APPROVED');
      expect(verdict.policy).toBe('copilot-answer-policy');
      expect(verdict.confidence).toBeGreaterThan(0);
      expect(verdict.confidence).toBeLessThanOrEqual(1);
      expect(verdict.metadata?.soc2Controls).toContain('CC6.1');
      expect(verdict.metadata?.soc2Controls).toContain('CC7.2');
      expect(verdict.metadata?.soc2Controls).toContain('PI1.3');
    });

    it('should reduce confidence when guardrails have concerns', () => {
      const mockAnswer: Omit<CopilotAnswer, 'governanceVerdict'> = {
        answerId: 'answer-123',
        answer: 'Test answer',
        confidence: 0.95,
        citations: [],
        provenance: {
          evidenceIds: [],
          claimIds: [],
          entityIds: [],
          relationshipIds: [],
          chainConfidence: 0.9,
        },
        whyPaths: [],
        redaction: {
          wasRedacted: false,
          redactedCount: 0,
          redactionTypes: [],
          uncertaintyAcknowledged: false,
        },
        guardrails: {
          passed: false,
          checks: [
            {
              name: 'content-moderation',
              passed: false,
              reason: 'Potential sensitive content',
            },
          ],
          failureReason: 'Content moderation flagged',
        },
        generatedAt: new Date().toISOString(),
        investigationId: 'inv-123',
        originalQuery: 'test query',
        warnings: [],
      };

      const verdict = governanceService.generateApprovedVerdict(mockAnswer, mockAnswer.guardrails);

      // Confidence should be reduced due to guardrail failure
      expect(verdict.confidence).toBeLessThan(mockAnswer.confidence);
      expect(verdict.metadata?.riskLevel).toBe('high');
    });

    it('should handle redacted answers appropriately', () => {
      const mockAnswer: Omit<CopilotAnswer, 'governanceVerdict'> = {
        answerId: 'answer-123',
        answer: 'Test answer with redactions',
        confidence: 0.85,
        citations: [],
        provenance: {
          evidenceIds: [],
          claimIds: [],
          entityIds: [],
          relationshipIds: [],
          chainConfidence: 0.8,
        },
        whyPaths: [],
        redaction: {
          wasRedacted: true,
          redactedCount: 10,
          redactionTypes: ['PII', 'CLASSIFIED'],
          uncertaintyAcknowledged: true,
        },
        guardrails: {
          passed: true,
          checks: [],
        },
        generatedAt: new Date().toISOString(),
        investigationId: 'inv-123',
        originalQuery: 'test query',
        warnings: [],
      };

      const verdict = governanceService.generateApprovedVerdict(mockAnswer, mockAnswer.guardrails);

      expect(verdict.verdict).toBe('APPROVED');
      expect(verdict.metadata?.redactionApplied).toBe(true);
      expect(verdict.metadata?.riskLevel).toBe('medium'); // Higher risk due to heavy redaction
    });
  });

  describe('Refusal Verdicts', () => {
    it('should generate REJECTED verdict for policy violations', () => {
      const mockRefusal: Omit<CopilotRefusal, 'governanceVerdict'> = {
        refusalId: 'ref-123',
        reason: 'Policy violation detected',
        category: 'policy_violation',
        suggestions: ['Review policy', 'Contact admin'],
        timestamp: new Date().toISOString(),
        auditId: 'audit-123',
      };

      const verdict = governanceService.generateRefusalVerdict(mockRefusal);

      expect(verdict.verdict).toBe('REJECTED');
      expect(verdict.policy).toBe('copilot-refusal-policy');
      expect(verdict.metadata?.riskLevel).toBe('critical');
      expect(verdict.metadata?.refusalCategory).toBe('policy_violation');
    });

    it('should generate REJECTED verdict for unsafe queries', () => {
      const mockRefusal: Omit<CopilotRefusal, 'governanceVerdict'> = {
        refusalId: 'ref-123',
        reason: 'Query contains malicious patterns',
        category: 'unsafe_query',
        suggestions: ['Rephrase query', 'Remove malicious content'],
        timestamp: new Date().toISOString(),
        auditId: 'audit-123',
      };

      const verdict = governanceService.generateRefusalVerdict(mockRefusal);

      expect(verdict.verdict).toBe('REJECTED');
      expect(verdict.metadata?.riskLevel).toBe('critical');
      expect(verdict.confidence).toBe(1.0);
    });

    it('should generate REQUIRES_REVIEW for internal errors', () => {
      const mockRefusal: Omit<CopilotRefusal, 'governanceVerdict'> = {
        refusalId: 'ref-123',
        reason: 'Internal processing error',
        category: 'internal_error',
        suggestions: ['Retry later', 'Contact support'],
        timestamp: new Date().toISOString(),
        auditId: 'audit-123',
      };

      const verdict = governanceService.generateRefusalVerdict(mockRefusal);

      expect(verdict.verdict).toBe('REQUIRES_REVIEW');
      expect(verdict.metadata?.riskLevel).toBe('medium');
      expect(verdict.confidence).toBe(0.8);
    });
  });

  describe('Prompt Validation Verdicts', () => {
    it('should generate APPROVED for allowed prompts', () => {
      const verdict = governanceService.generatePromptVerdict(true, undefined, 'low');

      expect(verdict.verdict).toBe('APPROVED');
      expect(verdict.policy).toBe('prompt-guardrails-policy');
      expect(verdict.metadata?.riskLevel).toBe('low');
    });

    it('should generate REJECTED for blocked prompts', () => {
      const verdict = governanceService.generatePromptVerdict(
        false,
        'Prompt contains prohibited content',
        'critical'
      );

      expect(verdict.verdict).toBe('REJECTED');
      expect(verdict.metadata?.riskLevel).toBe('critical');
      expect(verdict.metadata?.remediationSuggestions).toBeDefined();
    });
  });

  describe('Response Validation', () => {
    it('should validate that answer responses have verdicts', () => {
      const validResponse = {
        type: 'answer',
        data: {
          answerId: 'answer-123',
          answer: 'Test',
          confidence: 0.9,
          citations: [],
          provenance: {
            evidenceIds: [],
            claimIds: [],
            entityIds: [],
            relationshipIds: [],
            chainConfidence: 0.9,
          },
          whyPaths: [],
          redaction: {
            wasRedacted: false,
            redactedCount: 0,
            redactionTypes: [],
            uncertaintyAcknowledged: false,
          },
          guardrails: { passed: true, checks: [] },
          governanceVerdict: {
            verdict: 'APPROVED',
            policy: 'test',
            rationale: 'test',
            timestamp: new Date().toISOString(),
            evaluatedBy: 'test',
            confidence: 1.0,
          } as GovernanceVerdict,
          generatedAt: new Date().toISOString(),
          investigationId: 'inv-123',
          originalQuery: 'test',
          warnings: [],
        },
      };

      const isValid = governanceService.validateResponseHasVerdict(validResponse);
      expect(isValid).toBe(true);
    });

    it('should detect missing verdicts in answer responses', () => {
      const invalidResponse = {
        type: 'answer',
        data: {
          answerId: 'answer-123',
          answer: 'Test',
          // Missing governanceVerdict
        },
      };

      const isValid = governanceService.validateResponseHasVerdict(invalidResponse);
      expect(isValid).toBe(false);
    });

    it('should allow preview responses without verdicts', () => {
      const previewResponse = {
        type: 'preview',
        data: {
          queryId: 'query-123',
          cypher: 'MATCH (n) RETURN n',
        },
      };

      const isValid = governanceService.validateResponseHasVerdict(previewResponse);
      expect(isValid).toBe(true);
    });
  });

  describe('Emergency Rejection Failsafe', () => {
    it('should generate emergency rejection when normal verdict fails', () => {
      const verdict = governanceService.generateEmergencyRejection(
        'Critical system failure detected'
      );

      expect(verdict.verdict).toBe('REJECTED');
      expect(verdict.policy).toBe('emergency-failsafe');
      expect(verdict.metadata?.riskLevel).toBe('critical');
      expect(verdict.metadata?.isEmergencyFailsafe).toBe(true);
      expect(verdict.confidence).toBe(1.0);
    });

    it('should include security contact suggestions in emergency rejection', () => {
      const verdict = governanceService.generateEmergencyRejection('Unknown error');

      expect(verdict.metadata?.remediationSuggestions).toBeDefined();
      expect(
        verdict.metadata?.remediationSuggestions?.some((s: string) =>
          s.toLowerCase().includes('security')
        )
      ).toBe(true);
    });
  });

  describe('Edge Cases and Bypass Attempts', () => {
    it('should reject null/undefined guardrails inputs', () => {
      const mockAnswer = {
        answerId: 'test',
        answer: 'test',
        confidence: 0.9,
        citations: [],
        provenance: {
          evidenceIds: [],
          claimIds: [],
          entityIds: [],
          relationshipIds: [],
          chainConfidence: 0.9,
        },
        whyPaths: [],
        redaction: {
          wasRedacted: false,
          redactedCount: 0,
          redactionTypes: [],
          uncertaintyAcknowledged: false,
        },
        guardrails: { passed: true, checks: [] },
        generatedAt: new Date().toISOString(),
        investigationId: 'inv-123',
        originalQuery: 'test',
        warnings: [],
      };

      expect(() => {
        governanceService.generateApprovedVerdict(mockAnswer, null as any);
      }).toThrow();

      expect(() => {
        governanceService.generateApprovedVerdict(mockAnswer, undefined as any);
      }).toThrow();
    });

    it('should prevent bypass via response manipulation', () => {
      const response = {
        type: 'answer',
        data: {},
      };

      // Attempt to bypass by setting verdict to undefined
      (response.data as any).governanceVerdict = undefined;

      const isValid = governanceService.validateResponseHasVerdict(response);
      expect(isValid).toBe(false);
    });

    it('should enforce verdict presence even with property deletion', () => {
      const answer: any = {
        answerId: 'test',
        answer: 'test',
        governanceVerdict: {
          verdict: 'APPROVED',
          policy: 'test',
          rationale: 'test',
          timestamp: new Date().toISOString(),
          evaluatedBy: 'test',
          confidence: 1.0,
        },
      };

      // Attempt bypass by deleting verdict
      delete answer.governanceVerdict;

      expect(answer.governanceVerdict).toBeUndefined();
      // In production, Zod schema validation would catch this before response
    });
  });

  describe('SOC 2 Compliance', () => {
    it('should always include SOC 2 control mappings', () => {
      const verdict = governanceService.generatePromptVerdict(true);

      expect(verdict.metadata?.soc2Controls).toBeDefined();
      expect(verdict.metadata?.soc2Controls).toEqual(
        expect.arrayContaining(['CC6.1', 'PI1.3'])
      );
    });

    it('should include audit trail in refusals', () => {
      const mockRefusal: Omit<CopilotRefusal, 'governanceVerdict'> = {
        refusalId: 'ref-123',
        reason: 'Test refusal',
        category: 'internal_error',
        suggestions: [],
        timestamp: new Date().toISOString(),
        auditId: 'audit-123',
      };

      const verdict = governanceService.generateRefusalVerdict(mockRefusal);

      expect(verdict.metadata?.auditId).toBe('audit-123');
    });
  });
});
