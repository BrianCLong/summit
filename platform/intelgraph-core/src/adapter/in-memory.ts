import { GraphPersistenceAdapter } from './interface.js';
import { GraphNode, GraphEdge } from '../types.js';

export class InMemoryGraphAdapter implements GraphPersistenceAdapter {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();

  async addNode(node: GraphNode): Promise<void> {
    this.nodes.set(node.id, node);
  }

  async addEdge(edge: GraphEdge): Promise<void> {
    this.edges.set(edge.id, edge);
  }

  async getNode(id: string): Promise<GraphNode | undefined> {
    return this.nodes.get(id);
  }

  async getEdgesFrom(nodeId: string, type?: string): Promise<GraphEdge[]> {
    return Array.from(this.edges.values()).filter(
      (e) => e.from === nodeId && (!type || e.type === type)
    );
  }

  async getEdgesTo(nodeId: string, type?: string): Promise<GraphEdge[]> {
    return Array.from(this.edges.values()).filter(
      (e) => e.to === nodeId && (!type || e.type === type)
    );
  }

  async queryNodes(label: string, propertyFilter?: Record<string, any>): Promise<GraphNode[]> {
    return Array.from(this.nodes.values()).filter((n) => {
      if (n.label !== label) return false;
      if (propertyFilter) {
        for (const [key, value] of Object.entries(propertyFilter)) {
          if (n.properties[key] !== value) return false;
        }
      }
      return true;
    });
  }
}
