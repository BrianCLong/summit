// Summit Graph Analytics projection bootstrap
// Ensures a reusable named graph exists for PageRank and community detection workloads

CALL {
  WITH 'summit_analytics_global' AS graphName
  CALL gds.graph.exists(graphName)
  YIELD exists
  WITH graphName, exists
  CALL apoc.do.when(
    exists,
    'CALL gds.graph.drop($graphName, false) YIELD graphName RETURN graphName',
    'RETURN $graphName AS graphName',
    { graphName: graphName }
  ) YIELD value
  RETURN graphName
}
CALL gds.graph.project.cypher(
  'summit_analytics_global',
  'MATCH (n:Entity)
   RETURN id(n) AS id, labels(n) AS labels, { id: n.id, label: n.label, investigationId: n.investigation_id } AS properties',
  'MATCH (n:Entity)-[r]->(m:Entity)
   RETURN id(n) AS source, id(m) AS target, type(r) AS type',
  {
    validateRelationships: false,
    batchSize: 100000
  }
)
YIELD graphName
RETURN graphName;
