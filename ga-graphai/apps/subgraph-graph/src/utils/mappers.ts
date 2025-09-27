import neo4j from 'neo4j-driver';

const { isInt } = neo4j;

export interface GraphNode {
  id: string;
  labels: string[];
  properties: Record<string, unknown>;
}

export interface GraphRelationship {
  id: string;
  type: string;
  startId: string;
  endId: string;
  properties: Record<string, unknown>;
}

export interface NeighborhoodResult {
  node: GraphNode;
  neighbors: GraphNode[];
  edges: GraphRelationship[];
  pageInfo: PageInfo;
}

export interface PathConnection {
  paths: GraphPath[];
  pageInfo: PageInfo;
}

export interface GraphPath {
  nodes: GraphNode[];
  edges: GraphRelationship[];
}

export interface PageInfo {
  endCursor: string | null;
  hasNextPage: boolean;
}

type Neo4jNode = neo4j.Node;
type Neo4jRelationship = neo4j.Relationship;

export function toGraphNode(node: Neo4jNode): GraphNode {
  return {
    id: String(node.properties.id ?? node.elementId),
    labels: node.labels,
    properties: normalizeProperties(node.properties)
  };
}

export function toGraphRelationship(rel: Neo4jRelationship): GraphRelationship {
  return {
    id: String(rel.properties.id ?? rel.elementId ?? `${rel.startNodeElementId}-${rel.endNodeElementId}`),
    type: rel.type,
    startId: rel.startNodeElementId,
    endId: rel.endNodeElementId,
    properties: normalizeProperties(rel.properties)
  };
}

export function normalizeProperties(properties: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties ?? {})) {
    normalized[key] = normalizeValue(value);
  }
  return normalized;
}

function normalizeValue(value: unknown): unknown {
  if (isInt(value)) {
    try {
      return (value as neo4j.Integer).toNumber();
    } catch (error) {
      return Number.parseFloat((value as neo4j.Integer).toString());
    }
  }
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }
  if (value && typeof value === 'object') {
    if (value instanceof Date) {
      return value.toISOString();
    }
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      output[key] = normalizeValue(nested);
    }
    return output;
  }
  return value;
}
