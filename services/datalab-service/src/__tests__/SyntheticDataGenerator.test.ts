import { describe, it, expect, beforeEach } from 'vitest';
import { SyntheticDataGenerator } from '../synthetic/SyntheticDataGenerator.js';
import { SyntheticDataRequest, SyntheticEntitySchema } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

describe('SyntheticDataGenerator', () => {
  let generator: SyntheticDataGenerator;
  const sandboxId = uuidv4();

  beforeEach(() => {
    generator = new SyntheticDataGenerator();
  });

  describe('generate', () => {
    it('should generate entities based on schema', async () => {
      const request: SyntheticDataRequest = {
        sandboxId,
        name: 'Test Generation',
        schemas: [
          {
            entityType: 'Person',
            fields: [
              { name: 'name', type: 'string', generator: 'person.fullName', config: {} },
              { name: 'email', type: 'string', generator: 'internet.email', config: {} },
            ],
            relationshipTypes: [],
          },
        ],
        config: {
          totalEntities: 100,
          generateRelationships: false,
        },
        outputFormat: 'json',
        requestedBy: 'test-user',
      };

      const result = await generator.generate(request);

      expect(result.status).toBe('completed');
      expect(result.statistics.entitiesGenerated).toBe(100);
      expect(result.statistics.byEntityType['Person']).toBe(100);
    });

    it('should generate with seeded randomness for reproducibility', async () => {
      const request: SyntheticDataRequest = {
        sandboxId,
        name: 'Seeded Generation',
        schemas: [
          {
            entityType: 'Person',
            fields: [
              { name: 'name', type: 'string', generator: 'person.firstName', config: {} },
            ],
            relationshipTypes: [],
          },
        ],
        config: {
          totalEntities: 10,
          seed: 12345,
          generateRelationships: false,
        },
        outputFormat: 'json',
        requestedBy: 'test-user',
      };

      const result1 = await generator.generate(request);
      const result2 = await generator.generate(request);

      // Same seed should produce same sample data
      expect(result1.sampleData).toEqual(result2.sampleData);
    });

    it('should generate multiple entity types with distribution', async () => {
      const request: SyntheticDataRequest = {
        sandboxId,
        name: 'Multi-type Generation',
        schemas: [
          {
            entityType: 'Person',
            fields: [{ name: 'name', type: 'string', generator: 'person.fullName', config: {} }],
            relationshipTypes: [],
          },
          {
            entityType: 'Organization',
            fields: [{ name: 'name', type: 'string', generator: 'company.name', config: {} }],
            relationshipTypes: [],
          },
        ],
        config: {
          totalEntities: 100,
          entityDistribution: {
            Person: 70,
            Organization: 30,
          },
          generateRelationships: false,
        },
        outputFormat: 'json',
        requestedBy: 'test-user',
      };

      const result = await generator.generate(request);

      expect(result.statistics.byEntityType['Person']).toBe(70);
      expect(result.statistics.byEntityType['Organization']).toBe(30);
    });

    it('should generate relationships between entities', async () => {
      const request: SyntheticDataRequest = {
        sandboxId,
        name: 'Relationship Generation',
        schemas: [
          {
            entityType: 'Person',
            fields: [{ name: 'name', type: 'string', generator: 'person.fullName', config: {} }],
            relationshipTypes: [
              {
                type: 'KNOWS',
                targetEntityType: 'Person',
                direction: 'both',
                probability: 0.5,
                minCount: 1,
                maxCount: 5,
              },
            ],
          },
        ],
        config: {
          totalEntities: 50,
          generateRelationships: true,
          connectivityDensity: 0.5,
        },
        outputFormat: 'json',
        requestedBy: 'test-user',
      };

      const result = await generator.generate(request);

      expect(result.status).toBe('completed');
      expect(result.statistics.relationshipsGenerated).toBeGreaterThan(0);
    });

    it('should handle nullable fields', async () => {
      const request: SyntheticDataRequest = {
        sandboxId,
        name: 'Nullable Fields',
        schemas: [
          {
            entityType: 'Person',
            fields: [
              { name: 'name', type: 'string', generator: 'person.fullName', config: {} },
              {
                name: 'nickname',
                type: 'string',
                generator: 'person.firstName',
                config: {},
                nullable: true,
                nullProbability: 0.5,
              },
            ],
            relationshipTypes: [],
          },
        ],
        config: {
          totalEntities: 100,
          seed: 42,
          generateRelationships: false,
        },
        outputFormat: 'json',
        requestedBy: 'test-user',
      };

      const result = await generator.generate(request);

      expect(result.status).toBe('completed');
      // Some entities should have null nicknames
    });

    it('should use different generators correctly', async () => {
      const request: SyntheticDataRequest = {
        sandboxId,
        name: 'Generator Test',
        schemas: [
          {
            entityType: 'Record',
            fields: [
              { name: 'uuid', type: 'uuid', generator: 'string.uuid', config: {} },
              { name: 'amount', type: 'number', generator: 'finance.amount', config: {} },
              { name: 'pastDate', type: 'date', generator: 'date.past', config: {} },
              { name: 'flag', type: 'boolean', generator: 'datatype.boolean', config: {} },
              { name: 'city', type: 'string', generator: 'location.city', config: {} },
            ],
            relationshipTypes: [],
          },
        ],
        config: {
          totalEntities: 10,
          generateRelationships: false,
        },
        outputFormat: 'json',
        requestedBy: 'test-user',
      };

      const result = await generator.generate(request);

      expect(result.status).toBe('completed');
      expect(result.sampleData).toBeDefined();
      expect(result.sampleData!.length).toBeGreaterThan(0);

      const sample = result.sampleData![0];
      expect(sample.uuid).toBeDefined();
      expect(sample.amount).toBeDefined();
    });

    it('should return sample data', async () => {
      const request: SyntheticDataRequest = {
        sandboxId,
        name: 'Sample Data Test',
        schemas: [
          {
            entityType: 'Person',
            fields: [{ name: 'name', type: 'string', generator: 'person.fullName', config: {} }],
            relationshipTypes: [],
          },
        ],
        config: {
          totalEntities: 50,
          generateRelationships: false,
        },
        outputFormat: 'json',
        requestedBy: 'test-user',
      };

      const result = await generator.generate(request);

      expect(result.sampleData).toBeDefined();
      expect(result.sampleData!.length).toBeLessThanOrEqual(10);
    });
  });

  describe('registerGenerator', () => {
    it('should allow custom generators', async () => {
      generator.registerGenerator('custom.status', () => {
        const statuses = ['active', 'inactive', 'pending'];
        return statuses[Math.floor(Math.random() * statuses.length)];
      });

      const request: SyntheticDataRequest = {
        sandboxId,
        name: 'Custom Generator Test',
        schemas: [
          {
            entityType: 'Item',
            fields: [
              { name: 'status', type: 'string', generator: 'custom.status', config: {} },
            ],
            relationshipTypes: [],
          },
        ],
        config: {
          totalEntities: 10,
          generateRelationships: false,
        },
        outputFormat: 'json',
        requestedBy: 'test-user',
      };

      const result = await generator.generate(request);

      expect(result.status).toBe('completed');
    });
  });
});
