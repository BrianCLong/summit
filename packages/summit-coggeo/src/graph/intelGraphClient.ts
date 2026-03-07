export interface GraphEdge {
  type: string;
  from: string;
  to: string;
  data?: Record<string, unknown>;
}

export interface GraphNode<T = any> {
  id: string;
  type: string;
  data: T;
}

export interface IntelGraphClient {
  getNode<T = any>(id: string): Promise<GraphNode<T> | null>;
  getNodeBatch<T = any>(ids: string[]): Promise<Array<GraphNode<T>>>;
  getOutgoingEdges(from: string, type?: string): Promise<GraphEdge[]>;
}
