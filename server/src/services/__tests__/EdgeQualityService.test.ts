import { EdgeQualityService, AssessableEdge, EdgeEvidence } from '../EdgeQualityService';

describe('EdgeQualityService', () => {
  let service: EdgeQualityService;

  beforeEach(() => {
    service = new EdgeQualityService();
  });

  describe('assessEdge', () => {
    it('should calculate a high score for a fresh, manual edge with strong evidence', () => {
      const edge: AssessableEdge = {
        id: 'edge1',
        sourceId: 'a',
        targetId: 'b',
        type: 'RELATIONSHIP',
        provenance: {
          source: 'manual',
          method: 'user_created',
          generatedAt: new Date(), // Now
        },
        evidence: [
          {
            id: 'ev1',
            source: 'doc1',
            timestamp: new Date(),
            confidence: 1.0,
            type: 'document',
          },
          {
            id: 'ev2',
            source: 'doc2',
            timestamp: new Date(),
            confidence: 0.9,
            type: 'document',
          },
        ],
      };

      const result = service.assessEdge(edge);

      expect(result.overallScore).toBeGreaterThan(0.8);
      expect(result.factors.evidenceScore).toBeGreaterThan(0.9);
      expect(result.factors.recencyScore).toBeCloseTo(1.0, 1);
      expect(result.factors.provenanceScore).toBe(1.0);
      expect(result.details).toContain('Strong evidence support');
      expect(result.details).toContain('High-trust source');
    });

    it('should calculate a lower score for an old, inferred edge without evidence', () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 1); // 1 year ago

      const edge: AssessableEdge = {
        id: 'edge2',
        sourceId: 'a',
        targetId: 'b',
        type: 'RELATIONSHIP',
        provenance: {
          source: 'ai_inference',
          method: 'nlp',
          generatedAt: oldDate,
        },
        evidence: [],
      };

      const result = service.assessEdge(edge);

      expect(result.overallScore).toBeLessThan(0.5);
      expect(result.factors.evidenceScore).toBe(0.1); // Base score for no evidence
      expect(result.factors.recencyScore).toBeLessThan(0.2);
      expect(result.factors.provenanceScore).toBe(0.6); // AI inference score
      expect(result.details).toContain('Weak or missing evidence');
      expect(result.details).toContain('Stale data');
    });

    it('should handle missing evidence array gracefully', () => {
      const edge: AssessableEdge = {
        id: 'edge3',
        sourceId: 'a',
        targetId: 'b',
        type: 'RELATIONSHIP',
        provenance: {
          source: 'manual',
          method: 'user',
          generatedAt: new Date(),
        },
      };

      const result = service.assessEdge(edge);
      expect(result.factors.evidenceScore).toBe(0.1);
    });

    it('should handle unknown provenance sources', () => {
        const edge: AssessableEdge = {
          id: 'edge4',
          sourceId: 'a',
          targetId: 'b',
          type: 'RELATIONSHIP',
          provenance: {
            source: 'mysterious_source',
            method: 'magic',
            generatedAt: new Date(),
          },
        };

        const result = service.assessEdge(edge);
        expect(result.factors.provenanceScore).toBe(0.1); // Unknown score
      });
  });

  describe('calculateRecencyScore', () => {
      // Accessing private method via any cast for unit testing specific logic if needed,
      // but public API testing is preferred. We did that above.
      // Let's test a specific date decay case via the public API.

      it('should decay score to approx 0.5 after 30 days', () => {
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const edge: AssessableEdge = {
            id: 'edge5',
            sourceId: 'a',
            targetId: 'b',
            type: 'REL',
            provenance: { source: 'manual', method: 'test', generatedAt: thirtyDaysAgo },
            evidence: [],
          };

          const result = service.assessEdge(edge);
          // Recency should be ~0.5
          expect(result.factors.recencyScore).toBeCloseTo(0.5, 1);
      });
  });
});
