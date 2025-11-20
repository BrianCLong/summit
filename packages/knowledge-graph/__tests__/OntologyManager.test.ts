/**
 * Tests for OntologyManager
 */

import { OntologyManager, STANDARD_NAMESPACES } from '../src/ontology/OntologyManager';

describe('OntologyManager', () => {
  let ontologyManager: OntologyManager;
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

    ontologyManager = new OntologyManager(mockDriver);
  });

  describe('createOntology', () => {
    it('should create an ontology with entity and relationship types', async () => {
      const ontology = {
        name: 'Test Ontology',
        version: '1.0',
        namespace: 'http://test.example.com/',
        entityTypes: [],
        relationshipTypes: [],
        imports: [],
      };

      const result = await ontologyManager.createOntology(ontology);

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Test Ontology');
      expect(result.version).toBe('1.0');
      expect(mockSession.run).toHaveBeenCalled();
    });
  });

  describe('importStandardOntology', () => {
    it('should import FOAF ontology', async () => {
      const foaf = await ontologyManager.importStandardOntology('FOAF');

      expect(foaf.name).toBe('Friend of a Friend (FOAF)');
      expect(foaf.namespace).toBe(STANDARD_NAMESPACES.FOAF);
      expect(foaf.entityTypes.length).toBeGreaterThan(0);
    });

    it('should import Schema.org ontology', async () => {
      const schemaOrg = await ontologyManager.importStandardOntology('SCHEMA_ORG');

      expect(schemaOrg.name).toBe('Schema.org');
      expect(schemaOrg.namespace).toBe(STANDARD_NAMESPACES.SCHEMA_ORG);
    });
  });

  describe('validateEntity', () => {
    it('should validate entity properties against entity type', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: () => ({
              properties: {
                properties: JSON.stringify([
                  { name: 'name', type: 'string', required: true },
                  { name: 'age', type: 'number', required: false },
                ]),
              },
            }),
          },
        ],
      });

      const result = await ontologyManager.validateEntity('entity-type-id', {
        name: 'John',
        age: 30,
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required properties', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: () => ({
              properties: {
                properties: JSON.stringify([
                  { name: 'name', type: 'string', required: true },
                ]),
              },
            }),
          },
        ],
      });

      const result = await ontologyManager.validateEntity('entity-type-id', {});

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
