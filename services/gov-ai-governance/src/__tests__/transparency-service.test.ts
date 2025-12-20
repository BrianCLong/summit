/**
 * Transparency Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TransparencyService } from '../transparency-service.js';
import type { AIDecision } from '../types.js';

describe('TransparencyService', () => {
  let service: TransparencyService;

  const testDecision: Omit<AIDecision, 'decisionId' | 'madeAt'> = {
    modelId: '550e8400-e29b-41d4-a716-446655440000',
    citizenId: '550e8400-e29b-41d4-a716-446655440001',
    decisionType: 'benefits_eligibility',
    inputSummary: { income: 'below_threshold', dependents: 2 },
    outputSummary: { eligible: true, tier: 'standard' },
    confidence: 0.92,
    explanation: {
      humanReadable: 'Based on income level and number of dependents, you qualify for standard benefits.',
      technicalDetails: { model_version: '1.0.0', features_used: 15 },
      contributingFactors: [
        { factor: 'Income below threshold', weight: 0.6, direction: 'positive' },
        { factor: 'Number of dependents', weight: 0.3, direction: 'positive' },
        { factor: 'Employment status', weight: 0.1, direction: 'neutral' },
      ],
    },
    humanReviewRequired: false,
    appealable: true,
    appealDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  beforeEach(() => {
    service = new TransparencyService({ agency: 'Test Agency' });
  });

  describe('recordDecision', () => {
    it('should record decision with ID and timestamp', async () => {
      const decision = await service.recordDecision(testDecision);

      expect(decision.decisionId).toBeDefined();
      expect(decision.madeAt).toBeDefined();
      expect(decision.confidence).toBe(0.92);
    });
  });

  describe('getDecisionExplanation', () => {
    it('should return citizen-friendly explanation', async () => {
      const decision = await service.recordDecision(testDecision);
      const explanation = await service.getDecisionExplanation(decision.decisionId);

      expect(explanation).not.toBeNull();
      expect(explanation?.summary).toContain('qualify for standard benefits');
      expect(explanation?.factors).toHaveLength(3);
      expect(explanation?.appealInfo).toBeDefined();
    });

    it('should include appeal info for appealable decisions', async () => {
      const decision = await service.recordDecision(testDecision);
      const explanation = await service.getDecisionExplanation(decision.decisionId);

      expect(explanation?.appealInfo?.process).toContain('citizen portal');
    });
  });

  describe('fileAppeal', () => {
    it('should create appeal for appealable decision', async () => {
      const decision = await service.recordDecision(testDecision);

      const appeal = await service.fileAppeal(
        decision.decisionId,
        testDecision.citizenId!,
        'Income calculation did not include recent job loss',
      );

      expect(appeal.appealId).toBeDefined();
      expect(appeal.status).toBe('pending_review');
    });

    it('should reject appeal for non-appealable decision', async () => {
      const nonAppealable = { ...testDecision, appealable: false };
      const decision = await service.recordDecision(nonAppealable);

      await expect(
        service.fileAppeal(decision.decisionId, testDecision.citizenId!, 'Test'),
      ).rejects.toThrow(/not appealable/);
    });
  });

  describe('generateReport', () => {
    it('should generate transparency report with statistics', async () => {
      // Record some decisions
      await service.recordDecision(testDecision);
      await service.recordDecision({ ...testDecision, humanReviewRequired: true });

      const report = await service.generateReport(
        new Date(Date.now() - 24 * 60 * 60 * 1000),
        new Date(),
      );

      expect(report.reportId).toBeDefined();
      expect(report.agency).toBe('Test Agency');
      expect(report.decisionsAugmented + report.decisionsAutomated).toBe(2);
    });
  });

  describe('audit trail', () => {
    it('should maintain hash-chained audit trail', async () => {
      await service.recordDecision(testDecision);
      await service.recordDecision(testDecision);

      const integrity = await service.verifyAuditIntegrity();

      expect(integrity.valid).toBe(true);
      expect(integrity.chainLength).toBeGreaterThanOrEqual(2);
    });

    it('should allow querying audit events', async () => {
      await service.recordDecision(testDecision);

      const events = await service.queryAuditTrail({
        eventType: 'decision_made',
        limit: 10,
      });

      expect(events.length).toBeGreaterThanOrEqual(1);
      expect(events[0].eventType).toBe('decision_made');
    });
  });
});
