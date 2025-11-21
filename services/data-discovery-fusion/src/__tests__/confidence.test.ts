import { describe, it, expect, beforeEach } from 'vitest';
import { ConfidenceScorer } from '../confidence/ConfidenceScorer.js';
import { FusionResult, DataProfile, DiscoveredSource } from '../types.js';

describe('ConfidenceScorer', () => {
  let scorer: ConfidenceScorer;

  beforeEach(() => {
    scorer = new ConfidenceScorer();
  });

  describe('generateReport', () => {
    it('should generate confidence report with factors', () => {
      const fusionResult: FusionResult = {
        id: 'fusion-1',
        sourceRecords: [
          { sourceId: 'src1', recordId: '1', data: { name: 'John' } },
        ],
        fusedRecord: { name: 'John' },
        confidenceScore: 0.9,
        strategyUsed: 'fuzzy_match',
        conflictsResolved: [],
        lineage: {
          createdAt: new Date(),
          sources: ['src1'],
          transformations: ['fusion:fuzzy_match'],
        },
      };

      const profiles = new Map<string, DataProfile>();
      const sources = new Map<string, DiscoveredSource>();
      sources.set('src1', {
        id: 'src1',
        name: 'test',
        type: 'database',
        connectionUri: 'test',
        status: 'ready',
        discoveredAt: new Date(),
        confidenceScore: 0.9,
        tags: [],
        autoIngestEnabled: false,
      });

      const report = scorer.generateReport(fusionResult, profiles, sources);

      expect(report.overallScore).toBeGreaterThan(0);
      expect(report.factors).toHaveLength(5);
      expect(report.verifiableReferences).toHaveLength(1);
    });

    it('should add recommendations for low scores', () => {
      const fusionResult: FusionResult = {
        id: 'fusion-1',
        sourceRecords: [
          { sourceId: 'src1', recordId: '1', data: { name: 'John' } },
          { sourceId: 'src2', recordId: '2', data: { name: 'Jon' } },
        ],
        fusedRecord: { name: 'John' },
        confidenceScore: 0.5,
        strategyUsed: 'fuzzy_match',
        conflictsResolved: [
          { field: 'name', values: ['John', 'Jon'], resolvedValue: 'John', resolutionMethod: 'most_complete' },
        ],
        lineage: {
          createdAt: new Date(),
          sources: ['src1', 'src2'],
          transformations: ['fusion:fuzzy_match'],
        },
      };

      const report = scorer.generateReport(fusionResult, new Map(), new Map());

      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('formatScore', () => {
    it('should format scores correctly', () => {
      expect(scorer.formatScore(0.95)).toBe('Very High');
      expect(scorer.formatScore(0.75)).toBe('High');
      expect(scorer.formatScore(0.55)).toBe('Medium');
      expect(scorer.formatScore(0.35)).toBe('Low');
      expect(scorer.formatScore(0.15)).toBe('Very Low');
    });
  });

  describe('generateVisualization', () => {
    it('should generate visualization data', () => {
      const report = {
        overallScore: 0.8,
        factors: [
          { factor: 'test', weight: 0.5, score: 0.8, explanation: 'test' },
        ],
        recommendations: [],
        verifiableReferences: [],
      };

      const viz = scorer.generateVisualization(report);

      expect(viz).toHaveProperty('type', 'confidence_chart');
      expect(viz).toHaveProperty('data');
    });
  });
});
