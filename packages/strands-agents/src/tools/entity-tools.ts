/**
 * @fileoverview Entity management tools for Strands Agents
 * Provides CRUD operations for entities with validation and provenance
 * @module @intelgraph/strands-agents/tools/entity-tools
 */

import { z } from 'zod';
import type { Driver, Session } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';
import { EntitySchema, EntityTypeSchema, type Entity } from '../types.js';

// ============================================================================
// Tool Input Schemas
// ============================================================================

export const SearchEntitiesInputSchema = z.object({
  query: z.string().min(1).describe('Search query (supports fuzzy matching)'),
  entityTypes: z.array(EntityTypeSchema).optional().describe('Filter by entity types'),
  minConfidence: z.number().min(0).max(1).optional().describe('Minimum confidence threshold'),
  limit: z.number().min(1).max(100).default(20),
  includeRelationships: z.boolean().default(false).describe('Include connected entities'),
});

export const GetEntityInputSchema = z.object({
  entityId: z.string().uuid().describe('Entity UUID'),
  includeRelationships: z.boolean().default(true),
  relationshipDepth: z.number().min(0).max(2).default(1),
});

export const CreateEntityInputSchema = z.object({
  type: EntityTypeSchema.describe('Entity type'),
  label: z.string().min(1).max(500).describe('Display name/label'),
  properties: z.record(z.unknown()).optional().describe('Additional properties'),
  confidence: z.number().min(0).max(1).default(1.0),
  source: z.string().optional().describe('Source of this entity'),
  investigationId: z.string().uuid().optional().describe('Link to investigation'),
});

export const UpdateEntityInputSchema = z.object({
  entityId: z.string().uuid(),
  updates: z.object({
    label: z.string().min(1).max(500).optional(),
    properties: z.record(z.unknown()).optional(),
    confidence: z.number().min(0).max(1).optional(),
  }),
  reason: z.string().optional().describe('Reason for update (audit trail)'),
});

export const MergeEntitiesInputSchema = z.object({
  primaryEntityId: z.string().uuid().describe('Entity to keep'),
  secondaryEntityIds: z.array(z.string().uuid()).min(1).describe('Entities to merge into primary'),
  mergeStrategy: z.enum(['keep_primary', 'combine_properties', 'highest_confidence']).default('combine_properties'),
  reason: z.string().describe('Justification for merge'),
});

export const FindSimilarEntitiesInputSchema = z.object({
  entityId: z.string().uuid().describe('Reference entity'),
  similarityThreshold: z.number().min(0).max(1).default(0.8),
  limit: z.number().min(1).max(50).default(10),
  algorithm: z.enum(['jaccard', 'cosine', 'levenshtein']).default('jaccard'),
});

export const ResolveEntityInputSchema = z.object({
  label: z.string().min(1).describe('Entity name to resolve'),
  type: EntityTypeSchema.optional(),
  context: z.string().optional().describe('Additional context for disambiguation'),
  createIfNotFound: z.boolean().default(false),
});

// ============================================================================
// Entity Tools Factory
// ============================================================================

export interface EntityToolsConfig {
  driver: Driver;
  database?: string;
  auditLog?: (action: string, details: Record<string, unknown>) => void;
  userId?: string;
}

/**
 * Creates entity management tools for Strands Agents
 */
export function createEntityTools(config: EntityToolsConfig) {
  const { driver, database = 'neo4j', auditLog, userId = 'agent' } = config;

  const logAudit = (action: string, details: Record<string, unknown>) => {
    if (auditLog) {
      auditLog(action, { ...details, userId, timestamp: new Date().toISOString() });
    }
  };

  // ---------------------------------------------------------------------------
  // Search Entities Tool
  // ---------------------------------------------------------------------------
  const searchEntities = {
    name: 'search_entities',
    description: `Search for entities in the knowledge graph by name or properties.
Supports fuzzy matching and filtering by type and confidence.
Use this to find entities before creating duplicates.`,
    inputSchema: SearchEntitiesInputSchema,
    callback: async (input: z.infer<typeof SearchEntitiesInputSchema>): Promise<string> => {
      const startTime = Date.now();
      const { query, entityTypes, minConfidence, limit, includeRelationships } = input;

      let session: Session | null = null;
      try {
        session = driver.session({ database, defaultAccessMode: 'READ' });

        const typeFilter = entityTypes?.length
          ? `AND e.type IN $entityTypes`
          : '';
        const confidenceFilter = minConfidence !== undefined
          ? `AND e.confidence >= $minConfidence`
          : '';

        const cypherQuery = `
          CALL db.index.fulltext.queryNodes('entity_search', $query)
          YIELD node as e, score
          WHERE true ${typeFilter} ${confidenceFilter}
          WITH e, score
          ORDER BY score DESC, e.confidence DESC
          LIMIT $limit
          ${includeRelationships ? `
          OPTIONAL MATCH (e)-[r]-(related:Entity)
          WITH e, score, collect(DISTINCT {
            relationship: type(r),
            entity: related { .id, .type, .label }
          })[0..5] as connections
          ` : 'WITH e, score, [] as connections'}
          RETURN e { .*, score: score, connections: connections } as entity
        `;

        const result = await session.run(cypherQuery, {
          query: `${query}~`, // Fuzzy match
          entityTypes,
          minConfidence,
          limit,
        });

        const entities = result.records.map((r) => r.get('entity'));
        const executionTimeMs = Date.now() - startTime;

        logAudit('entity_search', { query, resultCount: entities.length });

        return JSON.stringify({
          success: true,
          data: {
            query,
            entities,
            metadata: {
              count: entities.length,
              executionTimeMs,
            },
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({
          success: false,
          error: `Entity search failed: ${errorMessage}`,
        });
      } finally {
        if (session) {
          await session.close();
        }
      }
    },
  };

  // ---------------------------------------------------------------------------
  // Get Entity Tool
  // ---------------------------------------------------------------------------
  const getEntity = {
    name: 'get_entity',
    description: `Retrieve detailed information about a specific entity by ID.
Optionally includes connected entities and relationships.`,
    inputSchema: GetEntityInputSchema,
    callback: async (input: z.infer<typeof GetEntityInputSchema>): Promise<string> => {
      const startTime = Date.now();
      const { entityId, includeRelationships, relationshipDepth } = input;

      let session: Session | null = null;
      try {
        session = driver.session({ database, defaultAccessMode: 'READ' });

        let query: string;
        if (includeRelationships && relationshipDepth > 0) {
          query = `
            MATCH (e:Entity {id: $entityId})
            OPTIONAL MATCH (e)-[r*1..${relationshipDepth}]-(related:Entity)
            WITH e, collect(DISTINCT related { .id, .type, .label, .confidence }) as relatedEntities
            OPTIONAL MATCH (e)-[r]-()
            WITH e, relatedEntities, collect(DISTINCT {
              type: type(r),
              direction: CASE WHEN startNode(r) = e THEN 'OUT' ELSE 'IN' END,
              targetId: CASE WHEN startNode(r) = e THEN endNode(r).id ELSE startNode(r).id END,
              properties: properties(r)
            }) as relationships
            RETURN e { .* } as entity, relatedEntities, relationships
          `;
        } else {
          query = `
            MATCH (e:Entity {id: $entityId})
            RETURN e { .* } as entity, [] as relatedEntities, [] as relationships
          `;
        }

        const result = await session.run(query, { entityId });

        if (result.records.length === 0) {
          return JSON.stringify({
            success: false,
            error: `Entity not found: ${entityId}`,
          });
        }

        const record = result.records[0];
        const executionTimeMs = Date.now() - startTime;

        return JSON.stringify({
          success: true,
          data: {
            entity: record.get('entity'),
            relatedEntities: record.get('relatedEntities'),
            relationships: record.get('relationships'),
            metadata: { executionTimeMs },
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({
          success: false,
          error: `Failed to get entity: ${errorMessage}`,
        });
      } finally {
        if (session) {
          await session.close();
        }
      }
    },
  };

  // ---------------------------------------------------------------------------
  // Create Entity Tool
  // ---------------------------------------------------------------------------
  const createEntity = {
    name: 'create_entity',
    description: `Create a new entity in the knowledge graph.
IMPORTANT: Always search for existing entities first to avoid duplicates.
This operation requires SUPERVISED approval in most configurations.`,
    inputSchema: CreateEntityInputSchema,
    callback: async (input: z.infer<typeof CreateEntityInputSchema>): Promise<string> => {
      const startTime = Date.now();
      const { type, label, properties = {}, confidence, source, investigationId } = input;

      let session: Session | null = null;
      try {
        session = driver.session({ database, defaultAccessMode: 'WRITE' });

        const entityId = uuidv4();
        const now = new Date().toISOString();

        const query = `
          CREATE (e:Entity {
            id: $entityId,
            type: $type,
            label: $label,
            confidence: $confidence,
            source: $source,
            createdAt: $createdAt,
            updatedAt: $createdAt,
            createdBy: $createdBy
          })
          SET e += $properties
          ${investigationId ? `
          WITH e
          MATCH (i:Investigation {id: $investigationId})
          CREATE (i)-[:CONTAINS]->(e)
          ` : ''}
          RETURN e { .* } as entity
        `;

        const result = await session.run(query, {
          entityId,
          type,
          label,
          confidence,
          source: source || 'agent',
          properties,
          createdAt: now,
          createdBy: userId,
          investigationId,
        });

        const entity = result.records[0]?.get('entity');
        const executionTimeMs = Date.now() - startTime;

        logAudit('entity_created', { entityId, type, label });

        return JSON.stringify({
          success: true,
          data: {
            entity,
            metadata: { executionTimeMs },
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({
          success: false,
          error: `Failed to create entity: ${errorMessage}`,
        });
      } finally {
        if (session) {
          await session.close();
        }
      }
    },
  };

  // ---------------------------------------------------------------------------
  // Find Similar Entities Tool
  // ---------------------------------------------------------------------------
  const findSimilarEntities = {
    name: 'find_similar_entities',
    description: `Find entities similar to a given entity for potential deduplication.
Uses graph structure and property similarity to identify candidates.
Essential for entity resolution workflows.`,
    inputSchema: FindSimilarEntitiesInputSchema,
    callback: async (input: z.infer<typeof FindSimilarEntitiesInputSchema>): Promise<string> => {
      const startTime = Date.now();
      const { entityId, similarityThreshold, limit, algorithm } = input;

      let session: Session | null = null;
      try {
        session = driver.session({ database, defaultAccessMode: 'READ' });

        // Get reference entity first
        const refResult = await session.run(
          'MATCH (e:Entity {id: $entityId}) RETURN e',
          { entityId }
        );

        if (refResult.records.length === 0) {
          return JSON.stringify({
            success: false,
            error: `Reference entity not found: ${entityId}`,
          });
        }

        // Find similar entities using common neighbors (Jaccard by default)
        const query = `
          MATCH (ref:Entity {id: $entityId})
          MATCH (candidate:Entity)
          WHERE candidate.id <> ref.id
            AND candidate.type = ref.type

          // Calculate similarity based on common neighbors
          OPTIONAL MATCH (ref)-[r1]-(common)-[r2]-(candidate)
          WITH ref, candidate, count(DISTINCT common) as commonNeighbors

          OPTIONAL MATCH (ref)-[r]-(refNeighbor)
          WITH ref, candidate, commonNeighbors, count(DISTINCT refNeighbor) as refNeighborCount

          OPTIONAL MATCH (candidate)-[r]-(candNeighbor)
          WITH ref, candidate, commonNeighbors, refNeighborCount, count(DISTINCT candNeighbor) as candNeighborCount

          // Jaccard similarity: |A ∩ B| / |A ∪ B|
          WITH candidate,
               commonNeighbors,
               refNeighborCount + candNeighborCount - commonNeighbors as unionCount,
               CASE
                 WHEN refNeighborCount + candNeighborCount - commonNeighbors = 0 THEN 0
                 ELSE toFloat(commonNeighbors) / (refNeighborCount + candNeighborCount - commonNeighbors)
               END as structuralSimilarity,
               apoc.text.jaroWinklerDistance(ref.label, candidate.label) as labelSimilarity

          WITH candidate,
               (structuralSimilarity * 0.6 + labelSimilarity * 0.4) as combinedSimilarity
          WHERE combinedSimilarity >= $threshold

          RETURN candidate { .id, .type, .label, .confidence, similarity: combinedSimilarity } as entity
          ORDER BY combinedSimilarity DESC
          LIMIT $limit
        `;

        const result = await session.run(query, {
          entityId,
          threshold: similarityThreshold,
          limit,
        });

        const similarEntities = result.records.map((r) => r.get('entity'));
        const executionTimeMs = Date.now() - startTime;

        logAudit('similar_entities_found', { entityId, count: similarEntities.length });

        return JSON.stringify({
          success: true,
          data: {
            referenceEntityId: entityId,
            similarEntities,
            metadata: {
              algorithm,
              threshold: similarityThreshold,
              count: similarEntities.length,
              executionTimeMs,
            },
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({
          success: false,
          error: `Failed to find similar entities: ${errorMessage}`,
        });
      } finally {
        if (session) {
          await session.close();
        }
      }
    },
  };

  // ---------------------------------------------------------------------------
  // Resolve Entity Tool
  // ---------------------------------------------------------------------------
  const resolveEntity = {
    name: 'resolve_entity',
    description: `Resolve an entity name to an existing entity in the graph.
Uses fuzzy matching and optional context for disambiguation.
Can optionally create the entity if not found.`,
    inputSchema: ResolveEntityInputSchema,
    callback: async (input: z.infer<typeof ResolveEntityInputSchema>): Promise<string> => {
      const startTime = Date.now();
      const { label, type, context, createIfNotFound } = input;

      let session: Session | null = null;
      try {
        session = driver.session({ database, defaultAccessMode: createIfNotFound ? 'WRITE' : 'READ' });

        // Try exact match first
        const exactQuery = `
          MATCH (e:Entity)
          WHERE toLower(e.label) = toLower($label)
          ${type ? 'AND e.type = $type' : ''}
          RETURN e { .* } as entity
          ORDER BY e.confidence DESC
          LIMIT 5
        `;

        const exactResult = await session.run(exactQuery, { label, type });

        if (exactResult.records.length > 0) {
          const entities = exactResult.records.map((r) => r.get('entity'));
          return JSON.stringify({
            success: true,
            data: {
              resolved: true,
              matchType: 'exact',
              entities,
              metadata: { executionTimeMs: Date.now() - startTime },
            },
          });
        }

        // Try fuzzy match
        const fuzzyQuery = `
          CALL db.index.fulltext.queryNodes('entity_search', $searchTerm)
          YIELD node as e, score
          ${type ? 'WHERE e.type = $type' : ''}
          RETURN e { .*, matchScore: score } as entity
          ORDER BY score DESC
          LIMIT 5
        `;

        const fuzzyResult = await session.run(fuzzyQuery, {
          searchTerm: `${label}~`,
          type,
        });

        if (fuzzyResult.records.length > 0) {
          const entities = fuzzyResult.records.map((r) => r.get('entity'));
          return JSON.stringify({
            success: true,
            data: {
              resolved: true,
              matchType: 'fuzzy',
              entities,
              metadata: { executionTimeMs: Date.now() - startTime },
            },
          });
        }

        // Not found - optionally create
        if (createIfNotFound && type) {
          const entityId = uuidv4();
          const now = new Date().toISOString();

          const createQuery = `
            CREATE (e:Entity {
              id: $entityId,
              type: $type,
              label: $label,
              confidence: 0.5,
              source: 'agent_resolution',
              createdAt: $now,
              updatedAt: $now,
              createdBy: $createdBy
            })
            RETURN e { .* } as entity
          `;

          const createResult = await session.run(createQuery, {
            entityId,
            type,
            label,
            now,
            createdBy: userId,
          });

          const entity = createResult.records[0]?.get('entity');
          logAudit('entity_created_via_resolution', { entityId, type, label });

          return JSON.stringify({
            success: true,
            data: {
              resolved: false,
              created: true,
              entity,
              metadata: { executionTimeMs: Date.now() - startTime },
            },
          });
        }

        return JSON.stringify({
          success: true,
          data: {
            resolved: false,
            created: false,
            message: `No entity found matching "${label}"`,
            metadata: { executionTimeMs: Date.now() - startTime },
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({
          success: false,
          error: `Entity resolution failed: ${errorMessage}`,
        });
      } finally {
        if (session) {
          await session.close();
        }
      }
    },
  };

  return {
    searchEntities,
    getEntity,
    createEntity,
    findSimilarEntities,
    resolveEntity,
    all: [searchEntities, getEntity, createEntity, findSimilarEntities, resolveEntity],
  };
}

export type EntityTools = ReturnType<typeof createEntityTools>;
