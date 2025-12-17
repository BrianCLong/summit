/**
 * Tests for RelationshipExtractor
 */

import { RelationshipExtractor } from '../src/extraction/RelationshipExtractor';

describe('RelationshipExtractor', () => {
  let extractor: RelationshipExtractor;
  let mockDriver: any;
  let mockSession: any;

  beforeEach(() => {
    mockSession = {
      run: jest.fn().mockResolvedValue({ records: [] }),
      close: jest.fn().mockResolvedValue(undefined),
    };

    mockDriver = {
      session: jest.fn().mockReturnValue(mockSession),
    };

    extractor = new RelationshipExtractor(mockDriver);
  });

  describe('extractSemanticRelations', () => {
    it('should extract causal relations from text', async () => {
      const text = 'Rain causes flooding in the city';
      const relations = await extractor.extractSemanticRelations(text, 'doc-1');

      expect(relations.length).toBeGreaterThan(0);
      expect(relations[0].type).toBe('cause');
    });
  });

  describe('extractEvents', () => {
    it('should extract meeting events from text', async () => {
      const text = 'John met with Sarah yesterday';
      const events = await extractor.extractEvents(text, 'doc-1');

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('meeting');
      expect(events[0].participants.length).toBe(2);
    });
  });

  describe('detectCausalRelationships', () => {
    it('should create a causal relationship', async () => {
      const relationship = await extractor.detectCausalRelationships(
        'entity1',
        'entity2',
        ['evidence1', 'evidence2']
      );

      expect(relationship.causeEntityId).toBe('entity1');
      expect(relationship.effectEntityId).toBe('entity2');
      expect(relationship.evidence.length).toBe(2);
    });
  });
});
