/**
 * LLM Adapter for NL to Query Generation
 *
 * This module defines the interface for LLM-based query generation.
 * The actual LLM call is abstracted - implementations can use:
 * - OpenAI GPT-4
 * - Anthropic Claude
 * - Local models (LLaMA, Mistral)
 * - Custom fine-tuned models
 *
 * For testing, a mock implementation is provided.
 */

import type {
  LlmGenerateInput,
  LlmGenerateOutput,
  GraphSchemaDescription,
  PolicyContext,
  QueryDialect,
} from './types.js';

// =============================================================================
// LLM Adapter Interface
// =============================================================================

export interface LlmAdapter {
  /**
   * Generate a query from natural language input.
   *
   * The implementation should:
   * 1. Build a prompt that includes schema context and policy constraints
   * 2. Call the LLM with the constructed prompt
   * 3. Parse the response to extract the query, explanation, and assumptions
   * 4. Return the structured result
   */
  generateQuery(input: LlmGenerateInput): Promise<LlmGenerateOutput>;

  /**
   * Health check for the LLM service.
   */
  healthCheck(): Promise<{ healthy: boolean; latencyMs?: number }>;
}

// =============================================================================
// Prompt Construction (for documentation purposes)
// =============================================================================

/**
 * Sample LLM Prompt Template
 *
 * This is the structure of the prompt that would be sent to the LLM.
 * The actual implementation would construct this dynamically.
 *
 * ```
 * SYSTEM:
 * You are an expert graph query generator for the IntelGraph intelligence
 * analysis platform. Your task is to convert natural language questions
 * into safe, efficient Cypher queries.
 *
 * SCHEMA CONTEXT:
 * Node Types:
 * - Person: id (ID), name (string), type (string), confidence (number)
 * - Organization: id (ID), name (string), type (string), industry (string)
 * - Location: id (ID), name (string), latitude (number), longitude (number)
 *
 * Edge Types:
 * - WORKS_FOR: from Person to Organization, fields: role, startDate, endDate
 * - COMMUNICATES_WITH: from Person to Person, fields: method, frequency
 * - LOCATED_AT: from Person/Organization to Location
 *
 * POLICY CONSTRAINTS:
 * - Maximum traversal depth: 4
 * - Maximum rows: 100
 * - Disallowed labels: [ClassifiedPerson, SensitiveOrg]
 * - Disallowed operations: DELETE, CREATE, MERGE
 *
 * RULES:
 * 1. ALWAYS include a LIMIT clause (max 100)
 * 2. NEVER use DELETE, CREATE, MERGE, SET, or DROP operations
 * 3. NEVER access disallowed labels or node types
 * 4. Keep traversal depth within limits (max 4 hops)
 * 5. Use parameters ($name, $id) instead of inline values
 * 6. Return only the query, explanation, and assumptions - no free-form answers
 *
 * USER:
 * {userText}
 *
 * Respond with a JSON object:
 * {
 *   "query": "CYPHER QUERY HERE",
 *   "explanation": "Brief explanation of what the query does",
 *   "assumptions": ["Assumption 1", "Assumption 2"],
 *   "parameters": { "param1": "value1" }
 * }
 * ```
 */

// =============================================================================
// Mock LLM Adapter (for testing)
// =============================================================================

/**
 * Pattern-based mock implementation for testing.
 * Maps common natural language patterns to Cypher queries.
 */
export class MockLlmAdapter implements LlmAdapter {
  private readonly patterns: Array<{
    regex: RegExp;
    generator: (match: RegExpMatchArray, dialect: QueryDialect) => LlmGenerateOutput;
  }>;

  constructor() {
    this.patterns = this.initializePatterns();
  }

  async generateQuery(input: LlmGenerateInput): Promise<LlmGenerateOutput> {
    const { userText, dialect, policy } = input;
    const normalizedText = userText.toLowerCase().trim();

    // Try to match against known patterns
    for (const pattern of this.patterns) {
      const match = normalizedText.match(pattern.regex);
      if (match) {
        const result = pattern.generator(match, dialect);
        // Apply policy-based adjustments
        return this.applyPolicyConstraints(result, policy);
      }
    }

    // Fallback: generic query
    return this.generateFallback(userText, dialect, policy);
  }

  async healthCheck(): Promise<{ healthy: boolean; latencyMs?: number }> {
    return { healthy: true, latencyMs: 10 };
  }

  private initializePatterns(): Array<{
    regex: RegExp;
    generator: (match: RegExpMatchArray, dialect: QueryDialect) => LlmGenerateOutput;
  }> {
    return [
      // "who is connected to X"
      {
        regex: /who\s+is\s+connected\s+to\s+["']?([^"'?]+)["']?/i,
        generator: (match, dialect) => ({
          query:
            dialect === 'CYPHER'
              ? `MATCH (target:Entity {name: $name})-[r]-(connected:Entity)
RETURN connected.id, connected.name, connected.type, type(r) as relationship
ORDER BY connected.name
LIMIT $limit`
              : `SELECT e.id, e.name, e.type, r.type as relationship
FROM entities e
JOIN relationships r ON (r.source_id = e.id OR r.target_id = e.id)
WHERE r.source_id = (SELECT id FROM entities WHERE name = $1)
   OR r.target_id = (SELECT id FROM entities WHERE name = $1)
LIMIT $2`,
          explanation: `Find all entities directly connected to "${match[1]}" through any relationship`,
          assumptions: [
            `"${match[1]}" is a known entity in the graph`,
            'Looking for direct connections only (1 hop)',
          ],
          parameters:
            dialect === 'CYPHER'
              ? { name: match[1].trim(), limit: 100 }
              : { $1: match[1].trim(), $2: 100 },
          confidence: 0.9,
        }),
      },

      // "what connects X to Y" / "shortest path between X and Y"
      {
        regex:
          /(?:what\s+connects|shortest\s+path\s+(?:from|between))\s+["']?([^"']+?)["']?\s+(?:to|and)\s+["']?([^"'?]+)["']?/i,
        generator: (match, dialect) => ({
          query:
            dialect === 'CYPHER'
              ? `MATCH (source:Entity {name: $sourceName}),
      (target:Entity {name: $targetName})
MATCH path = shortestPath((source)-[*..6]-(target))
RETURN path, length(path) as pathLength
LIMIT $limit`
              : `WITH RECURSIVE path_cte AS (
  SELECT id, name, ARRAY[id] as path, 0 as depth
  FROM entities WHERE name = $1
  UNION ALL
  SELECT e.id, e.name, p.path || e.id, p.depth + 1
  FROM entities e
  JOIN relationships r ON (r.source_id = e.id OR r.target_id = e.id)
  JOIN path_cte p ON (r.source_id = p.id OR r.target_id = p.id)
  WHERE NOT e.id = ANY(p.path) AND p.depth < 6
)
SELECT * FROM path_cte WHERE name = $2
LIMIT $3`,
          explanation: `Find the shortest path connecting "${match[1]}" to "${match[2]}"`,
          assumptions: [
            `Both "${match[1]}" and "${match[2]}" exist in the graph`,
            'Path length limited to 6 hops for performance',
          ],
          parameters:
            dialect === 'CYPHER'
              ? { sourceName: match[1].trim(), targetName: match[2].trim(), limit: 10 }
              : { $1: match[1].trim(), $2: match[2].trim(), $3: 10 },
          confidence: 0.85,
        }),
      },

      // "find all X" / "show all X" / "list all X" (entity type query)
      {
        regex: /(?:find|show|list)\s+all\s+(\w+)(?:\s+entities)?/i,
        generator: (match, dialect) => {
          const entityType = match[1].toUpperCase();
          return {
            query:
              dialect === 'CYPHER'
                ? `MATCH (n:Entity)
WHERE n.type = $type
RETURN n.id, n.name, n.type, n.properties, n.confidence
ORDER BY n.name
LIMIT $limit`
                : `SELECT id, name, type, properties, confidence
FROM entities
WHERE UPPER(type) = $1
ORDER BY name
LIMIT $2`,
            explanation: `Retrieve all entities of type "${entityType}"`,
            assumptions: [`"${entityType}" is a valid entity type in the schema`],
            parameters:
              dialect === 'CYPHER' ? { type: entityType, limit: 100 } : { $1: entityType, $2: 100 },
            confidence: 0.95,
          };
        },
      },

      // "relationships of/for X" / "show relationships for X"
      {
        regex: /(?:show\s+)?relationships\s+(?:of|for)\s+["']?([^"'?]+)["']?/i,
        generator: (match, dialect) => ({
          query:
            dialect === 'CYPHER'
              ? `MATCH (e:Entity {name: $name})-[r]-(other:Entity)
RETURN e.id as entityId, e.name as entityName,
       type(r) as relationshipType, r.properties as relProperties,
       other.id as connectedId, other.name as connectedName, other.type as connectedType
ORDER BY type(r), other.name
LIMIT $limit`
              : `SELECT e.id as entity_id, e.name as entity_name,
       r.type as relationship_type, r.properties as rel_properties,
       o.id as connected_id, o.name as connected_name, o.type as connected_type
FROM entities e
JOIN relationships r ON (r.source_id = e.id OR r.target_id = e.id)
JOIN entities o ON (o.id = CASE WHEN r.source_id = e.id THEN r.target_id ELSE r.source_id END)
WHERE e.name = $1
ORDER BY r.type, o.name
LIMIT $2`,
          explanation: `Show all relationships for the entity "${match[1]}"`,
          assumptions: [`"${match[1]}" exists in the graph`],
          parameters:
            dialect === 'CYPHER'
              ? { name: match[1].trim(), limit: 100 }
              : { $1: match[1].trim(), $2: 100 },
          confidence: 0.9,
        }),
      },

      // "count X" / "how many X"
      {
        regex: /(?:count|how\s+many)\s+(\w+)(?:\s+entities)?/i,
        generator: (match, dialect) => {
          const entityType = match[1].toUpperCase();
          return {
            query:
              dialect === 'CYPHER'
                ? `MATCH (n:Entity)
WHERE n.type = $type
RETURN count(n) as count`
                : `SELECT COUNT(*) as count FROM entities WHERE UPPER(type) = $1`,
            explanation: `Count the number of "${entityType}" entities`,
            assumptions: [`"${entityType}" is a valid entity type`],
            parameters: dialect === 'CYPHER' ? { type: entityType } : { $1: entityType },
            confidence: 0.95,
          };
        },
      },

      // "entities in investigation X"
      {
        regex: /entities\s+in\s+(?:investigation|inv)\s+["']?([^"'?]+)["']?/i,
        generator: (match, dialect) => ({
          query:
            dialect === 'CYPHER'
              ? `MATCH (i:Investigation {id: $investigationId})-[:CONTAINS]->(e:Entity)
RETURN e.id, e.name, e.type, e.confidence
ORDER BY e.type, e.name
LIMIT $limit`
              : `SELECT e.id, e.name, e.type, e.confidence
FROM entities e
JOIN investigation_entities ie ON ie.entity_id = e.id
WHERE ie.investigation_id = $1
ORDER BY e.type, e.name
LIMIT $2`,
          explanation: `List all entities in investigation "${match[1]}"`,
          assumptions: [`Investigation "${match[1]}" exists`],
          parameters:
            dialect === 'CYPHER'
              ? { investigationId: match[1].trim(), limit: 100 }
              : { $1: match[1].trim(), $2: 100 },
          confidence: 0.9,
        }),
      },

      // "most connected entities" / "central entities"
      {
        regex: /(?:most\s+connected|central|influential)\s+entities/i,
        generator: (_, dialect) => ({
          query:
            dialect === 'CYPHER'
              ? `MATCH (e:Entity)-[r]-()
WITH e, count(r) as connectionCount
RETURN e.id, e.name, e.type, connectionCount
ORDER BY connectionCount DESC
LIMIT $limit`
              : `SELECT e.id, e.name, e.type,
       (SELECT COUNT(*) FROM relationships r
        WHERE r.source_id = e.id OR r.target_id = e.id) as connection_count
FROM entities e
ORDER BY connection_count DESC
LIMIT $1`,
          explanation: 'Find the most connected entities by relationship count (degree centrality)',
          assumptions: ['Using degree centrality as the measure of connectedness'],
          parameters: dialect === 'CYPHER' ? { limit: 20 } : { $1: 20 },
          confidence: 0.85,
        }),
      },

      // "neighbors of X within N hops"
      {
        regex: /neighbors\s+of\s+["']?([^"']+)["']?\s+within\s+(\d+)\s+hops?/i,
        generator: (match, dialect) => {
          const depth = Math.min(parseInt(match[2], 10), 6);
          return {
            query:
              dialect === 'CYPHER'
                ? `MATCH (start:Entity {name: $name})
MATCH path = (start)-[*1..${depth}]-(neighbor:Entity)
WHERE neighbor <> start
RETURN DISTINCT neighbor.id, neighbor.name, neighbor.type,
       min(length(path)) as minDistance
ORDER BY minDistance, neighbor.name
LIMIT $limit`
                : `WITH RECURSIVE neighbors AS (
  SELECT id, name, type, 0 as distance
  FROM entities WHERE name = $1
  UNION
  SELECT e.id, e.name, e.type, n.distance + 1
  FROM entities e
  JOIN relationships r ON (r.source_id = e.id OR r.target_id = e.id)
  JOIN neighbors n ON (r.source_id = n.id OR r.target_id = n.id)
  WHERE n.distance < $2 AND e.id != n.id
)
SELECT DISTINCT id, name, type, MIN(distance) as min_distance
FROM neighbors WHERE distance > 0
GROUP BY id, name, type
ORDER BY min_distance, name
LIMIT $3`,
            explanation: `Find all entities within ${depth} hops of "${match[1]}"`,
            assumptions: [`"${match[1]}" exists in the graph`, `Depth limited to ${depth} hops`],
            parameters:
              dialect === 'CYPHER'
                ? { name: match[1].trim(), limit: 100 }
                : { $1: match[1].trim(), $2: depth, $3: 100 },
            confidence: 0.85,
          };
        },
      },
    ];
  }

  private applyPolicyConstraints(
    result: LlmGenerateOutput,
    policy: PolicyContext,
  ): LlmGenerateOutput {
    // Ensure LIMIT is within policy bounds
    if (result.parameters.limit && typeof result.parameters.limit === 'number') {
      result.parameters.limit = Math.min(result.parameters.limit, policy.maxRows);
    }

    // Add assumption about policy constraints
    if (!result.assumptions.some((a) => a.includes('policy'))) {
      result.assumptions.push(`Query respects policy limits (max ${policy.maxRows} rows)`);
    }

    return result;
  }

  private generateFallback(
    userText: string,
    dialect: QueryDialect,
    policy: PolicyContext,
  ): LlmGenerateOutput {
    // Default: return entities matching a search term
    const searchTermMatch = userText.match(/["']([^"']+)["']|(\w{3,})/);
    const searchTerm = searchTermMatch?.[1] || searchTermMatch?.[2] || userText.substring(0, 20);

    return {
      query:
        dialect === 'CYPHER'
          ? `MATCH (n:Entity)
WHERE n.name CONTAINS $searchTerm OR n.description CONTAINS $searchTerm
RETURN n.id, n.name, n.type, n.properties
ORDER BY n.name
LIMIT $limit`
          : `SELECT id, name, type, properties
FROM entities
WHERE name ILIKE '%' || $1 || '%' OR description ILIKE '%' || $1 || '%'
ORDER BY name
LIMIT $2`,
      explanation: `Search for entities matching "${searchTerm}" (fallback query)`,
      assumptions: [
        'Could not determine specific query intent',
        'Performing a general text search across entity names and descriptions',
      ],
      parameters:
        dialect === 'CYPHER'
          ? { searchTerm, limit: Math.min(50, policy.maxRows) }
          : { $1: searchTerm, $2: Math.min(50, policy.maxRows) },
      confidence: 0.4, // Low confidence for fallback
    };
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createLlmAdapter(type: 'mock' | 'openai' | 'anthropic' = 'mock'): LlmAdapter {
  switch (type) {
    case 'mock':
      return new MockLlmAdapter();
    case 'openai':
    case 'anthropic':
      // TODO: Implement real LLM adapters
      throw new Error(`LLM adapter type "${type}" not yet implemented`);
    default:
      return new MockLlmAdapter();
  }
}
