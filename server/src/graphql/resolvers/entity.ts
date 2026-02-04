// @ts-nocheck

import { getNeo4jDriver, isNeo4jMockMode } from '../../db/neo4j.js';
import neo4j from 'neo4j-driver';
import { randomUUID as uuidv4 } from 'node:crypto';
import pino from 'pino';
import {
  pubsub,
  ENTITY_CREATED,
  ENTITY_UPDATED,
  ENTITY_DELETED,
  tenantEvent,
} from '../subscriptions.js';
import { getPostgresPool } from '../../db/postgres.js';
import axios from 'axios';
import { GraphQLError } from 'graphql';
import { getMockEntity, getMockEntities } from './__mocks__/entityMocks.js';
import { withCache, listCacheKey } from '../../utils/cacheHelper.js';
import type { GraphQLContext } from '../apollo-v5-server.js';
import { authGuard } from '../utils/auth.js';
import { provenanceLedger } from '../../provenance/ledger.js';

const logger = (pino as any)();
const driver = getNeo4jDriver();

const entityResolvers = {
  Query: {
    entity: authGuard(async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      // Return mock data if database is not available
      if (isNeo4jMockMode()) {
        return getMockEntity(id);
      }

      try {
        // Use DataLoader for batched entity fetching
        const entity = await context.loaders.entityLoader.load(id);
        return entity;
      } catch (error: any) {
        logger.error({ error, id }, 'Error fetching entity by ID');
        // Fallback to mock data if database connection fails
        logger.warn('Falling back to mock entity data');
        return getMockEntity(id);
      }
    }),
    entities: authGuard(withCache(
      // Cache key generator
      (_parent: unknown, args: any, context: GraphQLContext) => {
        const tenantId = context?.user?.tenantId || 'default';
        return listCacheKey('entities', { ...args, tenantId });
      },
      // Resolver implementation
      async (
        _: unknown,
        {
          type,
          q,
          limit,
          offset,
        }: { type?: string; q?: string; limit: number; offset: number },
        context: GraphQLContext,
      ) => {
        // Return mock data if database is not available
        if (isNeo4jMockMode()) {
          return getMockEntities(type, q, limit, offset);
        }

        const session = driver.session();
        try {
          const tenantId = context.user!.tenantId;
          // Optimized: Use labels in MATCH if type is provided
          // MATCH (n:Entity) -> MATCH (n:Entity:Type)
          let query = 'MATCH (n:Entity';
          const params: any = { tenantId };

          if (type) {
            // Validating type to prevent injection (simple alphanumeric check)
            if (/^[a-zA-Z0-9_]+$/.test(type)) {
              query += `:${type}`;
            }
          }

          query += ') WHERE n.tenantId = $tenantId';

          if (q) {
            // Optimized search using Fulltext Index if available, falling back to CONTAINS
            // Note: 'entity_fulltext_idx' must be created via migration
            try {
              // We construct a separate query for fulltext search to get IDs, then MATCH
              // This is often more performant than complex WHERE clauses if the index is large
              const fulltextQuery = `
                CALL db.index.fulltext.queryNodes("entity_fulltext_idx", $q) YIELD node, score
                WHERE node.tenantId = $tenantId
                ${type ? `AND $type IN labels(node)` : ''}
                RETURN node SKIP $offset LIMIT $limit
              `;

              // Try to execute fulltext search
              const result = await session.run(fulltextQuery, { ...params, q, type, offset: neo4j.int(offset), limit: neo4j.int(limit) });
              return result.records.map((record) => {
                const entity = record.get('node');
                return {
                  id: entity.properties.id,
                  type: entity.labels[0],
                  props: entity.properties,
                  createdAt: entity.properties.createdAt,
                  updatedAt: entity.properties.updatedAt,
                };
              });

            } catch (err: any) {
              // Fallback if index doesn't exist or other error
              logger.warn({ err }, 'Fulltext search failed, falling back to legacy CONTAINS search');

              // Revert to building the legacy query
              query += ' AND (ANY(prop IN keys(n) WHERE toString(n[prop]) CONTAINS $q))';
              params.q = q;
              query += ' RETURN n SKIP $offset LIMIT $limit';
            }
          } else {
            query += ' RETURN n SKIP $offset LIMIT $limit';
          }
          params.limit = neo4j.int(limit);
          params.offset = neo4j.int(offset);

          const result = await session.run(query, params);
          return result.records.map((record) => {
            const entity = record.get('n');
            return {
              id: entity.properties.id,
              type: entity.labels[0],
              props: entity.properties,
              createdAt: entity.properties.createdAt,
              updatedAt: entity.properties.updatedAt,
            };
          });
        } catch (error: any) {
          logger.error(
            { error, type, q, limit, offset },
            'Error fetching entities',
          );
          const message = error instanceof Error ? error.message : 'Unknown error';
          throw new Error(`Failed to fetch entities: ${message}`);
        } finally {
          await session.close();
        }
      },
      // Cache options
      30 // 30s TTL
    )),
    semanticSearch: authGuard(withCache(
      (_p: any, args: any, ctx: GraphQLContext) => listCacheKey('semanticSearch', { ...args, tenantId: ctx.user!.tenantId }),
      async (
        _: unknown,
        {
          query,
          filters,
          limit,
          offset,
        }: {
          query: string;
          filters?: any;
          limit: number;
          offset: number;
        },
        context: GraphQLContext,
      ) => {
        const pgPool = getPostgresPool();
        const neo4jSession = driver.session();
        let pgClient;

        try {
          const tenantId = context.user!.tenantId;
          // 1. Get embedding for the query from ML service
          const mlServiceUrl =
            process.env.ML_SERVICE_URL || 'http://localhost:8081';
          const embeddingResponse = await axios.post(
            `${mlServiceUrl}/gnn/generate_embeddings`,
            {
              graph_data: { nodes: [{ id: 'query', features: [] }] }, // Dummy graph for query embedding
              node_features: { query: [0.0] }, // Placeholder for actual query features
              model_name: 'text_embedding_model', // Assuming a text embedding model in ML service
              job_id: `semantic-search-${Date.now()}`,
            },
          );
          const queryEmbedding = embeddingResponse.data.node_embeddings.query;

          if (!queryEmbedding || queryEmbedding.length === 0) {
            throw new Error('Failed to get embedding for query from ML service.');
          }

          // 2. Perform vector similarity search in PostgreSQL with filters
          pgClient = await pgPool.connect();
          const embeddingVectorString = `[${queryEmbedding.join(',')}]`;

          let pgQuery = `SELECT ee.entity_id FROM entity_embeddings ee`;
          const pgQueryParams: any[] = [embeddingVectorString];
          let paramIndex = 2; // Start index for additional parameters

          // Add filters for type and props
          const type = filters?.type;
          const props = filters?.props;

          // Always JOIN entities to filter by tenant_id
          pgQuery += ` JOIN entities e ON ee.entity_id = e.id WHERE e.tenant_id = $${paramIndex}`;
          pgQueryParams.push(tenantId);
          paramIndex++;

          if (type) {
            pgQuery += ` AND e.type = $${paramIndex}`;
            pgQueryParams.push(type);
            paramIndex++;
          }
          if (props) {
            // Optimized: Use JSONB containment operator (@>) which uses GIN index
            // props input is expected to be a JSON object subset
            pgQuery += ` AND e.props @> $${paramIndex}`;
            pgQueryParams.push(JSON.stringify(props));
            paramIndex++;
          }

          pgQuery += ` ORDER BY ee.embedding <-> $1 LIMIT ${paramIndex} OFFSET ${paramIndex + 1}`;
          pgQueryParams.push(limit);
          pgQueryParams.push(offset);

          const pgResult = await pgClient.query(pgQuery, pgQueryParams);

          const entityIds = pgResult.rows.map((row: any) => row.entity_id);

          if (entityIds.length === 0) {
            return [];
          }

          // 3. Fetch corresponding entities from Neo4j using DataLoader
          const searchService = new (
            await import('../../services/SemanticSearchService.js')
          ).default();
          const docs = await searchService.search(
            query,
            filters || {},
            limit + offset,
          );
          const sliced = docs.slice(offset);
          const ids = sliced.map((d: any) => d.metadata.graphId).filter(Boolean);

          if (ids.length === 0) return [];

          // Use DataLoader to batch fetch entities - prevents N+1 queries
          const entities = await Promise.all(
            ids.map((id) => context.loaders.entityLoader.load(id))
          );

          // Filter out any errors (entities not found)
          return entities.filter((entity) => !(entity instanceof Error));
        } catch (error: any) {
          logger.error(
            { error, query, filters },
            'Error performing semantic search with filters',
          );
          const message = error instanceof Error ? error.message : 'Unknown error';
          throw new Error(`Failed to perform semantic search: ${message}`);
        } finally {
          await neo4jSession.close();
          if (pgClient) pgClient.release();
        }
      },
      60
    )),
  },
  Mutation: {
    createEntity: authGuard(async (
      _: unknown,
      { input }: { input: { type: string; props: any } },
      context: GraphQLContext,
    ) => {
      // Validate required fields before attempting Neo4j operations
      if (!input.type || typeof input.type !== 'string' || input.type.trim() === '') {
        throw new GraphQLError('Entity type is required and must be a non-empty string', {
          extensions: {
            code: 'BAD_USER_INPUT',
            http: { status: 400 },
          },
        });
      }

      const session = driver.session();
      try {
        const tenantId = context.user!.tenantId;
        const id = uuidv4();
        const createdAt = new Date().toISOString();
        const type = input.type;
        const props = {
          ...input.props,
          id,
          createdAt,
          updatedAt: createdAt,
          tenantId,
        };

        const result = await session.run(
          `CREATE (n:Entity:${type} $props) RETURN n`,
          { props },
        );
        const record = result.records[0].get('n');
        const entity = {
          id: record.properties.id,
          type: record.labels[0],
          props: record.properties,
          createdAt: record.properties.createdAt,
          updatedAt: record.properties.updatedAt,
          tenantId: record.properties.tenantId,
        };
        pubsub.publish(tenantEvent(ENTITY_CREATED, tenantId), {
          payload: entity,
        });

        // Audit Log (IG-206)
        await provenanceLedger.appendEntry({
          tenantId,
          actionType: 'CREATE_ENTITY',
          resourceType: 'Entity',
          resourceId: entity.id,
          actorId: context.user!.id,
          actorType: 'user',
          timestamp: new Date(),
          payload: {
            mutationType: 'CREATE',
            entityId: entity.id,
            entityType: 'Entity',
            newState: entity as any,
          },
          metadata: {
            correlationId: context.telemetry.traceId,
            timestamp: new Date().toISOString()
          }
        }).catch(err => logger.error({ err }, 'Failed to append audit log'));

        return entity;
      } catch (error: any) {
        logger.error({ error, input }, 'Error creating entity');
        // Re-throw GraphQLErrors as-is to preserve status codes
        if (error instanceof GraphQLError) {
          throw error;
        }
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new GraphQLError(`Failed to create entity: ${message}`, {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            http: { status: 500 },
          },
        });
      } finally {
        await session.close();
      }
    }),
    updateEntity: authGuard(async (
      _: unknown,
      {
        id,
        input,
        lastSeenTimestamp,
      }: {
        id: string;
        input: { type?: string; props?: any };
        lastSeenTimestamp: string;
      },
      context: GraphQLContext,
    ) => {
      const session = driver.session();
      try {
        const tenantId = context.user!.tenantId;
        const existing = await session.run(
          'MATCH (n:Entity {id: $id, tenantId: $tenantId}) RETURN n',
          { id, tenantId },
        );
        if (existing.records.length === 0) {
          return null;
        }
        const current = existing.records[0].get('n').properties;
        if (
          current.updatedAt &&
          new Date(current.updatedAt).toISOString() !==
          new Date(lastSeenTimestamp).toISOString()
        ) {
          const err: any = new Error('Conflict: Entity has been modified');
          err.extensions = { code: 'CONFLICT', server: current };
          throw err;
        }

        const updatedAt = new Date().toISOString();
        let query = 'MATCH (n:Entity {id: $id, tenantId: $tenantId})';
        const params: any = { id, updatedAt, tenantId };

        if (input.type) {
          // Remove old labels and add new type label
          query += ` REMOVE n:${input.type} SET n:${input.type}`; // This is simplified
        }

        if (input.props) {
          query += ' SET n += $props, n.updatedAt = $updatedAt';
          params.props = input.props;
        } else {
          query += ' SET n.updatedAt = $updatedAt';
        }

        query += ' RETURN n';

        const result = await session.run(query, params);
        if (result.records.length === 0) {
          return null; // Or throw an error if entity not found
        }
        const record = result.records[0].get('n');
        const entity = {
          id: record.properties.id,
          type: record.labels[0],
          props: record.properties,
          createdAt: record.properties.createdAt,
          updatedAt: record.properties.updatedAt,
          tenantId: record.properties.tenantId,
        };
        pubsub.publish(tenantEvent(ENTITY_UPDATED, tenantId), {
          payload: entity,
        });

        // Audit Log (IG-206)
        await provenanceLedger.appendEntry({
          tenantId,
          actionType: 'UPDATE_ENTITY',
          resourceType: 'Entity',
          resourceId: entity.id,
          actorId: context.user!.id,
          actorType: 'user',
          timestamp: new Date(),
          payload: {
            mutationType: 'UPDATE',
            entityId: entity.id,
            entityType: 'Entity',
            newState: entity as any,
          },
          metadata: {
            correlationId: context.telemetry.traceId,
            timestamp: new Date().toISOString()
          }
        }).catch(err => logger.error({ err }, 'Failed to append audit log'));

        return entity;
      } catch (error: any) {
        logger.error({ error, id, input }, 'Error updating entity');
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to update entity: ${message}`);
      } finally {
        await session.close();
      }
    }),
    deleteEntity: authGuard(async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      const session = driver.session();
      try {
        const tenantId = context.user!.tenantId;
        // Soft delete: set a 'deletedAt' timestamp
        const deletedAt = new Date().toISOString();
        const result = await session.run(
          'MATCH (n:Entity {id: $id, tenantId: $tenantId}) SET n.deletedAt = $deletedAt RETURN n',
          { id, deletedAt, tenantId },
        );
        if (result.records.length === 0) {
          return false; // Or throw an error if entity not found
        }
        pubsub.publish(tenantEvent(ENTITY_DELETED, tenantId), { payload: id });

        // Audit Log (IG-206)
        await provenanceLedger.appendEntry({
          tenantId,
          actionType: 'DELETE_ENTITY',
          resourceType: 'Entity',
          resourceId: id,
          actorId: context.user!.id,
          actorType: 'user',
          timestamp: new Date(),
          payload: {
            mutationType: 'DELETE',
            entityId: id,
            entityType: 'Entity',
          },
          metadata: {
            correlationId: context.telemetry.traceId,
            timestamp: new Date().toISOString()
          }
        }).catch(err => logger.error({ err }, 'Failed to append audit log'));

        return true;
      } catch (error: any) {
        logger.error({ error, id }, 'Error deleting entity');
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to delete entity: ${message}`);
      } finally {
        await session.close();
      }
    }),
    linkEntities: authGuard(async (_: unknown, { text }: { text: string }, context: GraphQLContext) => {
      try {
        const mlServiceUrl =
          process.env.ML_SERVICE_URL || 'http://localhost:8081';
        const response = await axios.post(
          `${mlServiceUrl}/nlp/entity_linking`,
          {
            text: text,
            job_id: `entity-linking-${Date.now()}`,
          },
        );

        // The ML service returns a queued response, so we need to poll or use a webhook
        // For simplicity, this resolver will assume the ML service returns the result directly
        // In a real application, you'd handle the async nature (e.g., by returning a Job ID
        // and having a separate subscription for job completion).

        // Assuming the ML service returns the linked entities directly for this demo
        if (response.data.status === 'completed' && response.data.entities) {
          return response.data.entities.map((entity: any) => ({
            text: entity.text,
            label: entity.label,
            startChar: entity.start_char,
            endChar: entity.end_char,
            entityId: entity.entity_id,
          }));
        } else {
          throw new Error(
            `ML service did not return completed entities: ${response.data.status}`,
          );
        }
      } catch (error: any) {
        logger.error({ error, text }, 'Error linking entities');
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to link entities: ${message}`);
      }
    }),
    extractRelationships: authGuard(async (
      _: unknown,
      { text, entities }: { text: string; entities: any[] },
      context: GraphQLContext,
    ) => {
      const neo4jSession = driver.session(); // Get Neo4j session
      try {
        const mlServiceUrl =
          process.env.ML_SERVICE_URL || 'http://localhost:8081';
        const response = await axios.post(
          `${mlServiceUrl}/nlp/relationship_extraction`,
          {
            text: text,
            entities: entities,
            job_id: `relationship-extraction-${Date.now()}`,
          },
        );

        if (
          response.data.status === 'completed' &&
          response.data.relationships
        ) {
          const tenantId = context.user!.tenantId;
          const extractedRelationships = response.data.relationships.map(
            (rel: any) => ({
              sourceEntityId: rel.source_entity_id,
              targetEntityId: rel.target_entity_id,
              type: rel.type,
              confidence: rel.confidence,
              textSpan: rel.text_span,
            }),
          );

          // Create relationships in Neo4j
          for (const rel of extractedRelationships) {
            const createdAt = new Date().toISOString();
            const props = {
              id: uuidv4(), // Generate a new ID for the relationship
              confidence: rel.confidence,
              textSpan: rel.textSpan,
              createdAt: createdAt,
              tenantId,
            };
            await neo4jSession.run(
              `
              MATCH (source:Entity {id: $sourceId, tenantId: $tenantId})
              MATCH (target:Entity {id: $targetId, tenantId: $tenantId})
              CREATE (source)-[r:${rel.type} $props]->(target)
              RETURN r
              `,
              {
                sourceId: rel.sourceEntityId,
                targetId: rel.targetEntityId,
                tenantId,
                props: props,
              },
            );
            logger.info(
              `Created relationship: ${rel.sourceEntityId}-[${rel.type}]->${rel.targetEntityId}`,
            );
          }

          return extractedRelationships;
        } else {
          throw new Error(
            `ML service did not return completed relationships: ${response.data.status}`,
          );
        }
      } catch (error: any) {
        logger.error(
          { error, text, entities },
          'Error extracting relationships',
        );
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to extract relationships: ${message}`);
      } finally {
        await neo4jSession.close(); // Close Neo4j session
      }
    }),
  },
};

export default entityResolvers;
