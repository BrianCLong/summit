/**
 * Tests for ScenarioGenerator
 */

import { ScenarioGenerator, getBuiltInTemplates } from '../generator/ScenarioGenerator';

describe('ScenarioGenerator', () => {
  describe('Built-in templates', () => {
    it('should have fraud-ring template', () => {
      const templates = getBuiltInTemplates();
      const fraudRing = templates.find((t) => t.name === 'fraud-ring');

      expect(fraudRing).toBeDefined();
      expect(fraudRing?.type).toBe('financial-crime');
    });

    it('should have terror-cell template', () => {
      const templates = getBuiltInTemplates();
      const terrorCell = templates.find((t) => t.name === 'terror-cell');

      expect(terrorCell).toBeDefined();
      expect(terrorCell?.type).toBe('security-threat');
    });
  });

  describe('Generation', () => {
    it('should generate deterministic scenario with fixed seed', async () => {
      const generator1 = new ScenarioGenerator({
        template: 'fraud-ring',
        params: { seed: 42 },
      });

      const generator2 = new ScenarioGenerator({
        template: 'fraud-ring',
        params: { seed: 42 },
      });

      const scenario1 = await generator1.generate();
      const scenario2 = await generator2.generate();

      expect(scenario1.entities.length).toBe(scenario2.entities.length);
      expect(scenario1.relationships.length).toBe(scenario2.relationships.length);
      expect(scenario1.entities[0].name).toBe(scenario2.entities[0].name);
    });

    it('should generate scenario with correct entity count', async () => {
      const generator = new ScenarioGenerator({
        template: 'fraud-ring',
        params: { seed: 42 },
      });

      const scenario = await generator.generate();

      // fraud-ring has 20 PERSON + 20 ORGANIZATION + 10 LOCATION = 50 total
      expect(scenario.entities.length).toBe(50);
    });

    it('should generate relationships with valid indices', async () => {
      const generator = new ScenarioGenerator({
        template: 'fraud-ring',
        params: { seed: 42 },
      });

      const scenario = await generator.generate();

      for (const rel of scenario.relationships) {
        const fromIdx = typeof rel.from === 'number' ? rel.from : -1;
        const toIdx = typeof rel.to === 'number' ? rel.to : -1;

        expect(fromIdx).toBeGreaterThanOrEqual(0);
        expect(fromIdx).toBeLessThan(scenario.entities.length);
        expect(toIdx).toBeGreaterThanOrEqual(0);
        expect(toIdx).toBeLessThan(scenario.entities.length);
      }
    });

    it('should generate expected outcomes', async () => {
      const generator = new ScenarioGenerator({
        template: 'fraud-ring',
        params: { seed: 42 },
      });

      const scenario = await generator.generate();

      expect(scenario.expectedOutcomes).toBeDefined();
      expect(scenario.expectedOutcomes.minEntitiesFound).toBeGreaterThan(0);
      expect(scenario.expectedOutcomes.minRelationshipsFound).toBeGreaterThan(0);
    });

    it('should respect custom params', async () => {
      const generator = new ScenarioGenerator({
        template: 'fraud-ring',
        params: {
          seed: 42,
          nodeCount: 20,
        },
      });

      const scenario = await generator.generate();

      // Note: nodeCount is a hint, actual count depends on template structure
      expect(scenario.entities.length).toBeGreaterThan(0);
    });
  });

  describe('Safety', () => {
    it('should reject oversized scenarios', async () => {
      const largeTemplate = {
        name: 'too-large',
        type: 'test',
        params: { seed: 42 },
        entities: [
          {
            type: 'PERSON',
            distribution: { count: 20000 }, // Way too large
          },
        ],
        relationships: [],
      };

      const generator = new ScenarioGenerator({
        template: largeTemplate,
      });

      await expect(generator.generate()).rejects.toThrow(/exceeds maximum/);
    });
  });
});
