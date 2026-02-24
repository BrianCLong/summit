import { MessageNode, VariantGraph, VariantCluster } from '../features/variant-graph';

export interface AdaptivityResult {
  score: number; // 0 to 1
  pivotCount: number;
  activeVariants: number;
  evidence: string[]; // Cluster IDs
}

export class AdaptivityDetector {
  private graph: VariantGraph;
  private timeWindowMs: number;

  constructor(timeWindowMs: number = 24 * 60 * 60 * 1000) { // 24 hours
    this.graph = new VariantGraph(0.7); // 70% similarity threshold
    this.timeWindowMs = timeWindowMs;
  }

  ingest(messages: MessageNode[]) {
    messages.forEach(msg => this.graph.addMessage(msg));
  }

  analyze(currentTime: number): AdaptivityResult {
    const clusters = this.graph.getClusters();
    const cutoffTime = currentTime - this.timeWindowMs;

    // Filter active clusters within the window
    const activeClusters = clusters.filter(c => {
      for (const memberId of c.members) {
        const msg = this.graph.getMessage(memberId);
        if (msg && msg.timestamp >= cutoffTime && msg.timestamp <= currentTime) {
          return true;
        }
      }
      return false;
    });

    // Detect pivots: distinct clusters with high velocity appearing in sequence
    // For MWS, we count high-velocity clusters as "variants being tested"
    // We filter high velocity clusters that are ALSO active in the window
    const highVelocityClusters = this.graph.getHighVelocityClusters(5).filter(c => {
       // Must be in active set
       return activeClusters.some(ac => ac.id === c.id);
    });

    // Score based on number of concurrent high-velocity variants
    // 1 variant = 0.2 (normal viral)
    // 5 variants = 1.0 (highly adaptive/A/B testing)
    const variantCount = highVelocityClusters.length;
    const score = Math.min(variantCount * 0.2, 1.0);

    return {
      score,
      pivotCount: variantCount, // simplistic proxy for now
      activeVariants: variantCount,
      evidence: highVelocityClusters.map(c => c.id)
    };
  }
}
