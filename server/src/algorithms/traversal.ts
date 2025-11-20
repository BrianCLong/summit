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
  if (idProperty) {
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

  // The result 'p' comes back as a Neo4j Path object structure if we are lucky,
  // or we need to parse it if 'runCypher' converts it.
  // Looking at neo4j.ts, it calls `r.toObject()`.
  // A Path in Neo4j driver `toObject` typically returns { start, end, segments, length }.

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
  if (idProperty) {
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
