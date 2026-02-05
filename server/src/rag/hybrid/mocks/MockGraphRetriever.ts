import { IntentSpec } from '../../intent_compiler.js';
import {
  GraphCandidate,
  GraphRetriever,
  HybridQuery,
} from '../HybridRetriever.js';

const graphScoreSeed = (intent: IntentSpec) => {
  const hop = intent.constraints?.max_hops ?? 1;
  return 0.6 + hop * 0.05;
};

export class MockGraphRetriever implements GraphRetriever {
  async retrieve(intent: IntentSpec, query: HybridQuery): Promise<GraphCandidate[]> {
    const baseScore = graphScoreSeed(intent);
    return [
      {
        id: 'doc-alpha',
        text: 'Alpha graph snippet',
        score: baseScore,
        evidenceIds: ['EVD-GRAPH-ALPHA'],
        metadata: { source: 'mock-graph', hops: intent.constraints?.max_hops },
      },
      {
        id: 'doc-delta',
        text: 'Delta graph snippet',
        score: baseScore - 0.1,
        evidenceIds: ['EVD-GRAPH-DELTA'],
        metadata: { source: 'mock-graph', hops: intent.constraints?.max_hops },
      },
    ];
  }
}
