/**
 * KG Explorer Types
 * Type definitions for the Knowledge Graph Explorer component
 */

import type { Node, Edge } from '../../generated/graphql';

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  properties?: Record<string, unknown>;
  confidence?: number;
  description?: string;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label: string;
  confidence?: number;
  properties?: Record<string, unknown>;
}

export interface CytoscapeNode {
  data: {
    id: string;
    label: string;
    type: string;
    confidence?: number;
    description?: string;
    properties?: Record<string, unknown>;
  };
  position?: { x: number; y: number };
  classes?: string;
}

export interface CytoscapeEdge {
  data: {
    id: string;
    source: string;
    target: string;
    label: string;
    type: string;
    confidence?: number;
  };
  classes?: string;
}

export type CytoscapeElement = CytoscapeNode | CytoscapeEdge;

export interface TraversalStep {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  direction: 'incoming' | 'outgoing' | 'both';
  edgeType?: string;
  depth: number;
}

export interface RAGPreview {
  nodeId: string;
  summary: string;
  context: string[];
  relatedConcepts: string[];
  confidence: number;
  sources: RAGSource[];
}

export interface RAGSource {
  id: string;
  title: string;
  snippet: string;
  relevance: number;
  url?: string;
}

export interface LayoutOption {
  name: string;
  label: string;
  icon: string;
  description: string;
}

export interface ExplorerState {
  selectedNode: GraphNode | null;
  selectedEdge: GraphEdge | null;
  hoveredNode: GraphNode | null;
  traversalPath: TraversalStep[];
  layout: string;
  zoom: number;
  isLoading: boolean;
  error: string | null;
}

export interface ExplorerFilters {
  nodeTypes: string[];
  edgeTypes: string[];
  minConfidence: number;
  dateRange?: {
    start: string;
    end: string;
  };
  searchQuery: string;
}

export const NODE_TYPE_COLORS: Record<string, string> = {
  PERSON: '#22c55e',
  ORGANIZATION: '#3b82f6',
  LOCATION: '#f59e0b',
  DOCUMENT: '#a855f7',
  EVENT: '#ef4444',
  ASSET: '#06b6d4',
  THREAT: '#dc2626',
  INDICATOR: '#eab308',
  DEFAULT: '#6b7280',
};

export const LAYOUT_OPTIONS: LayoutOption[] = [
  {
    name: 'fcose',
    label: 'Force-Directed',
    icon: 'scatter',
    description: 'Physics-based layout for organic graph visualization',
  },
  {
    name: 'dagre',
    label: 'Hierarchical',
    icon: 'hierarchy',
    description: 'Top-down tree-like layout for directed graphs',
  },
  {
    name: 'cola',
    label: 'Constraint-Based',
    icon: 'grid',
    description: 'Layout with constraints for clean graph visualization',
  },
  {
    name: 'circle',
    label: 'Circular',
    icon: 'circle',
    description: 'Nodes arranged in a circle',
  },
  {
    name: 'concentric',
    label: 'Concentric',
    icon: 'target',
    description: 'Nodes arranged in concentric circles by centrality',
  },
];

export function transformToGraphNode(node: Node): GraphNode {
  return {
    id: node.id,
    label: node.label,
    type: node.type,
    properties: node.properties as Record<string, unknown> | undefined,
    confidence: node.confidence ?? undefined,
    description: node.description ?? undefined,
    source: node.source ?? undefined,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  };
}

export function transformToGraphEdge(edge: Edge): GraphEdge {
  return {
    id: edge.id,
    source: edge.fromEntityId,
    target: edge.toEntityId,
    type: edge.type,
    label: edge.label,
    confidence: edge.confidence ?? undefined,
    properties: edge.properties as Record<string, unknown> | undefined,
  };
}

export function toCytoscapeElements(
  nodes: GraphNode[],
  edges: GraphEdge[],
): CytoscapeElement[] {
  const cyNodes: CytoscapeNode[] = nodes.map((node) => ({
    data: {
      id: node.id,
      label: node.label,
      type: node.type,
      confidence: node.confidence,
      description: node.description,
      properties: node.properties,
    },
    classes: node.type.toLowerCase(),
  }));

  const cyEdges: CytoscapeEdge[] = edges.map((edge) => ({
    data: {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: edge.type,
      confidence: edge.confidence,
    },
    classes: edge.type.toLowerCase(),
  }));

  return [...cyNodes, ...cyEdges];
}
