/**
 * Shared Types for Graph Analytics
 */

/**
 * Basic graph data structure
 */
export interface GraphData {
  nodes: string[];
  edges: Array<{ source: string; target: string; weight?: number }>;
}

/**
 * Extended node with properties
 */
export interface NodeWithProperties {
  id: string;
  label?: string;
  properties?: Record<string, unknown>;
}

/**
 * Extended edge with properties
 */
export interface EdgeWithProperties {
  source: string;
  target: string;
  label?: string;
  weight?: number;
  type?: string;
  properties?: Record<string, unknown>;
}

/**
 * Graph with full metadata for export
 */
export interface ExportableGraph {
  nodes: NodeWithProperties[];
  edges: EdgeWithProperties[];
  metadata?: {
    title?: string;
    description?: string;
    creator?: string;
    directed?: boolean;
  };
}
