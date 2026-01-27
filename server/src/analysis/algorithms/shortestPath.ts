import { Graph, NodeId, GraphEdge } from '../graphTypes.ts';

export interface PathResult {
  path: NodeId[] | null;
  distance: number;
  edges: GraphEdge[];
}

// Unweighted shortest path (BFS)
export function shortestPath(
  graph: Graph,
  sourceId: NodeId,
  targetId: NodeId,
  maxDepth: number = 100
): PathResult {
  if (sourceId === targetId) {
    return { path: [sourceId], distance: 0, edges: [] };
  }

  // Build adjacency list storing edges for retrieval
  const adj = new Map<NodeId, { target: NodeId, edge: GraphEdge }[]>();
  graph.nodes.forEach(n => adj.set(n.id, []));
  graph.edges.forEach(e => {
     if (!adj.has(e.source)) adj.set(e.source, []);
     adj.get(e.source)?.push({ target: e.target, edge: e });
  });

  const queue: { id: NodeId; dist: number; path: NodeId[]; edges: GraphEdge[] }[] = [{ id: sourceId, dist: 0, path: [sourceId], edges: [] }];
  const visited = new Set<NodeId>([sourceId]);

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.id === targetId) {
      return {
        path: current.path,
        distance: current.dist,
        edges: current.edges
      };
    }

    if (current.dist >= maxDepth) continue;

    const neighbors = adj.get(current.id) || [];
    for (const { target, edge } of neighbors) {
      if (!visited.has(target)) {
        visited.add(target);
        queue.push({
          id: target,
          dist: current.dist + 1,
          path: [...current.path, target],
          edges: [...current.edges, edge]
        });
      }
    }
  }

  return { path: null, distance: -1, edges: [] };
}
