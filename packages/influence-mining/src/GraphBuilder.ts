import { Entity, Graph, GraphEdge, RelationshipType } from './types.js';

export class GraphBuilder {
  private readonly nodes = new Map<string, Entity>();
  private readonly edgeMap = new Map<string, GraphEdge>();

  addNode(entity: Entity): void {
    const existing = this.nodes.get(entity.id);
    if (existing) {
      this.nodes.set(entity.id, { ...existing, ...entity });
      return;
    }

    this.nodes.set(entity.id, { ...entity });
  }

  addEdge(
    from: Entity,
    to: Entity,
    weight: number,
    type: RelationshipType = 'interaction',
  ): void {
    if (!this.nodes.has(from.id)) {
      this.addNode(from);
    }
    if (!this.nodes.has(to.id)) {
      this.addNode(to);
    }

    const key = `${from.id}->${to.id}`;
    const existing = this.edgeMap.get(key);
    if (existing) {
      existing.weight += weight;
      if (!existing.types.includes(type)) {
        existing.types.push(type);
      }
      this.edgeMap.set(key, existing);
      return;
    }

    this.edgeMap.set(key, {
      from: from.id,
      to: to.id,
      weight,
      types: [type],
    });
  }

  build(): Graph {
    const adjacency: Record<string, Record<string, number>> = {};
    for (const edge of this.edgeMap.values()) {
      if (!adjacency[edge.from]) {
        adjacency[edge.from] = {};
      }
      adjacency[edge.from][edge.to] = edge.weight;
    }

    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edgeMap.values()).sort((a, b) => {
        if (a.weight === b.weight) {
          return a.to.localeCompare(b.to);
        }
        return b.weight - a.weight;
      }),
      adjacency,
    };
  }
}
