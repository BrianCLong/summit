import { AdjacencyList } from './dynamic_subgraph';

export interface PPRScores {
  [nodeId: string]: number;
}

export class PPR {
  static calculate(
    adj: AdjacencyList,
    seedNodes: string[],
    alpha: number = 0.15,
    maxIterations: number = 20
  ): PPRScores {
    const nodes = Object.keys(adj);
    if (nodes.length === 0) return {};

    let scores: PPRScores = {};
    const seedWeight = 1.0 / seedNodes.length;
    nodes.forEach(node => {
      scores[node] = seedNodes.includes(node) ? seedWeight : 0;
    });

    const seedDistribution: PPRScores = { ...scores };

    for (let i = 0; i < maxIterations; i++) {
      const nextScores: PPRScores = {};
      nodes.forEach(node => (nextScores[node] = 0));

      nodes.forEach(u => {
        const neighbors = Object.keys(adj[u]);
        const outDegree = neighbors.length;

        if (outDegree > 0) {
          const scoreToDistribute = scores[u] * (1 - alpha);
          neighbors.forEach(v => {
            nextScores[v] += scoreToDistribute / outDegree;
          });
        } else {
          nodes.forEach(v => {
            nextScores[v] += scores[u] * (1 - alpha) * (seedDistribution[v] || 0);
          });
        }
      });

      nodes.forEach(node => {
        nextScores[node] += alpha * (seedDistribution[node] || 0);
      });

      scores = nextScores;
    }

    return scores;
  }
}
