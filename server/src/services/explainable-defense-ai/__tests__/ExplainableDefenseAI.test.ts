/**
 * Tests for Explainable Defense AI Service
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  ExplainableDefenseAI,
  type DataSource,
  type EvidenceItem,
  type FeatureContribution,
} from '../ExplainableDefenseAI.js';

describe('ExplainableDefenseAI', () => {
  let xai: ExplainableDefenseAI;

  beforeEach(() => {
    xai = new ExplainableDefenseAI('test-service');
  });

  describe('Data Ingest', () => {
    it('should ingest data with provenance tracking', async () => {
      const source: DataSource = {
        id: 'src-001',
        name: 'Test Source',
        type: 'OSINT',
        classification: 'UNCLASSIFIED',
        reliability: 'B',
        credibility: 2,
        timestamp: new Date(),
      };

      const evidence = [
        { sourceId: 'src-001', content: 'Test evidence', extractedAt: new Date(), confidence: 0.85, metadata: {} },
      ];

      const result = await xai.ingestData(source, { raw: 'data' }, evidence);

      expect(result.evidenceItems).toHaveLength(1);
      expect(result.evidenceItems[0].contentHash).toBeDefined();
      expect(result.chainNode.nodeType).toBe('INGEST');
      expect(result.chainNode.signature).toBeDefined();
    });
  });

  describe('Analysis with Explainability', () => {
    it('should produce reasoning steps and feature contributions', async () => {
      const evidence: EvidenceItem[] = [
        { id: 'e1', sourceId: 's1', content: 'Evidence 1', contentHash: 'h1', extractedAt: new Date(), confidence: 0.9, metadata: {} },
        { id: 'e2', sourceId: 's2', content: 'Evidence 2', contentHash: 'h2', extractedAt: new Date(), confidence: 0.8, metadata: {} },
      ];

      const analysisFn = async (inputs: EvidenceItem[]) => ({
        result: { score: 0.85 },
        features: inputs.map((e, i) => ({
          feature: `feature_${i}`,
          value: e.confidence,
          weight: 0.5,
          contribution: e.confidence * 0.5,
          direction: 'positive' as const,
          explanation: `Feature ${i} explanation`,
        })),
      });

      const result = await xai.analyzeWithExplanation('RISK_ASSESSMENT', evidence, analysisFn);

      expect(result.explanation.decisionType).toBe('RISK_ASSESSMENT');
      expect(result.explanation.reasoning.length).toBeGreaterThan(0);
      expect(result.explanation.featureContributions.length).toBe(2);
      expect(result.explanation.humanReadableSummary).toBeDefined();
      expect(result.chainNode.nodeType).toBe('ANALYZE');
    });

    it('should identify limitations when evidence is sparse', async () => {
      const evidence: EvidenceItem[] = [
        { id: 'e1', sourceId: 's1', content: 'Single evidence', contentHash: 'h1', extractedAt: new Date(), confidence: 0.6, metadata: {} },
      ];

      const analysisFn = async () => ({
        result: { score: 0.6 },
        features: [{ feature: 'f1', value: 0.6, weight: 1, contribution: 0.6, direction: 'neutral' as const, explanation: 'Test' }],
      });

      const result = await xai.analyzeWithExplanation('ANOMALY_DETECTION', evidence, analysisFn);

      expect(result.explanation.limitations).toContain('Limited source diversity - fewer than 3 independent sources');
    });
  });

  describe('Prioritization', () => {
    it('should rank items with justifications', async () => {
      const items = [
        { id: 'item-1', data: { urgency: 0.9, impact: 0.8 }, evidence: [] },
        { id: 'item-2', data: { urgency: 0.5, impact: 0.9 }, evidence: [] },
        { id: 'item-3', data: { urgency: 0.3, impact: 0.4 }, evidence: [] },
      ];

      const criteria = [
        { name: 'Urgency', weight: 0.6, evaluator: (item: unknown) => (item as { urgency: number }).urgency },
        { name: 'Impact', weight: 0.4, evaluator: (item: unknown) => (item as { impact: number }).impact },
      ];

      const result = await xai.prioritizeWithJustification(items, criteria);

      expect(result.ranked).toHaveLength(3);
      expect(result.ranked[0].rank).toBe(1);
      expect(result.ranked[0].id).toBe('item-1'); // Highest combined score
      expect(result.ranked[0].justification).toContain('Urgency');
      expect(result.explanation.decisionType).toBe('PRIORITIZATION');
    });
  });

  describe('Intelligence Fusion', () => {
    it('should fuse multiple sources with chain of trust', async () => {
      const sources = [
        {
          source: {
            id: 'sigint-1',
            name: 'SIGINT Source',
            type: 'SIGINT' as const,
            classification: 'SECRET' as const,
            reliability: 'A' as const,
            credibility: 1 as const,
            timestamp: new Date(),
          },
          evidence: [
            { id: 'e1', sourceId: 'sigint-1', content: 'SIGINT data', contentHash: 'h1', extractedAt: new Date(), confidence: 0.95, metadata: {} },
          ],
        },
        {
          source: {
            id: 'humint-1',
            name: 'HUMINT Source',
            type: 'HUMINT' as const,
            classification: 'CONFIDENTIAL' as const,
            reliability: 'B' as const,
            credibility: 2 as const,
            timestamp: new Date(),
          },
          evidence: [
            { id: 'e2', sourceId: 'humint-1', content: 'HUMINT data', contentHash: 'h2', extractedAt: new Date(), confidence: 0.80, metadata: {} },
          ],
        },
      ];

      const product = await xai.fuseIntelligence(sources, 'WEIGHTED_CONSENSUS');

      expect(product.id).toBeDefined();
      expect(product.classification).toBe('SECRET'); // Highest classification
      expect(product.chainOfTrust.length).toBe(3); // TRANSFORM, FUSE, OUTPUT
      expect(product.explanation.decisionType).toBe('FUSION');
      expect(product.confidence).toBeGreaterThan(0);
    });
  });

  describe('Chain of Trust Verification', () => {
    it('should verify valid chain', async () => {
      const sources = [
        {
          source: {
            id: 'test-src',
            name: 'Test',
            type: 'OSINT' as const,
            classification: 'UNCLASSIFIED' as const,
            reliability: 'C' as const,
            credibility: 3 as const,
            timestamp: new Date(),
          },
          evidence: [
            { id: 'e1', sourceId: 'test-src', content: 'Data', contentHash: 'h1', extractedAt: new Date(), confidence: 0.7, metadata: {} },
          ],
        },
      ];

      const product = await xai.fuseIntelligence(sources, 'MAJORITY_VOTE');
      const verification = xai.verifyChainOfTrust(product.id);

      expect(verification.valid).toBe(true);
      expect(verification.issues).toHaveLength(0);
      expect(verification.verificationReport).toContain('verified');
    });

    it('should detect missing chain', () => {
      const verification = xai.verifyChainOfTrust('nonexistent-id');

      expect(verification.valid).toBe(false);
      expect(verification.issues).toContain('Chain not found');
    });
  });

  describe('Audit Trail', () => {
    it('should maintain audit records', async () => {
      const source: DataSource = {
        id: 'audit-test',
        name: 'Audit Test',
        type: 'OSINT',
        classification: 'UNCLASSIFIED',
        reliability: 'C',
        credibility: 3,
        timestamp: new Date(),
      };

      await xai.ingestData(source, {}, []);

      const audit = xai.getAuditTrail();
      expect(audit.length).toBeGreaterThan(0);
      expect(audit[0].action).toBe('DATA_INGEST');
    });

    it('should export audit manifest with merkle root', async () => {
      const source: DataSource = {
        id: 'manifest-test',
        name: 'Manifest Test',
        type: 'OSINT',
        classification: 'UNCLASSIFIED',
        reliability: 'C',
        credibility: 3,
        timestamp: new Date(),
      };

      await xai.ingestData(source, {}, []);
      const manifest = xai.exportAuditManifest();

      expect(manifest.merkleRoot).toBeDefined();
      expect(manifest.signature).toBeDefined();
      expect(manifest.exportedAt).toBeInstanceOf(Date);
    });
  });

  describe('Human-Readable Reports', () => {
    it('should generate readable report from explanation', async () => {
      const evidence: EvidenceItem[] = [
        { id: 'e1', sourceId: 's1', content: 'Test', contentHash: 'h1', extractedAt: new Date(), confidence: 0.9, metadata: {} },
      ];

      const analysisFn = async () => ({
        result: { score: 0.9 },
        features: [{
          feature: 'test_feature',
          value: 0.9,
          weight: 1,
          contribution: 0.9,
          direction: 'positive' as const,
          explanation: 'High test feature',
        }],
      });

      const { explanation } = await xai.analyzeWithExplanation('RISK_ASSESSMENT', evidence, analysisFn);
      const report = xai.generateHumanReadableReport(explanation);

      expect(report).toContain('## RISK_ASSESSMENT Decision Report');
      expect(report).toContain('### Reasoning Chain');
      expect(report).toContain('### Key Contributing Factors');
    });
  });
});
