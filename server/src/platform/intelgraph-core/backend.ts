export interface GraphNode {
  id: string;
  tenantId: string;
  type: string;
  props: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface GraphEdge {
  id: string;
  tenantId: string;
  fromId: string;
  toId: string;
  type: string;
  props: Record<string, any>;
  createdAt: Date;
}

export interface GraphBackend {
  createNode(node: Omit<GraphNode, 'createdAt' | 'updatedAt'>): Promise<GraphNode>;
  getNode(id: string, tenantId: string): Promise<GraphNode | null>;
  updateNode(id: string, tenantId: string, props: Record<string, any>): Promise<GraphNode | null>;
  createEdge(edge: Omit<GraphEdge, 'createdAt'>): Promise<GraphEdge>;
  getEdges(fromId: string, tenantId: string): Promise<GraphEdge[]>;
  queryNodes(tenantId: string, type?: string, props?: Record<string, any>): Promise<GraphNode[]>;
}
