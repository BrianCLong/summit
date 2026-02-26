/**
 * Neo4j Query Builder Stubs for INFOWAR Narrative Graph.
 */

import { GraphNode, GraphEdge } from "../ontology/types";

/**
 * Builds a Cypher query to upsert a node.
 */
export function buildUpsertNodeQuery(node: GraphNode): { query: string; params: any } {
  return {
    query: `MERGE (n:${node.label} { id: $id }) SET n += $properties RETURN n`,
    params: {
      id: node.id,
      properties: node.properties
    }
  };
}

/**
 * Builds a Cypher query to upsert an edge.
 */
export function buildUpsertEdgeQuery(edge: GraphEdge): { query: string; params: any } {
  return {
    query: `
      MATCH (a { id: $from })
      MATCH (b { id: $to })
      MERGE (a)-[r:${edge.label}]->(b)
      SET r += $properties
      RETURN r
    `,
    params: {
      from: edge.from,
      to: edge.to,
      properties: edge.properties
    }
  };
}

/**
 * Builds a query to retrieve a narrative and its associated claims and evidence.
 */
export function buildNarrativeQuery(narrativeId: string): string {
  return `
    MATCH (n:Narrative { id: '${narrativeId}' })
    OPTIONAL MATCH (n)<-[:PART_OF]-(c:Claim)
    OPTIONAL MATCH (c)-[:EVIDENCED_BY]->(e)
    RETURN n, collect(c) as claims, collect(e) as evidence
  `;
}
