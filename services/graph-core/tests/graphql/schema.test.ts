/**
 * Contract Tests for GraphQL Schema
 *
 * Tests:
 * - Schema structure validation
 * - Required types and fields
 * - Query and mutation signatures
 * - Example queries
 */

import { buildSchema, parse, validate } from 'graphql';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the schema
const schemaPath = join(__dirname, '../../src/graphql/schema.graphql');
const schemaString = readFileSync(schemaPath, 'utf-8');
const schema = buildSchema(schemaString);

describe('GraphQL Schema Contract', () => {
  // ==========================================================================
  // SCHEMA STRUCTURE
  // ==========================================================================

  describe('Schema Structure', () => {
    it('should have Query type', () => {
      const queryType = schema.getQueryType();
      expect(queryType).toBeDefined();
      expect(queryType?.name).toBe('Query');
    });

    it('should have Mutation type', () => {
      const mutationType = schema.getMutationType();
      expect(mutationType).toBeDefined();
      expect(mutationType?.name).toBe('Mutation');
    });

    it('should have Entity type', () => {
      const entityType = schema.getType('Entity');
      expect(entityType).toBeDefined();
    });

    it('should have Relationship type', () => {
      const relType = schema.getType('Relationship');
      expect(relType).toBeDefined();
    });

    it('should have PolicyLabels type', () => {
      const policyType = schema.getType('PolicyLabels');
      expect(policyType).toBeDefined();
    });

    it('should have ProvenanceChain type', () => {
      const provType = schema.getType('ProvenanceChain');
      expect(provType).toBeDefined();
    });
  });

  // ==========================================================================
  // ENTITY TYPE ENUM
  // ==========================================================================

  describe('EntityType Enum', () => {
    it('should have all 22 entity types', () => {
      const entityTypeEnum = schema.getType('EntityType');
      expect(entityTypeEnum).toBeDefined();

      const expectedTypes = [
        'Person',
        'Organization',
        'Asset',
        'Account',
        'Location',
        'Event',
        'Document',
        'Communication',
        'Device',
        'Vehicle',
        'Infrastructure',
        'FinancialInstrument',
        'Indicator',
        'Claim',
        'Case',
        'Narrative',
        'Campaign',
        'InfrastructureService',
        'Sensor',
        'Runbook',
        'Authority',
        'License',
      ];

      // Verify the enum exists and has the expected values
      if (entityTypeEnum && 'getValues' in entityTypeEnum) {
        const values = (entityTypeEnum as any).getValues().map((v: any) => v.name);
        for (const expectedType of expectedTypes) {
          expect(values).toContain(expectedType);
        }
      }
    });
  });

  // ==========================================================================
  // RELATIONSHIP TYPE ENUM
  // ==========================================================================

  describe('RelationshipType Enum', () => {
    it('should have all 30 relationship types', () => {
      const relTypeEnum = schema.getType('RelationshipType');
      expect(relTypeEnum).toBeDefined();

      const expectedTypes = [
        // Structure
        'CONNECTED_TO',
        'OWNS',
        'WORKS_FOR',
        'LOCATED_AT',
        'MEMBER_OF',
        'MANAGES',
        'REPORTS_TO',
        // Network
        'COMMUNICATES_WITH',
        'TRANSACTED_WITH',
        'SIMILAR_TO',
        'RELATED_TO',
        // Hierarchy
        'SUBSIDIARY_OF',
        'PARTNER_OF',
        'COMPETITOR_OF',
        // Actions
        'ACCESSED',
        'CREATED',
        'MODIFIED',
        'MENTIONS',
        // Evidence
        'SUPPORTS',
        'CONTRADICTS',
        'DERIVED_FROM',
        'CITES',
        // Authority
        'AUTHORIZED_BY',
        'GOVERNED_BY',
        'REQUIRES',
        // Temporal
        'PRECEDES',
        'FOLLOWS',
        'CONCURRENT_WITH',
        // Hypothesis
        'EXPLAINS',
        'ALTERNATIVE_TO',
        'REFUTES',
      ];

      if (relTypeEnum && 'getValues' in relTypeEnum) {
        const values = (relTypeEnum as any).getValues().map((v: any) => v.name);
        for (const expectedType of expectedTypes) {
          expect(values).toContain(expectedType);
        }
      }
    });
  });

  // ==========================================================================
  // POLICY LABELS
  // ==========================================================================

  describe('PolicyLabels Type', () => {
    it('should have all 7 mandatory fields', () => {
      const policyType = schema.getType('PolicyLabels');
      expect(policyType).toBeDefined();

      if (policyType && 'getFields' in policyType) {
        const fields = (policyType as any).getFields();
        expect(fields).toHaveProperty('origin');
        expect(fields).toHaveProperty('sensitivity');
        expect(fields).toHaveProperty('clearance');
        expect(fields).toHaveProperty('legalBasis');
        expect(fields).toHaveProperty('needToKnow');
        expect(fields).toHaveProperty('purposeLimitation');
        expect(fields).toHaveProperty('retentionClass');
      }
    });
  });

  // ==========================================================================
  // QUERY OPERATIONS
  // ==========================================================================

  describe('Query Operations', () => {
    it('should have entity query', () => {
      const queryType = schema.getQueryType();
      if (queryType && 'getFields' in queryType) {
        const fields = queryType.getFields();
        expect(fields).toHaveProperty('entity');
      }
    });

    it('should have entityAt query for temporal lookup', () => {
      const queryType = schema.getQueryType();
      if (queryType && 'getFields' in queryType) {
        const fields = queryType.getFields();
        expect(fields).toHaveProperty('entityAt');
      }
    });

    it('should have entities list query', () => {
      const queryType = schema.getQueryType();
      if (queryType && 'getFields' in queryType) {
        const fields = queryType.getFields();
        expect(fields).toHaveProperty('entities');
      }
    });

    it('should have neighborhood query', () => {
      const queryType = schema.getQueryType();
      if (queryType && 'getFields' in queryType) {
        const fields = queryType.getFields();
        expect(fields).toHaveProperty('neighborhood');
      }
    });

    it('should have snapshot query', () => {
      const queryType = schema.getQueryType();
      if (queryType && 'getFields' in queryType) {
        const fields = queryType.getFields();
        expect(fields).toHaveProperty('snapshot');
      }
    });
  });

  // ==========================================================================
  // MUTATION OPERATIONS
  // ==========================================================================

  describe('Mutation Operations', () => {
    it('should have upsertEntity mutation', () => {
      const mutationType = schema.getMutationType();
      if (mutationType && 'getFields' in mutationType) {
        const fields = mutationType.getFields();
        expect(fields).toHaveProperty('upsertEntity');
      }
    });

    it('should have upsertRelationship mutation', () => {
      const mutationType = schema.getMutationType();
      if (mutationType && 'getFields' in mutationType) {
        const fields = mutationType.getFields();
        expect(fields).toHaveProperty('upsertRelationship');
      }
    });

    it('should have deleteEntity mutation', () => {
      const mutationType = schema.getMutationType();
      if (mutationType && 'getFields' in mutationType) {
        const fields = mutationType.getFields();
        expect(fields).toHaveProperty('deleteEntity');
      }
    });

    it('should have updateEntityPolicyLabels mutation', () => {
      const mutationType = schema.getMutationType();
      if (mutationType && 'getFields' in mutationType) {
        const fields = mutationType.getFields();
        expect(fields).toHaveProperty('updateEntityPolicyLabels');
      }
    });
  });

  // ==========================================================================
  // EXAMPLE QUERIES - VALIDATION
  // ==========================================================================

  describe('Example Query Validation', () => {
    it('should validate entity query', () => {
      const query = parse(`
        query GetEntity($id: UUID!) {
          entity(id: $id) {
            id
            entityType
            label
            confidence
            policyLabels {
              origin
              sensitivity
              clearance
              legalBasis
              needToKnow
              purposeLimitation
              retentionClass
            }
            validFrom
            validTo
            recordedAt
          }
        }
      `);

      const errors = validate(schema, query);
      expect(errors).toHaveLength(0);
    });

    it('should validate entityAt temporal query', () => {
      const query = parse(`
        query GetEntityAt($id: UUID!, $asOf: DateTime!) {
          entityAt(id: $id, asOf: $asOf) {
            id
            label
            validFrom
            validTo
            observedAt
            recordedAt
            version
          }
        }
      `);

      const errors = validate(schema, query);
      expect(errors).toHaveLength(0);
    });

    it('should validate entities list query with filters', () => {
      const query = parse(`
        query ListEntities($filter: EntityFilterInput, $pagination: PaginationInput) {
          entities(filter: $filter, pagination: $pagination) {
            nodes {
              id
              entityType
              label
            }
            totalCount
            hasMore
          }
        }
      `);

      const errors = validate(schema, query);
      expect(errors).toHaveLength(0);
    });

    it('should validate neighborhood query', () => {
      const query = parse(`
        query GetNeighborhood($query: NeighborhoodQueryInput!) {
          neighborhood(query: $query) {
            center {
              id
              label
            }
            entitiesByDepth {
              id
              label
              entityType
            }
            relationships {
              id
              type
              fromEntityId
              toEntityId
            }
            totalEntities
            totalRelationships
            truncated
            cost {
              estimatedNodes
              estimatedEdges
              exceedsLimit
            }
          }
        }
      `);

      const errors = validate(schema, query);
      expect(errors).toHaveLength(0);
    });

    it('should validate snapshot query', () => {
      const query = parse(`
        query GetSnapshot($asOf: DateTime!) {
          snapshot(asOf: $asOf) {
            asOf
            entities {
              id
              label
              entityType
            }
            relationships {
              id
              type
            }
          }
        }
      `);

      const errors = validate(schema, query);
      expect(errors).toHaveLength(0);
    });

    it('should validate upsertEntity mutation', () => {
      const mutation = parse(`
        mutation UpsertEntity($input: EntityInput!) {
          upsertEntity(input: $input) {
            id
            entityType
            label
            confidence
            version
            createdAt
            updatedAt
          }
        }
      `);

      const errors = validate(schema, mutation);
      expect(errors).toHaveLength(0);
    });

    it('should validate upsertRelationship mutation', () => {
      const mutation = parse(`
        mutation UpsertRelationship($input: RelationshipInput!) {
          upsertRelationship(input: $input) {
            id
            type
            fromEntityId
            toEntityId
            confidence
            version
          }
        }
      `);

      const errors = validate(schema, mutation);
      expect(errors).toHaveLength(0);
    });

    it('should validate entity navigation fields', () => {
      const query = parse(`
        query EntityWithRelationships($id: UUID!) {
          entity(id: $id) {
            id
            label
            outgoingRelationships(types: [OWNS, WORKS_FOR], limit: 10) {
              id
              type
              toEntity {
                id
                label
              }
            }
            incomingRelationships {
              id
              type
              fromEntity {
                id
                label
              }
            }
          }
        }
      `);

      const errors = validate(schema, query);
      expect(errors).toHaveLength(0);
    });
  });

  // ==========================================================================
  // INPUT TYPE VALIDATION
  // ==========================================================================

  describe('Input Types', () => {
    it('should have EntityInput type', () => {
      const inputType = schema.getType('EntityInput');
      expect(inputType).toBeDefined();
    });

    it('should have RelationshipInput type', () => {
      const inputType = schema.getType('RelationshipInput');
      expect(inputType).toBeDefined();
    });

    it('should have PolicyLabelsInput type', () => {
      const inputType = schema.getType('PolicyLabelsInput');
      expect(inputType).toBeDefined();
    });

    it('should have TemporalQueryInput type', () => {
      const inputType = schema.getType('TemporalQueryInput');
      expect(inputType).toBeDefined();
    });

    it('should have PaginationInput type', () => {
      const inputType = schema.getType('PaginationInput');
      expect(inputType).toBeDefined();
    });

    it('should have NeighborhoodQueryInput type', () => {
      const inputType = schema.getType('NeighborhoodQueryInput');
      expect(inputType).toBeDefined();
    });
  });

  // ==========================================================================
  // RESULT TYPES
  // ==========================================================================

  describe('Result Types', () => {
    it('should have EntityConnection type', () => {
      const resultType = schema.getType('EntityConnection');
      expect(resultType).toBeDefined();
    });

    it('should have NeighborhoodResult type', () => {
      const resultType = schema.getType('NeighborhoodResult');
      expect(resultType).toBeDefined();
    });

    it('should have TimeSnapshot type', () => {
      const resultType = schema.getType('TimeSnapshot');
      expect(resultType).toBeDefined();
    });

    it('should have QueryCost type', () => {
      const resultType = schema.getType('QueryCost');
      expect(resultType).toBeDefined();
    });
  });

  // ==========================================================================
  // SCALARS
  // ==========================================================================

  describe('Custom Scalars', () => {
    it('should have DateTime scalar', () => {
      const scalar = schema.getType('DateTime');
      expect(scalar).toBeDefined();
    });

    it('should have JSON scalar', () => {
      const scalar = schema.getType('JSON');
      expect(scalar).toBeDefined();
    });

    it('should have UUID scalar', () => {
      const scalar = schema.getType('UUID');
      expect(scalar).toBeDefined();
    });
  });
});
