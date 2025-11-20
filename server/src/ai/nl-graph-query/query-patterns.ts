/**
 * Query Patterns - Cookbook of common graph query patterns
 *
 * These patterns handle common query types from the Query Cookbook:
 * - Time-travel queries
 * - Policy-aware queries
 * - Geo-temporal queries
 * - Narrative/timeline queries
 * - Course of Action (COA) queries
 */

import type { QueryPattern, SchemaContext } from './types';

/**
 * Helper to add tenant filtering if context includes tenantId
 */
function addTenantFilter(cypher: string, context: SchemaContext): string {
  if (!context.tenantId) return cypher;

  // Add tenant filter to WHERE clause or create one
  if (cypher.includes('WHERE')) {
    return cypher.replace(/WHERE/, `WHERE n.tenantId = $tenantId AND`);
  } else if (cypher.includes('RETURN')) {
    return cypher.replace(/RETURN/, `WHERE n.tenantId = $tenantId RETURN`);
  }

  return cypher;
}

/**
 * Helper to add policy label filtering
 */
function addPolicyFilter(
  cypher: string,
  context: SchemaContext,
  classification?: string,
): string {
  if (!context.policyTags || context.policyTags.length === 0) return cypher;

  // Filter by classification if specified
  const tags = classification
    ? context.policyTags.filter((t) => t.classification === classification)
    : context.policyTags;

  if (tags.length === 0) return cypher;

  const labels = tags.map((t) => `'${t.label}'`).join(', ');
  const labelFilter = `labels(n)[0] IN [${labels}]`;

  if (cypher.includes('WHERE')) {
    return cypher.replace(/WHERE/, `WHERE ${labelFilter} AND`);
  } else if (cypher.includes('RETURN')) {
    return cypher.replace(/RETURN/, `WHERE ${labelFilter} RETURN`);
  }

  return cypher;
}

/**
 * Query patterns for common natural language queries
 */
export const queryPatterns: QueryPattern[] = [
  // Basic node listing
  {
    name: 'list-all-nodes',
    pattern: /(?:show|list|get|find)\s+(?:all\s+)?nodes?/i,
    generator: (match, context) => {
      let cypher = 'MATCH (n) RETURN n LIMIT 25';
      cypher = addTenantFilter(cypher, context);
      return cypher;
    },
    expectedCost: 'low',
    description: 'Lists nodes in the graph with pagination',
  },

  // Count queries
  {
    name: 'count-nodes',
    pattern: /(?:count|how many)\s+(?:all\s+)?nodes?/i,
    generator: (match, context) => {
      let cypher = 'MATCH (n) RETURN count(n) AS nodeCount';
      cypher = addTenantFilter(cypher, context);
      return cypher;
    },
    expectedCost: 'low',
    description: 'Counts total nodes in the graph',
  },

  // Relationship queries
  {
    name: 'find-relationships',
    pattern: /(?:show|find|get)\s+(?:all\s+)?relationships?/i,
    generator: (match, context) => {
      let cypher =
        'MATCH (a)-[r]->(b) RETURN a, r, b LIMIT 50';
      cypher = addTenantFilter(cypher, context);
      return cypher;
    },
    expectedCost: 'medium',
    description: 'Shows relationships between nodes',
  },

  // Time-travel queries
  {
    name: 'time-travel-snapshot',
    pattern: /(?:show|get|find)\s+(?:graph|network|state)\s+(?:at|on|as of)\s+(.+)/i,
    generator: (match, context) => {
      const timeRef = match[1];
      let cypher = `
MATCH (n)
WHERE n.validFrom <= $timestamp AND (n.validTo IS NULL OR n.validTo > $timestamp)
OPTIONAL MATCH (n)-[r]->(m)
WHERE r.validFrom <= $timestamp AND (r.validTo IS NULL OR r.validTo > $timestamp)
RETURN n, r, m
LIMIT 100
      `.trim();
      cypher = addTenantFilter(cypher, context);
      return cypher;
    },
    expectedCost: 'medium',
    description: 'Retrieves graph state at a specific point in time',
  },

  // Time-travel with changes
  {
    name: 'time-travel-changes',
    pattern: /(?:show|get|find)\s+(?:changes|modifications|updates)\s+(?:between|from)\s+(.+)\s+(?:to|and)\s+(.+)/i,
    generator: (match, context) => {
      let cypher = `
MATCH (n)
WHERE (n.validFrom >= $startTime AND n.validFrom <= $endTime)
   OR (n.validTo >= $startTime AND n.validTo <= $endTime)
RETURN n, n.validFrom AS changedAt,
       CASE
         WHEN n.validFrom >= $startTime AND n.validFrom <= $endTime THEN 'created'
         WHEN n.validTo >= $startTime AND n.validTo <= $endTime THEN 'deleted'
         ELSE 'modified'
       END AS changeType
ORDER BY n.validFrom DESC
LIMIT 100
      `.trim();
      cypher = addTenantFilter(cypher, context);
      return cypher;
    },
    expectedCost: 'medium',
    description: 'Shows changes to the graph between two timestamps',
  },

  // Policy-aware queries
  {
    name: 'policy-filtered-entities',
    pattern: /(?:show|find|get)\s+(?:all\s+)?(.+)\s+(?:with|having)\s+(?:classification|clearance|policy)\s+(.+)/i,
    generator: (match, context) => {
      const entityType = match[1];
      const classification = match[2];
      let cypher = `MATCH (n:${entityType}) RETURN n LIMIT 50`;
      cypher = addPolicyFilter(cypher, context, classification);
      cypher = addTenantFilter(cypher, context);
      return cypher;
    },
    expectedCost: 'low',
    description: 'Retrieves entities filtered by policy classification',
  },

  // Geo-temporal queries
  {
    name: 'geo-temporal-entities',
    pattern: /(?:show|find|get)\s+(?:entities|nodes)\s+(?:near|around|within)\s+(.+)\s+(?:at|on|during)\s+(.+)/i,
    generator: (match, context) => {
      const location = match[1];
      const time = match[2];
      let cypher = `
MATCH (n)
WHERE n.latitude IS NOT NULL
  AND n.longitude IS NOT NULL
  AND point.distance(
    point({latitude: n.latitude, longitude: n.longitude}),
    point({latitude: $lat, longitude: $lon})
  ) <= $radiusMeters
  AND n.observedAt >= $startTime
  AND n.observedAt <= $endTime
RETURN n,
       point.distance(
         point({latitude: n.latitude, longitude: n.longitude}),
         point({latitude: $lat, longitude: $lon})
       ) AS distanceMeters,
       n.observedAt AS timestamp
ORDER BY distanceMeters ASC
LIMIT 100
      `.trim();
      cypher = addTenantFilter(cypher, context);
      return cypher;
    },
    expectedCost: 'high',
    description: 'Finds entities near a location within a time window',
  },

  // Narrative/timeline queries
  {
    name: 'timeline-events',
    pattern: /(?:show|get|create)\s+(?:timeline|sequence|chronology)\s+(?:of|for)\s+(.+)/i,
    generator: (match, context) => {
      const subject = match[1];
      let cypher = `
MATCH (n)
WHERE n.timestamp IS NOT NULL
OPTIONAL MATCH (n)-[r:PRECEDED_BY|CAUSED_BY|RELATED_TO]->(m)
WHERE m.timestamp IS NOT NULL
RETURN n, r, m, n.timestamp AS eventTime
ORDER BY n.timestamp ASC
LIMIT 200
      `.trim();
      cypher = addTenantFilter(cypher, context);
      return cypher;
    },
    expectedCost: 'medium',
    description: 'Creates a chronological timeline of events',
  },

  // Course of Action (COA) queries
  {
    name: 'coa-path-analysis',
    pattern: /(?:show|find|analyze)\s+(?:paths?|routes?|courses?)\s+(?:from|between)\s+(.+)\s+(?:to|and)\s+(.+)/i,
    generator: (match, context) => {
      let cypher = `
MATCH path = allShortestPaths((start)-[*..8]-(end))
WHERE start.id = $startId AND end.id = $endId
WITH path,
     [node IN nodes(path) | node.type] AS nodeTypes,
     [rel IN relationships(path) | type(rel)] AS relTypes,
     length(path) AS pathLength
RETURN path, nodeTypes, relTypes, pathLength
ORDER BY pathLength ASC
LIMIT 10
      `.trim();
      cypher = addTenantFilter(cypher, context);
      return cypher;
    },
    expectedCost: 'high',
    description: 'Finds and analyzes possible paths (courses of action)',
  },

  // COA with constraints
  {
    name: 'coa-constrained-path',
    pattern: /(?:show|find)\s+paths?\s+(?:that|which)\s+(?:avoid|exclude|must include)\s+(.+)/i,
    generator: (match, context) => {
      const constraint = match[1];
      let cypher = `
MATCH path = (start)-[*..8]-(end)
WHERE start.id = $startId
  AND end.id = $endId
  AND NOT ANY(node IN nodes(path) WHERE node.type IN $excludedTypes)
WITH path,
     [node IN nodes(path) | {id: node.id, type: node.type}] AS pathNodes,
     [rel IN relationships(path) | type(rel)] AS pathRels,
     length(path) AS pathLength
RETURN path, pathNodes, pathRels, pathLength
ORDER BY pathLength ASC
LIMIT 10
      `.trim();
      cypher = addTenantFilter(cypher, context);
      return cypher;
    },
    expectedCost: 'very-high',
    description: 'Finds paths with specific constraints or requirements',
  },

  // Shortest path queries
  {
    name: 'shortest-path',
    pattern: /(?:shortest|quickest)\s+path\s+(?:from|between)\s+(.+)\s+(?:to|and)\s+(.+)/i,
    generator: (match, context) => {
      let cypher = `
MATCH path = shortestPath((start)-[*..10]-(end))
WHERE start.id = $startId AND end.id = $endId
RETURN path, length(path) AS pathLength,
       nodes(path) AS pathNodes,
       relationships(path) AS pathRelationships
      `.trim();
      cypher = addTenantFilter(cypher, context);
      return cypher;
    },
    expectedCost: 'high',
    description: 'Finds the shortest path between two entities',
  },

  // Neighbor queries
  {
    name: 'neighbors',
    pattern: /(?:show|find|get)\s+(?:neighbors|connections|links)\s+(?:of|for)\s+(.+)/i,
    generator: (match, context) => {
      let cypher = `
MATCH (n)-[r]-(neighbor)
WHERE n.id = $nodeId
RETURN n, r, neighbor, type(r) AS relationshipType
LIMIT 100
      `.trim();
      cypher = addTenantFilter(cypher, context);
      return cypher;
    },
    expectedCost: 'low',
    description: 'Shows all neighbors of a specific node',
  },

  // Pattern matching
  {
    name: 'pattern-match',
    pattern: /(?:find|show)\s+(?:pattern|structure)\s+(?:where|with)\s+(.+)/i,
    generator: (match, context) => {
      let cypher = `
MATCH (a)-[r1]->(b)-[r2]->(c)
RETURN a, r1, b, r2, c
LIMIT 50
      `.trim();
      cypher = addTenantFilter(cypher, context);
      return cypher;
    },
    expectedCost: 'medium',
    description: 'Finds graph patterns matching a specific structure',
  },

  // Investigation queries
  {
    name: 'investigation-entities',
    pattern: /(?:show|find|get)\s+(?:all\s+)?(?:entities|nodes)\s+(?:in|for)\s+investigation\s+(.+)/i,
    generator: (match, context) => {
      let cypher = `
MATCH (n)
WHERE n.investigationId = $investigationId
RETURN n, labels(n) AS nodeLabels
LIMIT 500
      `.trim();
      cypher = addTenantFilter(cypher, context);
      return cypher;
    },
    expectedCost: 'medium',
    description: 'Retrieves all entities in a specific investigation',
  },

  // Community detection
  {
    name: 'connected-components',
    pattern: /(?:find|show|detect)\s+(?:communities|clusters|groups|components)/i,
    generator: (match, context) => {
      let cypher = `
MATCH (n)
WITH n
MATCH (n)-[*..3]-(connected)
WITH n, collect(DISTINCT connected) AS community
RETURN n, community, size(community) AS communitySize
ORDER BY communitySize DESC
LIMIT 50
      `.trim();
      cypher = addTenantFilter(cypher, context);
      return cypher;
    },
    expectedCost: 'very-high',
    description: 'Identifies connected components or communities',
  },
];

/**
 * Find a matching query pattern for a given prompt
 */
export function findMatchingPattern(
  prompt: string,
): { pattern: QueryPattern; match: RegExpMatchArray } | null {
  for (const pattern of queryPatterns) {
    const match = prompt.match(pattern.pattern);
    if (match) {
      return { pattern, match };
    }
  }
  return null;
}

/**
 * Generate Cypher from a prompt using pattern matching
 */
export function generateFromPattern(
  prompt: string,
  context: SchemaContext,
): { cypher: string; patternName: string; expectedCost: string } | null {
  const result = findMatchingPattern(prompt);
  if (!result) return null;

  const { pattern, match } = result;
  const cypher = pattern.generator(match, context);

  return {
    cypher,
    patternName: pattern.name,
    expectedCost: pattern.expectedCost,
  };
}
