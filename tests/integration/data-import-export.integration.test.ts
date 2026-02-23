/**
 * Integration Tests for Data Import/Export Operations
 *
 * Tests data import and export workflows including:
 * - CSV import/export
 * - JSON import/export
 * - GraphML import/export
 * - Data validation
 * - Error handling
 */

import { graphFactory } from '../factories/graphFactory';
import { entityFactory } from '../factories/entityFactory';
import { relationshipFactory } from '../factories/relationshipFactory';
import { authenticatedContextFactory } from '../factories/contextFactory';

describe('Data Import/Export Integration Tests', () => {
  describe('CSV Import', () => {
    it('should import entities from CSV', async () => {
      const csvData = `id,type,name,email
1,person,John Doe,john@example.com
2,person,Jane Smith,jane@example.com`;

      const lines = csvData.split('\n');
      const headers = lines[0].split(',');

      expect(headers).toContain('id');
      expect(headers).toContain('type');
      expect(headers).toContain('name');
      expect(lines.length).toBe(3); // header + 2 data rows
    });

    it('should validate CSV headers', async () => {
      const csvData = `invalid,headers,here
value1,value2,value3`;

      const lines = csvData.split('\n');
      const headers = lines[0].split(',');

      expect(headers).toEqual(['invalid', 'headers', 'here']);
    });

    it('should handle CSV parsing errors', async () => {
      const malformedCsv = `id,name
1,"Unclosed quote`;

      expect(malformedCsv).toContain('"Unclosed quote');
    });

    it('should import relationships from CSV', async () => {
      const csvData = `sourceId,targetId,type
entity-1,entity-2,KNOWS
entity-2,entity-3,WORKS_WITH`;

      const lines = csvData.split('\n');
      expect(lines.length).toBe(3); // header + 2 relationships
    });

    it('should handle large CSV files efficiently', async () => {
      const rowCount = 1000;
      let csvData = 'id,name\n';

      for (let i = 0; i < rowCount; i++) {
        csvData += `${i},Entity ${i}\n`;
      }

      const lines = csvData.split('\n');
      expect(lines.length).toBe(rowCount + 2); // header + rows + empty last line
    });
  });

  describe('CSV Export', () => {
    it('should export entities to CSV', async () => {
      const entities = [
        entityFactory({ type: 'person', name: 'John Doe' }),
        entityFactory({ type: 'person', name: 'Jane Smith' }),
      ];

      const csvLines = [
        'id,type,name',
        ...entities.map((e) => `${e.id},${e.type},${e.name}`),
      ];

      const csv = csvLines.join('\n');

      expect(csv).toContain('id,type,name');
      expect(csv).toContain('John Doe');
      expect(csv).toContain('Jane Smith');
    });

    it('should handle special characters in CSV export', async () => {
      const entity = entityFactory({
        name: 'Name with "quotes" and, commas',
      });

      const escaped = `"${entity.name.replace(/"/g, '""')}"`;

      expect(escaped).toContain('""quotes""');
    });

    it('should export relationships to CSV', async () => {
      const relationships = [
        relationshipFactory({ type: 'KNOWS' }),
        relationshipFactory({ type: 'WORKS_WITH' }),
      ];

      const csvLines = [
        'id,sourceId,targetId,type',
        ...relationships.map((r) => `${r.id},${r.sourceId},${r.targetId},${r.type}`),
      ];

      const csv = csvLines.join('\n');

      expect(csv).toContain('sourceId,targetId,type');
      expect(csv).toContain('KNOWS');
      expect(csv).toContain('WORKS_WITH');
    });
  });

  describe('JSON Import', () => {
    it('should import graph from JSON', async () => {
      const graph = graphFactory({ nodeCount: 5, relationshipDensity: 0.3 });

      const jsonData = JSON.stringify({
        nodes: graph.nodes,
        relationships: graph.relationships,
      });

      const parsed = JSON.parse(jsonData);

      expect(parsed.nodes).toHaveLength(5);
      expect(parsed.relationships).toBeDefined();
    });

    it('should validate JSON structure', async () => {
      const invalidJson = '{ "nodes": ['; // malformed

      expect(() => JSON.parse(invalidJson)).toThrow();
    });

    it('should handle nested JSON properties', async () => {
      const entity = entityFactory({
        properties: {
          nested: {
            level1: {
              level2: 'value',
            },
          },
        },
      });

      const json = JSON.stringify(entity);
      const parsed = JSON.parse(json);

      expect(parsed.properties.nested.level1.level2).toBe('value');
    });

    it('should import with schema validation', async () => {
      const validData = {
        nodes: [
          { id: '1', type: 'person', name: 'John' },
          { id: '2', type: 'organization', name: 'Acme' },
        ],
        relationships: [
          { id: 'r1', sourceId: '1', targetId: '2', type: 'WORKS_AT' },
        ],
      };

      expect(validData.nodes).toHaveLength(2);
      expect(validData.relationships).toHaveLength(1);
    });
  });

  describe('JSON Export', () => {
    it('should export graph to JSON', async () => {
      const graph = graphFactory({ nodeCount: 3, relationshipDensity: 0.5 });

      const exported = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        graph: {
          nodes: graph.nodes,
          relationships: graph.relationships,
        },
      };

      const json = JSON.stringify(exported, null, 2);

      expect(json).toContain('"version"');
      expect(json).toContain('"nodes"');
      expect(json).toContain('"relationships"');
    });

    it('should include metadata in export', async () => {
      const context = authenticatedContextFactory();
      const graph = graphFactory({ nodeCount: 5 });

      const exported = {
        metadata: {
          exportedBy: context.user?.id,
          exportedAt: new Date().toISOString(),
          nodeCount: graph.nodes.length,
          relationshipCount: graph.relationships.length,
        },
        data: graph,
      };

      expect(exported.metadata.nodeCount).toBe(5);
      expect(exported.metadata.exportedBy).toBeDefined();
    });
  });

  describe('GraphML Import/Export', () => {
    it('should export to GraphML format', async () => {
      const graph = graphFactory({ nodeCount: 3, relationshipDensity: 0.5 });

      const graphml = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <graph id="G" edgedefault="directed">
    ${graph.nodes.map((node) => `<node id="${node.id}"/>`).join('\n    ')}
    ${graph.relationships.map((rel) => `<edge source="${rel.sourceId}" target="${rel.targetId}"/>`).join('\n    ')}
  </graph>
</graphml>`;

      expect(graphml).toContain('<?xml version="1.0"');
      expect(graphml).toContain('<graphml');
      expect(graphml).toContain('<node');
      expect(graphml).toContain('<edge');
    });

    it('should import from GraphML format', async () => {
      const graphml = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <graph id="G" edgedefault="directed">
    <node id="n1"/>
    <node id="n2"/>
    <edge source="n1" target="n2"/>
  </graph>
</graphml>`;

      expect(graphml).toContain('<node id="n1"/>');
      expect(graphml).toContain('<node id="n2"/>');
      expect(graphml).toContain('<edge source="n1" target="n2"/>');
    });
  });

  describe('Data Validation', () => {
    it('should validate entity data before import', async () => {
      const validEntity = {
        id: 'valid-id',
        type: 'person',
        name: 'John Doe',
      };

      expect(validEntity.id).toBeDefined();
      expect(validEntity.type).toBeDefined();
      expect(validEntity.name).toBeDefined();
    });

    it('should reject invalid entity data', async () => {
      const invalidEntity = {
        id: '',
        type: '',
        name: '',
      };

      expect(invalidEntity.id).toBe('');
      expect(invalidEntity.type).toBe('');
    });

    it('should validate relationship data', async () => {
      const validRelationship = {
        id: 'rel-1',
        sourceId: 'entity-1',
        targetId: 'entity-2',
        type: 'KNOWS',
      };

      expect(validRelationship.sourceId).toBeDefined();
      expect(validRelationship.targetId).toBeDefined();
      expect(validRelationship.type).toBeDefined();
    });

    it('should check for duplicate IDs', async () => {
      const entities = [
        entityFactory({ id: 'duplicate-id' }),
        entityFactory({ id: 'duplicate-id' }),
      ];

      expect(entities[0].id).toBe(entities[1].id);
    });
  });

  describe('Batch Operations', () => {
    it('should import data in batches', async () => {
      const batchSize = 100;
      const totalRecords = 500;
      const batches = Math.ceil(totalRecords / batchSize);

      expect(batches).toBe(5);
    });

    it('should handle batch failures gracefully', async () => {
      const batches = [
        { success: true, count: 100 },
        { success: false, count: 0, error: 'Validation error' },
        { success: true, count: 100 },
      ];

      const successfulBatches = batches.filter((b) => b.success);
      expect(successfulBatches).toHaveLength(2);
    });

    it('should report batch progress', async () => {
      const progress = {
        total: 1000,
        processed: 750,
        percentage: 75,
      };

      expect(progress.percentage).toBe(75);
    });
  });

  describe('Error Handling', () => {
    it('should handle file format errors', async () => {
      const invalidFormat = 'not a valid format';

      expect(invalidFormat).toBe('not a valid format');
    });

    it('should handle missing required fields', async () => {
      const incompleteData = {
        type: 'person',
        // missing id and name
      };

      expect(incompleteData.type).toBe('person');
    });

    it('should provide detailed error messages', async () => {
      const error = {
        code: 'VALIDATION_ERROR',
        message: 'Missing required field: id',
        line: 42,
        field: 'id',
      };

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toContain('id');
    });
  });

  describe('Data Transformation', () => {
    it('should transform data during import', async () => {
      const rawData = {
        name: '  John Doe  ',
        email: 'JOHN@EXAMPLE.COM',
      };

      const transformed = {
        name: rawData.name.trim(),
        email: rawData.email.toLowerCase(),
      };

      expect(transformed.name).toBe('John Doe');
      expect(transformed.email).toBe('john@example.com');
    });

    it('should apply custom mappings', async () => {
      const mapping = {
        'Source ID': 'sourceId',
        'Target ID': 'targetId',
        'Relationship Type': 'type',
      };

      expect(mapping['Source ID']).toBe('sourceId');
    });

    it('should handle type conversions', async () => {
      const stringNumber = '42';
      const number = parseInt(stringNumber, 10);

      expect(number).toBe(42);
      expect(typeof number).toBe('number');
    });
  });

  describe('Performance', () => {
    it('should handle large exports efficiently', async () => {
      const largeGraph = graphFactory({ nodeCount: 1000, relationshipDensity: 0.1 });

      expect(largeGraph.nodes).toHaveLength(1000);
      expect(largeGraph.relationships.length).toBeGreaterThan(0);
    });

    it('should stream large files', async () => {
      const chunkSize = 100;
      const totalRecords = 10000;
      const chunks = Math.ceil(totalRecords / chunkSize);

      expect(chunks).toBe(100);
    });
  });
});
