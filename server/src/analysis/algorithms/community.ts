import { Graph, NodeId, GraphNode } from '../graphTypes.ts';

export interface ConnectedComponentsResult {
  components: GraphNode[][]; // List of components, each component is a list of nodes
  componentCount: number;
  largestComponentSize: number;
}

export function connectedComponents(graph: Graph): ConnectedComponentsResult {
  const visited = new Set<NodeId>();
  const components: GraphNode[][] = [];

  // Build adjacency list (undirected for standard connected components)
  const adj = new Map<NodeId, NodeId[]>();
  graph.nodes.forEach(n => adj.set(n.id, []));
  graph.edges.forEach(e => {
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source)?.push(e.target);

    if (!adj.has(e.target)) adj.set(e.target, []);
    adj.get(e.target)?.push(e.source);
  });

  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      const component: GraphNode[] = [];
      const stack = [node.id];
      visited.add(node.id);

      while (stack.length > 0) {
        const u = stack.pop()!;
        // Find the full node object
        const fullNode = graph.nodes.find(n => n.id === u);
        if (fullNode) component.push(fullNode);

        const neighbors = adj.get(u) || [];
        for (const v of neighbors) {
          if (!visited.has(v)) {
            visited.add(v);
            stack.push(v);
          }
        }
      }
      components.push(component);
    }
  }

  components.sort((a, b) => b.length - a.length);

  return {
    components,
    componentCount: components.length,
    largestComponentSize: components.length > 0 ? components[0].length : 0
  };
}
