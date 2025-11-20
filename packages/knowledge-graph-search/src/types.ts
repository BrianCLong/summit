/**
 * Types for knowledge graph search
 */

export interface GraphNode {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

export interface GraphRelationship {
  id: string;
  type: string;
  startNode: string;
  endNode: string;
  properties: Record<string, any>;
}

export interface GraphPath {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
  length: number;
}

export interface GraphPattern {
  nodes: Array<{
    variable: string;
    labels?: string[];
    properties?: Record<string, any>;
  }>;
  relationships: Array<{
    variable?: string;
    type?: string;
    direction?: 'outgoing' | 'incoming' | 'both';
    startNode: string;
    endNode: string;
    properties?: Record<string, any>;
  }>;
}

export interface TraversalOptions {
  maxDepth?: number;
  direction?: 'outgoing' | 'incoming' | 'both';
  relationshipTypes?: string[];
  nodeLabels?: string[];
  uniqueness?: 'node' | 'relationship' | 'none';
  limit?: number;
}

export interface GraphSearchResult {
  nodes: GraphNode[];
  relationships: GraphRelationship[];
  paths?: GraphPath[];
  metadata?: {
    executionTime: number;
    resultCount: number;
    queryType: string;
  };
}

export interface CypherQuery {
  query: string;
  parameters?: Record<string, any>;
}

export interface SPARQLQuery {
  query: string;
  endpoint?: string;
}
