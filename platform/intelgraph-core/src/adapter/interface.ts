import { GraphNode, GraphEdge } from '../types.js';

export interface GraphPersistenceAdapter {
  addNode(node: GraphNode): Promise<void>;
  addEdge(edge: GraphEdge): Promise<void>;
  getNode(id: string): Promise<GraphNode | undefined>;
  getEdgesFrom(nodeId: string, type?: string): Promise<GraphEdge[]>;
  getEdgesTo(nodeId: string, type?: string): Promise<GraphEdge[]>;
  queryNodes(label: string, propertyFilter?: Record<string, any>): Promise<GraphNode[]>;
}
