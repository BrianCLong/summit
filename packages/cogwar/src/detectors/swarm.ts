import { MessageNode, VariantGraph } from '../features/variant-graph';
import { CoordinationAnalyzer, CoordinationResult } from '../features/coordination';

export interface SwarmDetectionResult {
  detectedSwarms: CoordinationResult[];
  maxSynchronicity: number;
}

export class SwarmDetector {
  private graph: VariantGraph;
  private analyzer: CoordinationAnalyzer;

  constructor() {
    this.graph = new VariantGraph(0.8); // 80% similarity for swarms (tighter)
    // Min 5 messages, Max 60 seconds duration for "burst"
    this.analyzer = new CoordinationAnalyzer(this.graph, 5, 60000);
  }

  ingest(messages: MessageNode[]) {
    messages.forEach(msg => this.graph.addMessage(msg));
  }

  analyze(): SwarmDetectionResult {
    const clusters = this.graph.getClusters();
    const detectedSwarms: CoordinationResult[] = [];
    let maxSynchronicity = 0;

    for (const cluster of clusters) {
      // Only analyze clusters with enough members
      if (cluster.members.length >= 5) {
        const result = this.analyzer.analyzeCluster(cluster);
        if (result.isSwarm) {
          detectedSwarms.push(result);
        }
        if (result.synchronicityScore > maxSynchronicity) {
          maxSynchronicity = result.synchronicityScore;
        }
      }
    }

    return {
      detectedSwarms,
      maxSynchronicity
    };
  }
}
