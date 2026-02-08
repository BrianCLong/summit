import { TemporalEdge, Chunk, TimeScope } from './types.js';
import { PPRScores } from './ppr.js';

export interface ScoredChunk extends Chunk {
  score: number;
}

export class TGRAGScorer {
  static scoreEdge(edge: TemporalEdge, pprScores: PPRScores, scope: TimeScope): number {
    const edgeTime = new Date(edge.timestamp);
    if (edgeTime < scope.start || edgeTime > scope.end) {
      return 0;
    }

    const s1 = pprScores[edge.v1] || 0;
    const s2 = pprScores[edge.v2] || 0;

    return s1 + s2;
  }

  static scoreChunk(chunk: Chunk, edges: TemporalEdge[], pprScores: PPRScores, scope: TimeScope): number {
    const chunkEdges = edges.filter(e => chunk.edgeIds.includes(`${e.v1}-${e.rel}-${e.v2}-${e.timestamp}`));

    const edgeSum = chunkEdges.reduce((sum, edge) => {
      return sum + this.scoreEdge(edge, pprScores, scope);
    }, 0);

    return edgeSum;
  }
}
