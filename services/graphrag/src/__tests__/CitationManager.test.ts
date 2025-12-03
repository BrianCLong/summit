/**
 * Tests for CitationManager
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CitationManager } from '../citation/CitationManager.js';

// Mock Neo4j driver
const mockSession = {
  run: jest.fn(),
  close: jest.fn(),
};

const mockDriver = {
  session: jest.fn(() => mockSession),
};

describe('CitationManager', () => {
  let citationManager: CitationManager;

  beforeEach(() => {
    jest.clearAllMocks();
    citationManager = new CitationManager(mockDriver as any);
  });

  describe('createCitation', () => {
    it('should create a citation linking entity to document', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [{ get: () => ({}) }],
      });

      const citation = await citationManager.createCitation(
        'entity-1',
        'document-1',
        'This is the cited content',
        0,
        25,
        0.9,
        { source: 'test' },
      );

      expect(citation.id).toBeDefined();
      expect(citation.documentId).toBe('document-1');
      expect(citation.content).toBe('This is the cited content');
      expect(citation.confidence).toBe(0.9);
      expect(citation.sourceType).toBe('document');
    });
  });

  describe('getCitationsForEntity', () => {
    it('should retrieve all citations for an entity', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: (key: string) => {
              if (key === 'c') {
                return {
                  properties: {
                    id: 'citation-1',
                    spanStart: 0,
                    spanEnd: 100,
                    content: 'Test content',
                    confidence: 0.85,
                    metadata: '{}',
                  },
                };
              }
              if (key === 'documentId') return 'doc-1';
              if (key === 'documentTitle') return 'Test Document';
              return null;
            },
          },
        ],
      });

      const citations = await citationManager.getCitationsForEntity('entity-1');

      expect(citations).toHaveLength(1);
      expect(citations[0].documentId).toBe('doc-1');
      expect(citations[0].confidence).toBe(0.85);
    });

    it('should return empty array when no citations found', async () => {
      mockSession.run.mockResolvedValueOnce({ records: [] });

      const citations = await citationManager.getCitationsForEntity('entity-none');

      expect(citations).toHaveLength(0);
    });
  });

  describe('validateCitation', () => {
    it('should validate a valid citation', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: (key: string) => {
              if (key === 'c') {
                return {
                  properties: {
                    spanStart: 0,
                    spanEnd: 25,
                    content: 'This is the cited content',
                    confidence: 0.9,
                  },
                };
              }
              if (key === 'documentContent') {
                return 'This is the cited content in a longer document';
              }
              return null;
            },
          },
        ],
      });

      const validation = await citationManager.validateCitation('citation-1');

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid span bounds', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: (key: string) => {
              if (key === 'c') {
                return {
                  properties: {
                    spanStart: -1,
                    spanEnd: 25,
                    content: 'Content',
                    confidence: 0.9,
                  },
                };
              }
              if (key === 'documentContent') return 'Document content';
              return null;
            },
          },
        ],
      });

      const validation = await citationManager.validateCitation('citation-1');

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should return invalid for non-existent citation', async () => {
      mockSession.run.mockResolvedValueOnce({ records: [] });

      const validation = await citationManager.validateCitation('citation-none');

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Citation not found');
    });
  });

  describe('formatCitationsForAnswer', () => {
    it('should format citations for display', () => {
      const citations = [
        {
          id: 'c1',
          documentId: 'doc-1',
          documentTitle: 'Research Paper',
          spanStart: 0,
          spanEnd: 100,
          content: 'Content',
          confidence: 0.9,
          sourceType: 'document' as const,
        },
        {
          id: 'c2',
          documentId: 'doc-2',
          documentTitle: 'News Article',
          spanStart: 0,
          spanEnd: 50,
          content: 'Content',
          confidence: 0.75,
          sourceType: 'document' as const,
        },
      ];

      const formatted = citationManager.formatCitationsForAnswer(citations);

      expect(formatted).toContain('[1] Research Paper');
      expect(formatted).toContain('[2] News Article');
      expect(formatted).toContain('90%');
      expect(formatted).toContain('75%');
    });

    it('should return empty string for no citations', () => {
      const formatted = citationManager.formatCitationsForAnswer([]);
      expect(formatted).toBe('');
    });
  });

  describe('extractCitationMarkers', () => {
    it('should extract citation markers from text', () => {
      const text = 'This is a fact [1] and another fact [2]. See also [1] again.';
      const markers = citationManager.extractCitationMarkers(text);

      expect(markers).toHaveLength(3);
      expect(markers[0].index).toBe(1);
      expect(markers[1].index).toBe(2);
      expect(markers[2].index).toBe(1);
    });

    it('should return empty array for text without markers', () => {
      const text = 'This is a plain text without any citation markers.';
      const markers = citationManager.extractCitationMarkers(text);

      expect(markers).toHaveLength(0);
    });
  });

  describe('getCitationStats', () => {
    it('should compute citation statistics', async () => {
      const evidenceChunks = [
        {
          id: 'chunk-1',
          content: 'Content 1',
          citations: [
            {
              id: 'c1',
              documentId: 'doc-1',
              spanStart: 0,
              spanEnd: 10,
              content: 'Content',
              confidence: 0.9,
              sourceType: 'document' as const,
            },
          ],
          graphPaths: [],
          relevanceScore: 0.9,
          tenantId: 'tenant-1',
        },
        {
          id: 'chunk-2',
          content: 'Content 2',
          citations: [
            {
              id: 'c2',
              documentId: 'doc-2',
              spanStart: 0,
              spanEnd: 10,
              content: 'Content',
              confidence: 0.8,
              sourceType: 'graph' as const,
            },
          ],
          graphPaths: [],
          relevanceScore: 0.8,
          tenantId: 'tenant-1',
        },
      ];

      const stats = await citationManager.getCitationStats(evidenceChunks);

      expect(stats.totalCitations).toBe(2);
      expect(stats.bySourceType.document).toBe(1);
      expect(stats.bySourceType.graph).toBe(1);
      expect(stats.averageConfidence).toBe(0.85);
      expect(stats.uniqueDocuments).toBe(2);
    });
  });
});
