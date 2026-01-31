import { Graph, GraphNode, NodeId, GraphEdge } from '../graphTypes.js';

type AdjacencyList = Map<NodeId, NodeId[]>;

function buildAdjacencyList(graph: Graph, direction: 'in' | 'out' | 'both' = 'out'): AdjacencyList {
  const adj = new Map<NodeId, NodeId[]>();
  graph.nodes.forEach(node => adj.set(node.id, []));

  graph.edges.forEach(edge => {
    if (direction === 'out' || direction === 'both') {
      if (!adj.has(edge.source)) adj.set(edge.source, []);
      adj.get(edge.source)?.push(edge.target);
    }
    if (direction === 'in' || direction === 'both') {
      if (!adj.has(edge.target)) adj.set(edge.target, []);
      adj.get(edge.target)?.push(edge.source);
    }
  });

  return adj;
}

export interface KHopResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  depths: Record<NodeId, number>;
}

export function kHopNeighborhood(
  graph: Graph,
  sourceNodeId: NodeId,
  k: number,
  direction: 'in' | 'out' | 'both' = 'out'
): KHopResult {
  const adj = buildAdjacencyList(graph, direction);
  const visited = new Set<NodeId>([sourceNodeId]);
  const depths: Record<NodeId, number> = { [sourceNodeId]: 0 };
  const resultNodes = new Set<NodeId>([sourceNodeId]);
  let queue: NodeId[] = [sourceNodeId];

  for (let i = 0; i < k; i++) {
    const nextQueue: NodeId[] = [];
    for (const u of queue) {
      const neighbors = adj.get(u) || [];
      for (const v of neighbors) {
        if (!visited.has(v)) {
          visited.add(v);
          depths[v] = i + 1;
          resultNodes.add(v);
          nextQueue.push(v);
        }
      }
    }
    if (nextQueue.length === 0) break;
    queue = nextQueue;
  }

  // Filter the graph to include only visited nodes and edges between them
  const nodes = graph.nodes.filter(n => resultNodes.has(n.id));
  const edges = graph.edges.filter(e => resultNodes.has(e.source) && resultNodes.has(e.target));

  return { nodes, edges, depths };
}
