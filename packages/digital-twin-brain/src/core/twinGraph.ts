import { TwinEdge, TwinNode } from './types.js';

export class TwinGraph {
  private nodes: Map<string, TwinNode> = new Map();
  private edges: Map<string, TwinEdge> = new Map();

  upsertNode(node: TwinNode): void {
    this.nodes.set(node.id, node);
  }

  upsertEdge(edge: TwinEdge): void {
    if (!this.nodes.has(edge.source) || !this.nodes.has(edge.target)) {
      throw new Error(`Edge references unknown nodes: ${edge.id}`);
    }
    this.edges.set(edge.id, edge);
  }

  getNode(id: string): TwinNode | undefined {
    return this.nodes.get(id);
  }

  neighbors(id: string, relationshipType?: string): TwinNode[] {
    const relevantEdges = Array.from(this.edges.values()).filter(
      (edge) => edge.source === id && (!relationshipType || edge.type === relationshipType)
    );
    return relevantEdges.map((edge) => this.nodes.get(edge.target)).filter(Boolean) as TwinNode[];
  }

  findByType(type: string): TwinNode[] {
    return Array.from(this.nodes.values()).filter((node) => node.type === type);
  }
}
