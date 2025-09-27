export interface MetricTemplate {
  key: string;
  name: string;
  description: string;
  cypher: string;
  defaultParameters?: Record<string, unknown>;
  recommendedTtlSeconds: number;
}

export const metricTemplates: MetricTemplate[] = [
  {
    key: 'topNodeDegree',
    name: 'Top Node Degree',
    description:
      'Returns the highest degree nodes for a tenant scoped optionally by investigation. Useful for identifying hubs.',
    cypher: `
      MATCH (n:Entity { tenantId: $tenantId })
      WHERE $investigationId IS NULL OR n.investigationId = $investigationId
      OPTIONAL MATCH (n)--(m)
      WITH n, count(m) AS degree
      RETURN n.id AS nodeId, n.kind AS kind, degree
      ORDER BY degree DESC
      LIMIT coalesce($limit, 25)
    `,
    defaultParameters: { limit: 25 },
    recommendedTtlSeconds: 300,
  },
  {
    key: 'averageClusteringCoefficient',
    name: 'Average Clustering Coefficient',
    description:
      'Estimates the clustering coefficient per node and returns the network average to quantify local density.',
    cypher: `
      MATCH (n:Entity { tenantId: $tenantId })
      WHERE $investigationId IS NULL OR n.investigationId = $investigationId
      OPTIONAL MATCH (n)--(nbr:Entity)
      WITH n, collect(DISTINCT nbr) AS neighbors
      WITH n, neighbors, size(neighbors) AS degree
      WHERE degree > 1
      UNWIND neighbors AS n1
      UNWIND neighbors AS n2
      WITH n, degree, n1, n2
      WHERE id(n1) < id(n2)
      MATCH (n1)--(n2)
      WITH n, degree, count(*) AS closedTriplets
      WITH avg( CASE
        WHEN degree <= 1 THEN 0
        ELSE toFloat(closedTriplets) / (degree * (degree - 1) / 2)
      END ) AS coefficient
      RETURN round(coefficient * 1000) / 1000 AS clusteringCoefficient
    `,
    recommendedTtlSeconds: 900,
  },
  {
    key: 'averagePathLength',
    name: 'Average Shortest Path Length',
    description:
      'Approximates the average shortest path length across sampled nodes to understand traversal distance.',
    cypher: `
      MATCH (start:Entity { tenantId: $tenantId })
      WHERE $investigationId IS NULL OR start.investigationId = $investigationId
      WITH start LIMIT coalesce($sampleSize, 50)
      MATCH (start)-[*..4]-(target:Entity { tenantId: $tenantId })
      WHERE $investigationId IS NULL OR target.investigationId = $investigationId
      WITH start, target, min(length(shortestPath((start)-[*..4]-(target)))) AS hops
      WHERE hops IS NOT NULL AND hops > 0
      RETURN round(avg(hops) * 1000) / 1000 AS averagePathLength
    `,
    defaultParameters: { sampleSize: 50 },
    recommendedTtlSeconds: 900,
  },
];

export default metricTemplates;
