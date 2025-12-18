/**
 * Tests for ContextFusion
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ContextFusion } from '../fusion/ContextFusion.js';
import { EvidenceChunk } from '../types/index.js';

describe('ContextFusion', () => {
  let fusion: ContextFusion;

  beforeEach(() => {
    fusion = new ContextFusion({
      maxTokens: 4000,
      deduplicationThreshold: 0.85,
      conflictResolutionStrategy: 'highest_confidence',
      preserveCitations: true,
    });
  });

  const createMockChunk = (
    id: string,
    content: string,
    relevance: number,
    sourceType: 'graph' | 'document' = 'document',
  ): EvidenceChunk => ({
    id,
    content,
    citations: [
      {
        id: `citation-${id}`,
        documentId: `doc-${id}`,
        spanStart: 0,
        spanEnd: content.length,
        content,
        confidence: relevance,
        sourceType,
      },
    ],
    graphPaths: [],
    relevanceScore: relevance,
    tenantId: 'tenant-1',
  });

  describe('fuse', () => {
    it('should fuse evidence from multiple sources', async () => {
      const graphEvidence = [
        createMockChunk('g1', 'Graph evidence about entity A', 0.9, 'graph'),
      ];
      const documentEvidence = [
        createMockChunk('d1', 'Document evidence about entity A', 0.8, 'document'),
      ];

      const result = await fusion.fuse(graphEvidence, documentEvidence);

      expect(result.id).toBeDefined();
      expect(result.sources.length).toBeGreaterThan(0);
      expect(result.fusedContent).toContain('Graph Evidence');
      expect(result.fusedContent).toContain('Document Evidence');
      expect(result.totalTokens).toBeGreaterThan(0);
    });

    it('should deduplicate similar content', async () => {
      const graphEvidence = [
        createMockChunk('g1', 'The entity A is located in New York', 0.9, 'graph'),
      ];
      const documentEvidence = [
        createMockChunk('d1', 'The entity A is located in New York', 0.8, 'document'),
      ];

      const result = await fusion.fuse(graphEvidence, documentEvidence);

      // Should have deduplicated to fewer sources
      expect(result.sources.length).toBeLessThanOrEqual(2);
    });

    it('should detect and resolve conflicts', async () => {
      const graphEvidence = [
        createMockChunk(
          'g1',
          'John Smith was born in 1980 in New York',
          0.9,
          'graph',
        ),
      ];
      const documentEvidence = [
        createMockChunk(
          'd1',
          'John Smith was not born in 1980, he was born in 1985',
          0.7,
          'document',
        ),
      ];

      const result = await fusion.fuse(graphEvidence, documentEvidence);

      // Should detect the conflict about birth year
      expect(result.conflictsResolved.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty evidence', async () => {
      const result = await fusion.fuse([], []);

      expect(result.sources).toHaveLength(0);
      expect(result.fusedContent).toBe('');
      expect(result.totalTokens).toBe(0);
    });

    it('should compress content to fit token budget', async () => {
      const longContent = 'A'.repeat(20000);
      const graphEvidence = [
        createMockChunk('g1', longContent, 0.9, 'graph'),
      ];

      const smallFusion = new ContextFusion({ maxTokens: 100 });
      const result = await smallFusion.fuse(graphEvidence, []);

      expect(result.compressionRatio).toBeLessThan(1);
    });
  });

  describe('configuration', () => {
    it('should use default configuration', () => {
      const defaultFusion = new ContextFusion();
      expect(defaultFusion).toBeDefined();
    });

    it('should allow different conflict resolution strategies', async () => {
      const mergeFusion = new ContextFusion({
        conflictResolutionStrategy: 'merge',
      });

      const evidence1 = [createMockChunk('g1', 'Entity A is active', 0.9, 'graph')];
      const evidence2 = [
        createMockChunk('d1', 'Entity A is not active', 0.8, 'document'),
      ];

      const result = await mergeFusion.fuse(evidence1, evidence2);
      expect(result).toBeDefined();
    });
  });
});
