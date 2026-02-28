/**
 * Secure Neo4j Query Builder for INFOWAR Narrative Graph.
 */

import { GraphNode, GraphEdge } from "../ontology/types.js";

/**
 * Builds a Cypher query to upsert a node using parameters.
 */
export function buildUpsertNodeQuery(node: GraphNode): { query: string; params: any } {
  // We use string interpolation for labels because Cypher doesn't support parameterizing them,
  // but we strictly validate the label against allowed NodeType to prevent injection.
  const allowedLabels = ['Narrative', 'Claim', 'Actor', 'Platform', 'Event', 'Artifact', 'Regulation'];
  if (!allowedLabels.includes(node.label)) {
    throw new Error(`Invalid node label: ${node.label}`);
  }

  return {
    query: `MERGE (n:${node.label} { id: $id }) SET n += $properties RETURN n`,
    params: {
      id: node.id,
      properties: node.properties
    }
  };
}

/**
 * Builds a Cypher query to upsert an edge using parameters.
 */
export function buildUpsertEdgeQuery(edge: GraphEdge): { query: string; params: any } {
  const allowedLabels = ['AMPLIFIES', 'REFERENCES', 'TARGETS', 'COUPLED_WITH', 'EVIDENCED_BY', 'PART_OF'];
  if (!allowedLabels.includes(edge.label)) {
    throw new Error(`Invalid edge label: ${edge.label}`);
  }

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
export function buildNarrativeQuery(narrativeId: string): { query: string; params: any } {
  return {
    query: `
      MATCH (n:Narrative { id: $narrativeId })
      OPTIONAL MATCH (n)<-[:PART_OF]-(c:Claim)
      OPTIONAL MATCH (c)-[:EVIDENCED_BY]->(e)
      RETURN n, collect(c) as claims, collect(e) as evidence
    `,
    params: { narrativeId }
  };
}
