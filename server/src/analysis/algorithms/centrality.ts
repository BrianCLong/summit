import { Graph, NodeId } from '../graphTypes.ts';

export interface DegreeCentralityResult {
  scores: Record<NodeId, number>;
  sortedNodes: { id: NodeId; score: number }[];
}

export function degreeCentrality(
  graph: Graph,
  direction: 'in' | 'out' | 'both' = 'both',
  topK?: number
): DegreeCentralityResult {
  const scores: Record<NodeId, number> = {};

  // Initialize scores
  graph.nodes.forEach(n => {
    scores[n.id] = 0;
  });

  graph.edges.forEach(edge => {
    if (direction === 'out' || direction === 'both') {
        if (scores[edge.source] !== undefined) scores[edge.source]++;
    }
    if (direction === 'in' || direction === 'both') {
        if (scores[edge.target] !== undefined) scores[edge.target]++;
    }
  });

  const sortedNodes = Object.entries(scores)
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);

  return {
    scores,
    sortedNodes: topK ? sortedNodes.slice(0, topK) : sortedNodes
  };
}
