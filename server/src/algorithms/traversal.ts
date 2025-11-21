import { runCypher } from '../graph/neo4j';

export interface GraphPath {
  start: any;
  end: any;
  segments: {
    start: any;
    relationship: any;
    end: any;
  }[];
  length: number;
}

function validateIdentifier(identifier: string): void {
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
    throw new Error(`Invalid identifier: ${identifier}`);
  }
}

/**
 * Finds the shortest path between two nodes.
 * @param startNodeId The ID (internal or property) of the start node.
 * @param endNodeId The ID (internal or property) of the end node.
 * @param idProperty The property name used for IDs (default: 'id'). Use null for internal Neo4j ID.
 */
export async function findShortestPath(
  startNodeId: string | number,
  endNodeId: string | number,
  idProperty: string = 'id',
  maxDepth: number = 15
): Promise<GraphPath | null> {
  let matchClause;

  // Validate maxDepth to ensure it's a safe integer
  if (!Number.isInteger(maxDepth) || maxDepth < 1) {
     throw new Error("maxDepth must be a positive integer");
  }

  if (idProperty) {
    validateIdentifier(idProperty);
    matchClause = `
      MATCH (start {${idProperty}: $startNodeId}), (end {${idProperty}: $endNodeId})
    `;
  } else {
    matchClause = `
      MATCH (start), (end)
      WHERE id(start) = $startNodeId AND id(end) = $endNodeId
    `;
  }

  const query = `
    ${matchClause}
    MATCH p = shortestPath((start)-[*..${maxDepth}]-(end))
    RETURN p
  `;

  const result = await runCypher(query, { startNodeId, endNodeId });

  if (result.length === 0) {
    return null;
  }

  return result[0].p as GraphPath;
}

/**
 * Finds all simple paths between two nodes up to a certain depth.
 */
export async function findAllPaths(
  startNodeId: string | number,
  endNodeId: string | number,
  idProperty: string = 'id',
  maxDepth: number = 5,
  limit: number = 100
): Promise<GraphPath[]> {
  let matchClause;

  // Validate inputs
  if (!Number.isInteger(maxDepth) || maxDepth < 1) throw new Error("maxDepth must be a positive integer");
  if (!Number.isInteger(limit) || limit < 1) throw new Error("limit must be a positive integer");

  if (idProperty) {
    validateIdentifier(idProperty);
    matchClause = `
      MATCH (start {${idProperty}: $startNodeId}), (end {${idProperty}: $endNodeId})
    `;
  } else {
    matchClause = `
      MATCH (start), (end)
      WHERE id(start) = $startNodeId AND id(end) = $endNodeId
    `;
  }

  const query = `
    ${matchClause}
    MATCH p = (start)-[*..${maxDepth}]-(end)
    RETURN p
    LIMIT $limit
  `;

  const result = await runCypher(query, { startNodeId, endNodeId, limit });

  return result.map((r) => r.p as GraphPath);
}
