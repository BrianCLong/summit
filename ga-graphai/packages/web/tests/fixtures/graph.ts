import type { GraphEdge, GraphNode } from "../../src/index.js";

export function buildFixtureGraph(
  count: number,
  rowWidth = 25,
  fanout = 1
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = Array.from({ length: count }, (_, index) => ({
    id: `node-${index}`,
    label: `Node ${index}`,
    x: (index % rowWidth) * 18,
    y: Math.floor(index / rowWidth) * 18,
  }));

  const edges: GraphEdge[] = [];
  for (let index = 0; index < nodes.length; index += 1) {
    for (let step = 1; step <= fanout; step += 1) {
      const targetIndex = index + step;
      if (targetIndex >= nodes.length) break;
      edges.push({
        id: `edge-${index}-${step}`,
        from: nodes[index].id,
        to: nodes[targetIndex].id,
      });
    }
  }

  return { nodes, edges };
}
