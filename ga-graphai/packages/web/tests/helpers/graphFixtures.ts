import type { GraphEdge, GraphNode } from "../../src/index.js";

export function buildFixtureGraph(count: number): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = Array.from({ length: count }, (_, index) => ({
    id: `node-${index}`,
    label: `Node ${index}`,
    x: (index % 40) * 16,
    y: Math.floor(index / 40) * 16,
  }));

  const edges: GraphEdge[] = nodes.slice(1).map((node, index) => ({
    id: `edge-${index}`,
    from: nodes[index].id,
    to: node.id,
  }));

  return { nodes, edges };
}
