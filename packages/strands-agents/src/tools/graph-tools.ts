/**
 * @fileoverview Graph database tools for Strands Agents
 * Provides type-safe Neo4j operations with policy enforcement
 * @module @intelgraph/strands-agents/tools/graph-tools
 */

import { z } from 'zod';
import type { Driver, Session, QueryResult as Neo4jResult } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';
import { QueryResultSchema, CypherQuerySchema, type QueryResult } from '../types.js';

// ============================================================================
// Tool Input Schemas (Zod for type safety)
// ============================================================================

export const ExecuteCypherInputSchema = z.object({
  query: z.string()
    .min(1, 'Query cannot be empty')
    .describe('Cypher query to execute against Neo4j'),
  parameters: z.record(z.unknown())
    .optional()
    .describe('Query parameters for parameterized queries'),
  readOnly: z.boolean()
    .default(true)
    .describe('Whether this is a read-only query (safer)'),
  explain: z.boolean()
    .default(false)
    .describe('Return query plan instead of executing'),
});

export const FindPathInputSchema = z.object({
  sourceId: z.string().uuid().describe('Starting entity UUID'),
  targetId: z.string().uuid().describe('Target entity UUID'),
  maxDepth: z.number().min(1).max(10).default(4).describe('Maximum path length'),
  relationshipTypes: z.array(z.string()).optional().describe('Filter by relationship types'),
  algorithm: z.enum(['shortestPath', 'allShortestPaths', 'dijkstra'])
    .default('shortestPath')
    .describe('Pathfinding algorithm'),
});

export const GetNeighborsInputSchema = z.object({
  entityId: z.string().uuid().describe('Entity UUID to get neighbors for'),
  depth: z.number().min(1).max(3).default(1).describe('Traversal depth'),
  direction: z.enum(['OUTGOING', 'INCOMING', 'BOTH']).default('BOTH'),
  relationshipTypes: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(25),
});

export const SubgraphQueryInputSchema = z.object({
  centerEntityId: z.string().uuid().describe('Center of subgraph'),
  radius: z.number().min(1).max(5).default(2),
  includeProperties: z.boolean().default(true),
  maxNodes: z.number().min(1).max(500).default(100),
});

export const GraphStatsInputSchema = z.object({
  scope: z.enum(['global', 'investigation', 'entity']).default('global'),
  scopeId: z.string().uuid().optional(),
});

// ============================================================================
// Blocked Query Patterns (Security)
// ============================================================================

const BLOCKED_PATTERNS = [
  /\bDELETE\b/i,
  /\bDETACH\s+DELETE\b/i,
  /\bREMOVE\b/i,
  /\bDROP\b/i,
  /\bCALL\s+db\./i,
  /\bCALL\s+dbms\./i,
  /\bLOAD\s+CSV\b/i,
  /\bPERIODIC\s+COMMIT\b/i,
];

function isQuerySafe(query: string, readOnly: boolean): { safe: boolean; reason?: string } {
  if (!readOnly) {
    return { safe: true }; // Write queries bypass pattern check (rely on permissions)
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(query)) {
      return {
        safe: false,
        reason: `Query contains blocked pattern: ${pattern.source}`,
      };
    }
  }

  return { safe: true };
}

// ============================================================================
// Graph Tools Factory
// ============================================================================

export interface GraphToolsConfig {
  driver: Driver;
  database?: string;
  auditLog?: (action: string, details: Record<string, unknown>) => void;
  maxExecutionTimeMs?: number;
}

/**
 * Creates type-safe graph tools for Strands Agents
 * These tools integrate with Neo4j and enforce security policies
 */
export function createGraphTools(config: GraphToolsConfig) {
  const { driver, database = 'neo4j', auditLog, maxExecutionTimeMs = 30000 } = config;

  const logAudit = (action: string, details: Record<string, unknown>) => {
    if (auditLog) {
      auditLog(action, { ...details, timestamp: new Date().toISOString() });
    }
  };

  // ---------------------------------------------------------------------------
  // Execute Cypher Query Tool
  // ---------------------------------------------------------------------------
  const executeCypher = {
    name: 'execute_cypher',
    description: `Execute a Cypher query against the Neo4j graph database.
Use this for custom graph queries when other tools don't fit your needs.
IMPORTANT: Prefer read-only queries. Write operations require explicit approval.
Returns query results with execution statistics.`,
    inputSchema: ExecuteCypherInputSchema,
    callback: async (input: z.infer<typeof ExecuteCypherInputSchema>): Promise<string> => {
      const startTime = Date.now();
      const { query, parameters = {}, readOnly, explain } = input;

      // Security check
      const safetyCheck = isQuerySafe(query, readOnly);
      if (!safetyCheck.safe) {
        logAudit('cypher_blocked', { query, reason: safetyCheck.reason });
        return JSON.stringify({
          success: false,
          error: `Query blocked: ${safetyCheck.reason}`,
        });
      }

      let session: Session | null = null;
      try {
        session = driver.session({
          database,
          defaultAccessMode: readOnly ? 'READ' : 'WRITE',
        });

        const finalQuery = explain ? `EXPLAIN ${query}` : query;

        const result: Neo4jResult = await session.run(finalQuery, parameters);

        const records = result.records.map((record) => {
          const obj: Record<string, unknown> = {};
          record.keys.forEach((key) => {
            obj[key] = record.get(key);
          });
          return obj;
        });

        const executionTimeMs = Date.now() - startTime;

        logAudit('cypher_executed', {
          query,
          readOnly,
          recordCount: records.length,
          executionTimeMs,
        });

        return JSON.stringify({
          success: true,
          data: {
            records,
            summary: {
              query,
              recordCount: records.length,
              executionTimeMs,
              counters: result.summary.counters?.updates() || {},
            },
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logAudit('cypher_error', { query, error: errorMessage });
        return JSON.stringify({
          success: false,
          error: `Query execution failed: ${errorMessage}`,
        });
      } finally {
        if (session) {
          await session.close();
        }
      }
    },
  };

  // ---------------------------------------------------------------------------
  // Find Path Tool
  // ---------------------------------------------------------------------------
  const findPath = {
    name: 'find_path',
    description: `Find paths between two entities in the knowledge graph.
Use this to discover connections, influence chains, or communication paths.
Supports shortest path, all shortest paths, and weighted (Dijkstra) algorithms.`,
    inputSchema: FindPathInputSchema,
    callback: async (input: z.infer<typeof FindPathInputSchema>): Promise<string> => {
      const startTime = Date.now();
      const { sourceId, targetId, maxDepth, relationshipTypes, algorithm } = input;

      let session: Session | null = null;
      try {
        session = driver.session({ database, defaultAccessMode: 'READ' });

        const relFilter = relationshipTypes?.length
          ? `:${relationshipTypes.join('|')}`
          : '';

        let query: string;
        switch (algorithm) {
          case 'allShortestPaths':
            query = `
              MATCH (source:Entity {id: $sourceId}), (target:Entity {id: $targetId})
              MATCH paths = allShortestPaths((source)-[${relFilter}*..${maxDepth}]-(target))
              RETURN paths
              LIMIT 10
            `;
            break;
          case 'dijkstra':
            query = `
              MATCH (source:Entity {id: $sourceId}), (target:Entity {id: $targetId})
              CALL gds.shortestPath.dijkstra.stream({
                sourceNode: source,
                targetNode: target,
                relationshipWeightProperty: 'weight'
              })
              YIELD nodeIds, costs, totalCost
              RETURN nodeIds, costs, totalCost
            `;
            break;
          default: // shortestPath
            query = `
              MATCH (source:Entity {id: $sourceId}), (target:Entity {id: $targetId})
              MATCH path = shortestPath((source)-[${relFilter}*..${maxDepth}]-(target))
              RETURN path
            `;
        }

        const result = await session.run(query, { sourceId, targetId });

        const paths = result.records.map((record) => record.toObject());
        const executionTimeMs = Date.now() - startTime;

        logAudit('path_found', { sourceId, targetId, algorithm, pathCount: paths.length });

        return JSON.stringify({
          success: true,
          data: {
            paths,
            metadata: {
              sourceId,
              targetId,
              algorithm,
              maxDepth,
              pathsFound: paths.length,
              executionTimeMs,
            },
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({
          success: false,
          error: `Path finding failed: ${errorMessage}`,
        });
      } finally {
        if (session) {
          await session.close();
        }
      }
    },
  };

  // ---------------------------------------------------------------------------
  // Get Neighbors Tool
  // ---------------------------------------------------------------------------
  const getNeighbors = {
    name: 'get_neighbors',
    description: `Get neighboring entities connected to a given entity.
Use this to explore the local graph structure around a specific entity.
Useful for understanding an entity's connections and context.`,
    inputSchema: GetNeighborsInputSchema,
    callback: async (input: z.infer<typeof GetNeighborsInputSchema>): Promise<string> => {
      const startTime = Date.now();
      const { entityId, depth, direction, relationshipTypes, limit } = input;

      let session: Session | null = null;
      try {
        session = driver.session({ database, defaultAccessMode: 'READ' });

        const relFilter = relationshipTypes?.length
          ? `:${relationshipTypes.join('|')}`
          : '';

        const directionPattern =
          direction === 'OUTGOING' ? `-[r${relFilter}*1..${depth}]->` :
          direction === 'INCOMING' ? `<-[r${relFilter}*1..${depth}]-` :
          `-[r${relFilter}*1..${depth}]-`;

        const query = `
          MATCH (center:Entity {id: $entityId})
          MATCH (center)${directionPattern}(neighbor:Entity)
          WITH DISTINCT neighbor,
               min(length(shortestPath((center)-[*]-(neighbor)))) as distance
          RETURN neighbor {
            .id, .type, .label, .confidence,
            distance: distance
          } as entity
          ORDER BY distance, neighbor.confidence DESC
          LIMIT $limit
        `;

        const result = await session.run(query, { entityId, limit: limit });

        const neighbors = result.records.map((r) => r.get('entity'));
        const executionTimeMs = Date.now() - startTime;

        logAudit('neighbors_retrieved', { entityId, neighborCount: neighbors.length });

        return JSON.stringify({
          success: true,
          data: {
            centerEntityId: entityId,
            neighbors,
            metadata: {
              depth,
              direction,
              count: neighbors.length,
              executionTimeMs,
            },
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({
          success: false,
          error: `Failed to get neighbors: ${errorMessage}`,
        });
      } finally {
        if (session) {
          await session.close();
        }
      }
    },
  };

  // ---------------------------------------------------------------------------
  // Get Subgraph Tool
  // ---------------------------------------------------------------------------
  const getSubgraph = {
    name: 'get_subgraph',
    description: `Extract a subgraph centered on an entity with a given radius.
Returns nodes and relationships within the specified distance.
Useful for visualizing local network structure or exporting subsets.`,
    inputSchema: SubgraphQueryInputSchema,
    callback: async (input: z.infer<typeof SubgraphQueryInputSchema>): Promise<string> => {
      const startTime = Date.now();
      const { centerEntityId, radius, includeProperties, maxNodes } = input;

      let session: Session | null = null;
      try {
        session = driver.session({ database, defaultAccessMode: 'READ' });

        const nodeProjection = includeProperties
          ? 'node { .* }'
          : 'node { .id, .type, .label }';

        const query = `
          MATCH (center:Entity {id: $centerEntityId})
          CALL apoc.path.subgraphAll(center, {
            maxLevel: $radius,
            limit: $maxNodes
          })
          YIELD nodes, relationships
          RETURN
            [n IN nodes | ${nodeProjection.replace('node', 'n')}] as nodes,
            [r IN relationships | {
              id: r.id,
              type: type(r),
              sourceId: startNode(r).id,
              targetId: endNode(r).id,
              properties: properties(r)
            }] as relationships
        `;

        const result = await session.run(query, { centerEntityId, radius, maxNodes });

        if (result.records.length === 0) {
          return JSON.stringify({
            success: true,
            data: { nodes: [], relationships: [], metadata: { centerEntityId, radius } },
          });
        }

        const record = result.records[0];
        const nodes = record.get('nodes');
        const relationships = record.get('relationships');
        const executionTimeMs = Date.now() - startTime;

        logAudit('subgraph_extracted', {
          centerEntityId,
          radius,
          nodeCount: nodes.length,
          relationshipCount: relationships.length,
        });

        return JSON.stringify({
          success: true,
          data: {
            nodes,
            relationships,
            metadata: {
              centerEntityId,
              radius,
              nodeCount: nodes.length,
              relationshipCount: relationships.length,
              executionTimeMs,
            },
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({
          success: false,
          error: `Subgraph extraction failed: ${errorMessage}`,
        });
      } finally {
        if (session) {
          await session.close();
        }
      }
    },
  };

  // ---------------------------------------------------------------------------
  // Graph Statistics Tool
  // ---------------------------------------------------------------------------
  const getGraphStats = {
    name: 'get_graph_stats',
    description: `Get statistics about the knowledge graph.
Returns counts of nodes, relationships, and their distributions.
Useful for understanding the scope and shape of the data.`,
    inputSchema: GraphStatsInputSchema,
    callback: async (input: z.infer<typeof GraphStatsInputSchema>): Promise<string> => {
      const startTime = Date.now();
      const { scope, scopeId } = input;

      let session: Session | null = null;
      try {
        session = driver.session({ database, defaultAccessMode: 'READ' });

        let query: string;
        const params: Record<string, unknown> = {};

        switch (scope) {
          case 'investigation':
            if (!scopeId) {
              return JSON.stringify({ success: false, error: 'scopeId required for investigation scope' });
            }
            params.investigationId = scopeId;
            query = `
              MATCH (i:Investigation {id: $investigationId})-[:CONTAINS]->(e:Entity)
              WITH collect(e) as entities
              MATCH (e1)-[r]->(e2) WHERE e1 IN entities AND e2 IN entities
              RETURN
                size(entities) as nodeCount,
                count(r) as relationshipCount,
                apoc.coll.frequencies([e IN entities | e.type]) as nodeTypeDistribution,
                apoc.coll.frequencies([type(r)]) as relationshipTypeDistribution
            `;
            break;
          case 'entity':
            if (!scopeId) {
              return JSON.stringify({ success: false, error: 'scopeId required for entity scope' });
            }
            params.entityId = scopeId;
            query = `
              MATCH (center:Entity {id: $entityId})-[r]-(neighbor)
              RETURN
                count(DISTINCT neighbor) as neighborCount,
                count(r) as connectionCount,
                apoc.coll.frequencies([type(r)]) as relationshipTypeDistribution,
                avg(r.confidence) as avgRelationshipConfidence
            `;
            break;
          default: // global
            query = `
              CALL apoc.meta.stats() YIELD nodeCount, relCount, labels, relTypes
              RETURN nodeCount, relCount, labels, relTypes
            `;
        }

        const result = await session.run(query, params);
        const stats = result.records[0]?.toObject() || {};
        const executionTimeMs = Date.now() - startTime;

        return JSON.stringify({
          success: true,
          data: {
            scope,
            scopeId,
            stats,
            metadata: { executionTimeMs },
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({
          success: false,
          error: `Failed to get graph stats: ${errorMessage}`,
        });
      } finally {
        if (session) {
          await session.close();
        }
      }
    },
  };

  return {
    executeCypher,
    findPath,
    getNeighbors,
    getSubgraph,
    getGraphStats,
    // Export as array for Strands Agent tools config
    all: [executeCypher, findPath, getNeighbors, getSubgraph, getGraphStats],
  };
}

export type GraphTools = ReturnType<typeof createGraphTools>;
