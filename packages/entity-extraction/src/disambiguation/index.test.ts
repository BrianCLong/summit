import { EntityDisambiguator } from './index';
import type { Entity } from '../types';

describe('EntityDisambiguator', () => {
  let disambiguator: EntityDisambiguator;

  beforeEach(() => {
    disambiguator = new EntityDisambiguator();
  });

  const createEntity = (text: string, type: string, start: number): Entity => ({
    text,
    type: type as Entity['type'],
    start,
    end: start + text.length,
    confidence: 0.9,
  });

  describe('disambiguate', () => {
    it('should group similar entities', () => {
      const entities: Entity[] = [
        createEntity('John Smith', 'PERSON', 0),
        createEntity('John Smith', 'PERSON', 50),
        createEntity('Apple Inc.', 'ORGANIZATION', 100),
      ];

      const clusters = disambiguator.disambiguate(entities, 'Sample text');

      expect(Array.isArray(clusters)).toBe(true);
    });

    it('should return clusters with canonical entity', () => {
      const entities: Entity[] = [
        createEntity('John', 'PERSON', 0),
        createEntity('John Smith', 'PERSON', 50),
      ];

      const clusters = disambiguator.disambiguate(entities, 'Sample text');

      clusters.forEach(cluster => {
        expect(cluster.canonical).toBeDefined();
        expect(cluster.mentions).toBeDefined();
        expect(cluster.confidence).toBeDefined();
      });
    });

    it('should handle empty entities array', () => {
      const clusters = disambiguator.disambiguate([], 'Sample text');
      expect(clusters).toEqual([]);
    });

    it('should include confidence scores', () => {
      const entities: Entity[] = [
        createEntity('John Smith', 'PERSON', 0),
      ];

      const clusters = disambiguator.disambiguate(entities, 'Sample text');

      clusters.forEach(cluster => {
        expect(typeof cluster.confidence).toBe('number');
        expect(cluster.confidence).toBeGreaterThanOrEqual(0);
        expect(cluster.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('resolveAmbiguity', () => {
    it('should resolve ambiguity using context', () => {
      const entity = createEntity('Apple', 'ORGANIZATION', 0);
      const candidates: Entity[] = [
        createEntity('Apple Inc.', 'ORGANIZATION', 0),
        createEntity('Apple Records', 'ORGANIZATION', 0),
      ];

      const resolved = disambiguator.resolveAmbiguity(
        entity,
        'Apple Inc. announced new iPhone',
        candidates
      );

      expect(resolved).toBeDefined();
    });

    it('should return original entity if no candidates', () => {
      const entity = createEntity('Apple', 'ORGANIZATION', 0);

      const resolved = disambiguator.resolveAmbiguity(entity, 'context', []);

      expect(resolved).toEqual(entity);
    });

    it('should return single candidate if only one', () => {
      const entity = createEntity('Apple', 'ORGANIZATION', 0);
      const candidate = createEntity('Apple Inc.', 'ORGANIZATION', 0);

      const resolved = disambiguator.resolveAmbiguity(entity, 'context', [candidate]);

      expect(resolved).toEqual(candidate);
    });
  });
});
