import { TemporalEdge, TimeScope } from './types.js';

export interface AdjacencyList {
  [nodeId: string]: {
    [neighborId: string]: number;
  };
}

export class DynamicSubgraph {
  static build(edges: TemporalEdge[], scope: TimeScope): AdjacencyList {
    const adj: AdjacencyList = {};

    edges.forEach(edge => {
      const edgeTime = new Date(edge.timestamp);
      if (edgeTime >= scope.start && edgeTime <= scope.end) {
        if (!adj[edge.v1]) adj[edge.v1] = {};
        if (!adj[edge.v2]) adj[edge.v2] = {};

        adj[edge.v1][edge.v2] = (adj[edge.v1][edge.v2] || 0) + 1;
        adj[edge.v2][edge.v1] = (adj[edge.v2][edge.v1] || 0) + 1;
      }
    });

    return adj;
  }

  static getNodes(adj: AdjacencyList): string[] {
    return Object.keys(adj);
  }
}
