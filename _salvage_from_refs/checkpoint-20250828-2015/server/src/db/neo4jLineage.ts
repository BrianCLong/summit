/**
 * Cypher query to create a DataAsset node and link it to its sources.
 * This forms the core of the data lineage graph.
 */
export const CREATE_LINEAGE_EDGE_QUERY = `
  // Create or update the data asset node itself
  MERGE (a:DataAsset { id: $assetId, tenantId: $tenantId })
  SET 
    a.kind = $kind, 
    a.sha256 = $sha, 
    a.createdAt = timestamp(),
    a.name = $name,
    a.s3_key = $s3_key
  WITH a

  // For each source asset ID provided, find the source node and create the lineage edge
  UNWIND $sources AS sourceId
    MATCH (src:DataAsset { id: sourceId, tenantId: $tenantId })
    MERGE (a)-[:PRODUCED_FROM { ts: timestamp() }]->(src)
`;

/**
 * Cypher query to retrieve the lineage for a given asset.
 */
export const GET_LINEAGE_QUERY = `
  MATCH (startNode:DataAsset { id: $assetId, tenantId: $tenantId })
  // Find both incoming and outgoing relationships up to 5 levels deep
  CALL apoc.path.subgraphNodes(startNode, { maxLevel: 5, relationshipFilter: 'PRODUCED_FROM>' })
  YIELD node
  RETURN node;
`;
