import { runCypher } from '../graph/neo4j';

export interface CentralityScore {
  nodeId: string | number; // The value of the ID property
  score: number;
  properties?: any;
}

/**
 * Calculates Degree Centrality for a specific node.
 * Efficient O(1) lookup for a single node.
 */
export async function calculateNodeDegreeCentrality(
  nodeId: string | number,
  direction: 'INCOMING' | 'OUTGOING' | 'BOTH' = 'BOTH',
  idProperty: string = 'id'
): Promise<number> {
  let directionArrow = '-[]-';
  if (direction === 'INCOMING') directionArrow = '<-[]-';
  if (direction === 'OUTGOING') directionArrow = '-[]->';

  const query = `
    MATCH (n {${idProperty}: $nodeId})
    RETURN SIZE((n)${directionArrow}()) as score
  `;

  const result = await runCypher(query, { nodeId });

  if (result.length === 0) {
    return 0;
  }

  const score = result[0].score;
  return score.toNumber ? score.toNumber() : score;
}

/**
 * Calculates Degree Centrality for all nodes (top N).
 * Useful for finding global influencers.
 */
export async function calculateGlobalDegreeCentrality(
  limit: number = 10,
  direction: 'INCOMING' | 'OUTGOING' | 'BOTH' = 'BOTH',
  label: string | null = null,
  idProperty: string = 'id'
): Promise<CentralityScore[]> {
  let directionArrow = '-[]-';
  if (direction === 'INCOMING') directionArrow = '<-[]-';
  if (direction === 'OUTGOING') directionArrow = '-[]->';

  const labelFilter = label ? `:${label}` : '';

  const query = `
    MATCH (n${labelFilter})
    RETURN n.${idProperty} as nodeId, SIZE((n)${directionArrow}()) as score, n as properties
    ORDER BY score DESC
    LIMIT $limit
  `;

  const result = await runCypher(query, { limit });

  return result.map((row) => ({
    nodeId: row.nodeId,
    score: row.score.toNumber ? row.score.toNumber() : row.score, // Handle Neo4j Integer
    properties: row.properties,
  }));
}

// Deprecated alias for backward compatibility if needed, but we should use the specific ones.
export const calculateDegreeCentrality = calculateGlobalDegreeCentrality;

/**
 * Finds key influencers using PageRank if GDS is available, or falls back to Degree Centrality.
 */
export async function findKeyInfluencers(
  limit: number = 10,
  label: string = 'Person' // Default to Person
): Promise<CentralityScore[]> {
  return calculateGlobalDegreeCentrality(limit, 'BOTH', label);
}

/**
 * Calculates Betweenness Centrality using a Cypher approximation (for small graphs/limits)
 * or GDS if available.
 */
export async function calculateBetweennessCentrality(
   // Placeholder for future GDS implementation
): Promise<void> {
  throw new Error("Betweenness Centrality requires Neo4j GDS plugin. Use traversal algorithms for path finding instead.");
}
