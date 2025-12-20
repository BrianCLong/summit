import { runCypher } from './neo4j.js';

/**
 * Calculates Degree Centrality for nodes within a tenant.
 * Higher degree indicates higher immediate influence.
 */
export async function calculateDegreeCentrality(tenantId: string, limit: number = 100) {
  const cypher = `
    MATCH (n)
    WHERE n.tenantId = $tenantId
    WITH n, size((n)--()) AS degree
    ORDER BY degree DESC
    LIMIT toInteger($limit)
    RETURN n.id AS id, n.name AS name, labels(n) AS labels, degree
  `;
  return runCypher(cypher, { tenantId, limit });
}

/**
 * Finds the shortest path between two nodes.
 */
export async function findShortestPath(tenantId: string, startNodeId: string, endNodeId: string) {
  const cypher = `
    MATCH (start {id: $startNodeId, tenantId: $tenantId}), (end {id: $endNodeId, tenantId: $tenantId})
    MATCH path = shortestPath((start)-[*..10]-(end))
    RETURN [node in nodes(path) | {id: node.id, name: node.name, labels: labels(node)}] AS nodes,
           [rel in relationships(path) | {type: type(rel), properties: properties(rel)}] AS relationships,
           length(path) AS length
  `;
  return runCypher(cypher, { tenantId, startNodeId, endNodeId });
}

/**
 * Detects communities using a simplified Label Propagation algorithm simulation.
 * Note: This is a "read-only" analysis version that returns projected communities
 * based on neighbor majority, rather than writing back to the graph.
 */
export async function detectCommunities(tenantId: string) {
  // This is a simplified 1-hop look to see which nodes are tightly coupled
  // It returns nodes grouped by their most frequent neighbor label/group
  // Since we can't easily run full LPA without GDS, we'll use a heuristic:
  // Nodes are part of a "community" defined by their highest degree neighbor or
  // simply clustering by shared connections.

  // A better pure-Cypher approach for "Community" is finding Triangles (Clustering Coefficient)
  // or simply returning connected components if the graph is sparse.

  // Let's implement a Triangle Count / Clustering Coefficient metric as it relates to community density.
  const cypher = `
    MATCH (n)
    WHERE n.tenantId = $tenantId
    WITH n
    MATCH (n)-[]-(m)
    WHERE m.tenantId = $tenantId
    WITH n, count(distinct m) AS degree, collect(distinct m) AS neighbors
    UNWIND neighbors AS m
    MATCH (m)-[]-(k)
    WHERE k IN neighbors
    WITH n, degree, count(distinct k) AS triangles
    // Local Clustering Coefficient = triangles / (degree * (degree - 1)) (for directed, or /2 for undirected)
    // We'll simplify to a "Cluster Score"
    RETURN n.id AS id, n.name AS name, degree, triangles,
           CASE WHEN degree > 1 THEN toFloat(triangles) / (degree * (degree - 1)) ELSE 0.0 END AS clusteringCoefficient
    ORDER BY clusteringCoefficient DESC
    LIMIT 100
  `;
  return runCypher(cypher, { tenantId });
}

/**
 * Calculates Betweenness Centrality approximation.
 * Identifying nodes that act as bridges between dense clusters.
 */
export async function calculateBetweenness(tenantId: string) {
  // Pure Cypher exact betweenness is O(N^3) or worse without GDS.
  // We will approximate "Bridging" nodes: Nodes that connect otherwise disconnected subgraphs
  // or have high "structural holes" constraint.

  // A cheaper proxy is to find nodes that are on many shortest paths between a random sample of nodes.
  // Or we can look for "Gatekeepers": Nodes with high degree but low clustering coefficient.
  const cypher = `
    MATCH (n)
    WHERE n.tenantId = $tenantId
    // Calculate Degree
    MATCH (n)-[]-(m)
    WHERE m.tenantId = $tenantId
    WITH n, count(distinct m) AS degree, collect(distinct m) AS neighbors
    WHERE degree > 2
    // Calculate Triangles among neighbors
    UNWIND neighbors AS m
    MATCH (m)-[]-(k)
    WHERE k IN neighbors
    WITH n, degree, count(distinct k) AS triangles
    // Betweenness Proxy: High Degree + Low Clustering Coefficient = Bridge/Hub
    WITH n, degree, triangles,
         CASE WHEN degree > 1 THEN toFloat(triangles) / (degree * (degree - 1)) ELSE 0.0 END AS clusteringCoeff
    WITH n, degree, clusteringCoeff, (degree * (1 - clusteringCoeff)) AS bridgeScore
    ORDER BY bridgeScore DESC
    LIMIT 50
    RETURN n.id AS id, n.name AS name, degree, clusteringCoeff, bridgeScore
  `;
  return runCypher(cypher, { tenantId });
}

/**
 * Influence Operations: Coordinated Behavior Detection.
 * Detects groups of actors posting/acting on the same targets within a time window.
 */
export async function analyzeCoordinatedBehavior(tenantId: string, timeWindowMinutes: number = 60) {
    // Find actors who acted on the same target within a short time window
    const cypher = `
      MATCH (a1:Entity)-[r1:ACTED_ON]->(target)<-[r2:ACTED_ON]-(a2:Entity)
      WHERE a1.tenantId = $tenantId AND a2.tenantId = $tenantId
        AND a1.id <> a2.id
        AND abs(duration.inSeconds(r1.timestamp, r2.timestamp).seconds) < ($timeWindowMinutes * 60)
      WITH a1, a2, count(distinct target) AS sharedTargets
      WHERE sharedTargets >= 3
      RETURN a1.name AS actor1, a2.name AS actor2, sharedTargets
      ORDER BY sharedTargets DESC
      LIMIT 50
    `;
    return runCypher(cypher, { tenantId, timeWindowMinutes });
}
