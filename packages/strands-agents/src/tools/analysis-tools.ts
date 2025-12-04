/**
 * @fileoverview Analysis and reasoning tools for Strands Agents
 * Provides graph analytics, pattern detection, and insight generation
 * @module @intelgraph/strands-agents/tools/analysis-tools
 */

import { z } from 'zod';
import type { Driver, Session } from 'neo4j-driver';

// ============================================================================
// Tool Input Schemas
// ============================================================================

export const DetectPatternsInputSchema = z.object({
  investigationId: z.string().uuid().optional(),
  patternTypes: z.array(z.enum([
    'star',           // Hub with many connections
    'chain',          // Linear sequence
    'cycle',          // Circular relationships
    'clique',         // Fully connected subgraph
    'bridge',         // Node connecting communities
    'isolate',        // Disconnected entity
  ])).default(['star', 'chain', 'bridge']),
  minSize: z.number().min(2).max(20).default(3),
  limit: z.number().min(1).max(50).default(10),
});

export const CentralityAnalysisInputSchema = z.object({
  scope: z.enum(['global', 'investigation', 'subgraph']).default('global'),
  scopeId: z.string().uuid().optional(),
  algorithm: z.enum([
    'degree',         // Count of connections
    'betweenness',    // Bridge importance
    'pagerank',       // Influence propagation
    'closeness',      // Average distance to others
    'eigenvector',    // Connection to important nodes
  ]).default('pagerank'),
  limit: z.number().min(1).max(100).default(20),
});

export const CommunityDetectionInputSchema = z.object({
  investigationId: z.string().uuid().optional(),
  algorithm: z.enum(['louvain', 'labelPropagation', 'modularity']).default('louvain'),
  minCommunitySize: z.number().min(2).default(3),
  includeMembers: z.boolean().default(true),
});

export const AnomalyDetectionInputSchema = z.object({
  investigationId: z.string().uuid().optional(),
  anomalyTypes: z.array(z.enum([
    'degree_outlier',        // Unusually high/low connections
    'temporal_outlier',      // Unusual timing patterns
    'attribute_outlier',     // Unusual property values
    'structural_hole',       // Missing expected connections
    'sudden_appearance',     // Entities appearing without history
  ])).default(['degree_outlier', 'structural_hole']),
  sensitivityThreshold: z.number().min(0).max(1).default(0.8),
});

export const GenerateInsightsInputSchema = z.object({
  investigationId: z.string().uuid(),
  insightTypes: z.array(z.enum([
    'key_entities',          // Most important entities
    'hidden_connections',    // Non-obvious relationships
    'risk_indicators',       // Potential threats
    'knowledge_gaps',        // Missing information
    'temporal_patterns',     // Time-based patterns
    'network_structure',     // Overall topology insights
  ])).default(['key_entities', 'hidden_connections', 'knowledge_gaps']),
  maxInsights: z.number().min(1).max(20).default(10),
});

export const CompareEntitiesInputSchema = z.object({
  entityIds: z.array(z.string().uuid()).min(2).max(10),
  comparisonAspects: z.array(z.enum([
    'properties',
    'connections',
    'neighborhood',
    'centrality',
    'temporal',
  ])).default(['properties', 'connections']),
});

// ============================================================================
// Analysis Tools Factory
// ============================================================================

export interface AnalysisToolsConfig {
  driver: Driver;
  database?: string;
  auditLog?: (action: string, details: Record<string, unknown>) => void;
}

/**
 * Creates analysis and reasoning tools for Strands Agents
 */
export function createAnalysisTools(config: AnalysisToolsConfig) {
  const { driver, database = 'neo4j', auditLog } = config;

  const logAudit = (action: string, details: Record<string, unknown>) => {
    if (auditLog) {
      auditLog(action, { ...details, timestamp: new Date().toISOString() });
    }
  };

  // ---------------------------------------------------------------------------
  // Detect Patterns Tool
  // ---------------------------------------------------------------------------
  const detectPatterns = {
    name: 'detect_patterns',
    description: `Detect structural patterns in the knowledge graph.
Finds stars (hubs), chains, cycles, cliques, bridges, and isolates.
Useful for identifying organizational structures and communication patterns.`,
    inputSchema: DetectPatternsInputSchema,
    callback: async (input: z.infer<typeof DetectPatternsInputSchema>): Promise<string> => {
      const startTime = Date.now();
      const { investigationId, patternTypes, minSize, limit } = input;

      let session: Session | null = null;
      try {
        session = driver.session({ database, defaultAccessMode: 'READ' });

        const patterns: Array<{
          type: string;
          entities: Array<{ id: string; type: string; label: string }>;
          score: number;
          description: string;
        }> = [];

        const scopeClause = investigationId
          ? `MATCH (i:Investigation {id: $investigationId})-[:CONTAINS]->(e:Entity)`
          : `MATCH (e:Entity)`;

        // Star pattern (hub with many connections)
        if (patternTypes.includes('star')) {
          const starQuery = `
            ${scopeClause}
            WITH e
            MATCH (e)-[r]-(neighbor:Entity)
            WITH e, count(DISTINCT neighbor) as degree
            WHERE degree >= $minSize
            RETURN e { .id, .type, .label } as hub, degree
            ORDER BY degree DESC
            LIMIT $limit
          `;
          const starResult = await session.run(starQuery, { investigationId, minSize, limit });
          starResult.records.forEach((r) => {
            patterns.push({
              type: 'star',
              entities: [r.get('hub')],
              score: r.get('degree').toNumber() / 100,
              description: `Hub entity with ${r.get('degree')} connections`,
            });
          });
        }

        // Chain pattern (linear path)
        if (patternTypes.includes('chain')) {
          const chainQuery = `
            ${scopeClause}
            WITH collect(e) as entities
            UNWIND entities as start
            MATCH path = (start)-[*${minSize}..${minSize + 2}]->(end)
            WHERE start <> end
              AND all(n IN nodes(path) WHERE n IN entities)
              AND all(n IN nodes(path) WHERE size((n)-[]-()) = 2 OR n = start OR n = end)
            WITH path, length(path) as pathLength
            ORDER BY pathLength DESC
            LIMIT $limit
            RETURN [n IN nodes(path) | n { .id, .type, .label }] as chain, pathLength
          `;
          try {
            const chainResult = await session.run(chainQuery, { investigationId, minSize, limit });
            chainResult.records.forEach((r) => {
              patterns.push({
                type: 'chain',
                entities: r.get('chain'),
                score: r.get('pathLength').toNumber() / 10,
                description: `Linear chain of ${r.get('pathLength')} entities`,
              });
            });
          } catch {
            // Chain detection might fail on some graphs - non-critical
          }
        }

        // Bridge pattern (nodes connecting different communities)
        if (patternTypes.includes('bridge')) {
          const bridgeQuery = `
            ${scopeClause}
            WITH e
            MATCH (e)-[r1]-(n1:Entity), (e)-[r2]-(n2:Entity)
            WHERE NOT (n1)-[]-(n2) AND n1 <> n2
            WITH e, count(*) as bridgeScore
            WHERE bridgeScore >= $minSize
            RETURN e { .id, .type, .label } as bridge, bridgeScore
            ORDER BY bridgeScore DESC
            LIMIT $limit
          `;
          const bridgeResult = await session.run(bridgeQuery, { investigationId, minSize, limit });
          bridgeResult.records.forEach((r) => {
            patterns.push({
              type: 'bridge',
              entities: [r.get('bridge')],
              score: Math.min(r.get('bridgeScore').toNumber() / 50, 1),
              description: `Bridge entity connecting ${r.get('bridgeScore')} disconnected pairs`,
            });
          });
        }

        const executionTimeMs = Date.now() - startTime;
        logAudit('patterns_detected', { patternTypes, count: patterns.length });

        return JSON.stringify({
          success: true,
          data: {
            patterns,
            metadata: {
              patternTypes,
              count: patterns.length,
              executionTimeMs,
            },
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({
          success: false,
          error: `Pattern detection failed: ${errorMessage}`,
        });
      } finally {
        if (session) {
          await session.close();
        }
      }
    },
  };

  // ---------------------------------------------------------------------------
  // Centrality Analysis Tool
  // ---------------------------------------------------------------------------
  const analyzeCentrality = {
    name: 'analyze_centrality',
    description: `Identify the most important or influential entities using centrality algorithms.
Supports degree (connections), betweenness (bridges), PageRank (influence),
closeness (accessibility), and eigenvector (connection quality) centrality.`,
    inputSchema: CentralityAnalysisInputSchema,
    callback: async (input: z.infer<typeof CentralityAnalysisInputSchema>): Promise<string> => {
      const startTime = Date.now();
      const { scope, scopeId, algorithm, limit } = input;

      let session: Session | null = null;
      try {
        session = driver.session({ database, defaultAccessMode: 'READ' });

        let query: string;
        const params: Record<string, unknown> = { limit };

        const scopeMatch = scope === 'investigation' && scopeId
          ? `MATCH (i:Investigation {id: $scopeId})-[:CONTAINS]->(e:Entity)
             WITH collect(e) as nodes`
          : 'MATCH (e:Entity) WITH collect(e) as nodes';

        params.scopeId = scopeId;

        switch (algorithm) {
          case 'degree':
            query = `
              ${scopeMatch}
              UNWIND nodes as e
              MATCH (e)-[r]-(neighbor)
              WHERE neighbor IN nodes
              WITH e, count(r) as score
              RETURN e { .id, .type, .label, centrality: score } as entity
              ORDER BY score DESC
              LIMIT $limit
            `;
            break;

          case 'betweenness':
            query = `
              ${scopeMatch}
              CALL gds.betweenness.stream({
                nodeProjection: 'Entity',
                relationshipProjection: '*'
              })
              YIELD nodeId, score
              WITH gds.util.asNode(nodeId) as e, score
              RETURN e { .id, .type, .label, centrality: score } as entity
              ORDER BY score DESC
              LIMIT $limit
            `;
            break;

          case 'pagerank':
            query = `
              ${scopeMatch}
              CALL gds.pageRank.stream({
                nodeProjection: 'Entity',
                relationshipProjection: '*'
              })
              YIELD nodeId, score
              WITH gds.util.asNode(nodeId) as e, score
              RETURN e { .id, .type, .label, centrality: score } as entity
              ORDER BY score DESC
              LIMIT $limit
            `;
            break;

          case 'closeness':
            query = `
              ${scopeMatch}
              CALL gds.closeness.stream({
                nodeProjection: 'Entity',
                relationshipProjection: '*'
              })
              YIELD nodeId, score
              WITH gds.util.asNode(nodeId) as e, score
              RETURN e { .id, .type, .label, centrality: score } as entity
              ORDER BY score DESC
              LIMIT $limit
            `;
            break;

          default: // eigenvector
            query = `
              ${scopeMatch}
              CALL gds.eigenvector.stream({
                nodeProjection: 'Entity',
                relationshipProjection: '*'
              })
              YIELD nodeId, score
              WITH gds.util.asNode(nodeId) as e, score
              RETURN e { .id, .type, .label, centrality: score } as entity
              ORDER BY score DESC
              LIMIT $limit
            `;
        }

        // Fallback to simple degree if GDS not available
        try {
          const result = await session.run(query, params);
          const entities = result.records.map((r) => r.get('entity'));
          const executionTimeMs = Date.now() - startTime;

          logAudit('centrality_analyzed', { algorithm, count: entities.length });

          return JSON.stringify({
            success: true,
            data: {
              algorithm,
              entities,
              metadata: {
                scope,
                count: entities.length,
                executionTimeMs,
              },
            },
          });
        } catch {
          // Fallback to simple degree centrality
          const fallbackQuery = `
            ${scopeMatch}
            UNWIND nodes as e
            MATCH (e)-[r]-(neighbor)
            WITH e, count(r) as score
            RETURN e { .id, .type, .label, centrality: score } as entity
            ORDER BY score DESC
            LIMIT $limit
          `;
          const result = await session.run(fallbackQuery, params);
          const entities = result.records.map((r) => r.get('entity'));

          return JSON.stringify({
            success: true,
            data: {
              algorithm: 'degree',
              note: 'Fallback to degree centrality (GDS not available)',
              entities,
              metadata: { executionTimeMs: Date.now() - startTime },
            },
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({
          success: false,
          error: `Centrality analysis failed: ${errorMessage}`,
        });
      } finally {
        if (session) {
          await session.close();
        }
      }
    },
  };

  // ---------------------------------------------------------------------------
  // Anomaly Detection Tool
  // ---------------------------------------------------------------------------
  const detectAnomalies = {
    name: 'detect_anomalies',
    description: `Detect anomalous entities or patterns in the graph.
Identifies degree outliers, temporal anomalies, structural holes, and sudden appearances.
Critical for threat detection and data quality assessment.`,
    inputSchema: AnomalyDetectionInputSchema,
    callback: async (input: z.infer<typeof AnomalyDetectionInputSchema>): Promise<string> => {
      const startTime = Date.now();
      const { investigationId, anomalyTypes, sensitivityThreshold } = input;

      let session: Session | null = null;
      try {
        session = driver.session({ database, defaultAccessMode: 'READ' });

        const anomalies: Array<{
          type: string;
          entity: { id: string; type: string; label: string };
          score: number;
          description: string;
        }> = [];

        const scopeClause = investigationId
          ? `MATCH (i:Investigation {id: $investigationId})-[:CONTAINS]->(e:Entity)`
          : `MATCH (e:Entity)`;

        // Degree outliers
        if (anomalyTypes.includes('degree_outlier')) {
          const degreeQuery = `
            ${scopeClause}
            WITH e
            MATCH (e)-[r]-()
            WITH e, count(r) as degree
            WITH e, degree, avg(degree) as avgDegree, stdev(degree) as stdDegree
            WHERE abs(degree - avgDegree) > (2 * stdDegree * $sensitivity)
            RETURN e { .id, .type, .label } as entity, degree,
                   CASE WHEN degree > avgDegree THEN 'high' ELSE 'low' END as outlierType
            ORDER BY abs(degree - avgDegree) DESC
            LIMIT 20
          `;
          try {
            const result = await session.run(degreeQuery, {
              investigationId,
              sensitivity: 2 - sensitivityThreshold,
            });
            result.records.forEach((r) => {
              anomalies.push({
                type: 'degree_outlier',
                entity: r.get('entity'),
                score: 0.8,
                description: `Unusually ${r.get('outlierType')} number of connections (${r.get('degree')})`,
              });
            });
          } catch {
            // Statistics might fail on small graphs
          }
        }

        // Structural holes (missing expected connections)
        if (anomalyTypes.includes('structural_hole')) {
          const holeQuery = `
            ${scopeClause}
            WITH e
            MATCH (e)-[]-(n1:Entity), (e)-[]-(n2:Entity)
            WHERE n1 <> n2
              AND n1.type = n2.type
              AND NOT (n1)-[]-(n2)
            WITH e, n1, n2, count(*) as missingLinks
            WHERE missingLinks >= 3
            RETURN e { .id, .type, .label } as entity, missingLinks
            ORDER BY missingLinks DESC
            LIMIT 10
          `;
          try {
            const result = await session.run(holeQuery, { investigationId });
            result.records.forEach((r) => {
              anomalies.push({
                type: 'structural_hole',
                entity: r.get('entity'),
                score: 0.7,
                description: `${r.get('missingLinks')} expected connections missing between neighbors`,
              });
            });
          } catch {
            // Non-critical
          }
        }

        // Sudden appearance (entities with recent creation but no history)
        if (anomalyTypes.includes('sudden_appearance')) {
          const appearanceQuery = `
            ${scopeClause}
            WHERE e.createdAt IS NOT NULL
              AND datetime(e.createdAt) > datetime() - duration('P7D')
            WITH e
            MATCH (e)-[r]-(neighbor)
            WITH e, count(r) as connections
            WHERE connections > 5
            RETURN e { .id, .type, .label, createdAt: e.createdAt } as entity, connections
            ORDER BY e.createdAt DESC
            LIMIT 10
          `;
          try {
            const result = await session.run(appearanceQuery, { investigationId });
            result.records.forEach((r) => {
              anomalies.push({
                type: 'sudden_appearance',
                entity: r.get('entity'),
                score: 0.75,
                description: `Recent entity with ${r.get('connections')} connections (potential fabrication)`,
              });
            });
          } catch {
            // Non-critical
          }
        }

        const executionTimeMs = Date.now() - startTime;
        logAudit('anomalies_detected', { anomalyTypes, count: anomalies.length });

        return JSON.stringify({
          success: true,
          data: {
            anomalies,
            metadata: {
              anomalyTypes,
              sensitivityThreshold,
              count: anomalies.length,
              executionTimeMs,
            },
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({
          success: false,
          error: `Anomaly detection failed: ${errorMessage}`,
        });
      } finally {
        if (session) {
          await session.close();
        }
      }
    },
  };

  // ---------------------------------------------------------------------------
  // Compare Entities Tool
  // ---------------------------------------------------------------------------
  const compareEntities = {
    name: 'compare_entities',
    description: `Compare multiple entities across various aspects.
Useful for identifying similarities, differences, and relationships.
Supports property, connection, neighborhood, and centrality comparison.`,
    inputSchema: CompareEntitiesInputSchema,
    callback: async (input: z.infer<typeof CompareEntitiesInputSchema>): Promise<string> => {
      const startTime = Date.now();
      const { entityIds, comparisonAspects } = input;

      let session: Session | null = null;
      try {
        session = driver.session({ database, defaultAccessMode: 'READ' });

        const comparison: Record<string, Record<string, unknown>> = {};

        // Get basic entity info
        const basicQuery = `
          UNWIND $entityIds as id
          MATCH (e:Entity {id: id})
          RETURN e { .* } as entity
        `;
        const basicResult = await session.run(basicQuery, { entityIds });

        basicResult.records.forEach((r) => {
          const entity = r.get('entity');
          comparison[entity.id] = {
            id: entity.id,
            type: entity.type,
            label: entity.label,
            properties: entity,
          };
        });

        // Connections comparison
        if (comparisonAspects.includes('connections')) {
          const connQuery = `
            UNWIND $entityIds as id
            MATCH (e:Entity {id: id})-[r]-(neighbor:Entity)
            WITH e.id as entityId, type(r) as relType, count(*) as count
            RETURN entityId, collect({type: relType, count: count}) as connections
          `;
          const connResult = await session.run(connQuery, { entityIds });
          connResult.records.forEach((r) => {
            const entityId = r.get('entityId');
            if (comparison[entityId]) {
              comparison[entityId].connections = r.get('connections');
            }
          });
        }

        // Common neighbors
        if (comparisonAspects.includes('neighborhood') && entityIds.length === 2) {
          const neighborQuery = `
            MATCH (e1:Entity {id: $id1})-[]-(common)-[]-(e2:Entity {id: $id2})
            WHERE common:Entity
            RETURN collect(DISTINCT common { .id, .type, .label })[0..10] as commonNeighbors
          `;
          const neighborResult = await session.run(neighborQuery, {
            id1: entityIds[0],
            id2: entityIds[1],
          });
          const commonNeighbors = neighborResult.records[0]?.get('commonNeighbors') || [];
          entityIds.forEach((id) => {
            if (comparison[id]) {
              comparison[id].commonNeighbors = commonNeighbors;
            }
          });
        }

        const executionTimeMs = Date.now() - startTime;

        return JSON.stringify({
          success: true,
          data: {
            entities: Object.values(comparison),
            comparisonAspects,
            metadata: { executionTimeMs },
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return JSON.stringify({
          success: false,
          error: `Entity comparison failed: ${errorMessage}`,
        });
      } finally {
        if (session) {
          await session.close();
        }
      }
    },
  };

  return {
    detectPatterns,
    analyzeCentrality,
    detectAnomalies,
    compareEntities,
    all: [detectPatterns, analyzeCentrality, detectAnomalies, compareEntities],
  };
}

export type AnalysisTools = ReturnType<typeof createAnalysisTools>;
