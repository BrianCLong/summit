import { createHash } from 'crypto';

export interface MessageNode {
  id: string;
  content: string;
  timestamp: number;
  authorId: string;
}

export interface VariantCluster {
  id: string;
  prototype: string; // The first message content that formed the cluster
  members: string[]; // message IDs
  proliferationRate: number; // members per hour
}

// Simple Levenshtein distance
function levenshtein(a: string, b: string): number {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export class VariantGraph {
  public getMessage(id: string): MessageNode | undefined {
    return this.nodes.get(id);
  }

  private nodes: Map<string, MessageNode> = new Map();
  private clusters: Map<string, VariantCluster> = new Map();
  private similarityThreshold: number = 0.8;

  constructor(similarityThreshold: number = 0.8) {
    this.similarityThreshold = similarityThreshold;
  }

  addMessage(message: MessageNode) {
    this.nodes.set(message.id, message);
    this.assignToCluster(message);
  }

  private assignToCluster(message: MessageNode) {
    let bestClusterId: string | null = null;
    let maxSimilarity = 0;

    for (const [clusterId, cluster] of this.clusters.entries()) {
      const distance = levenshtein(message.content, cluster.prototype);
      const maxLength = Math.max(message.content.length, cluster.prototype.length);
      const similarity = 1 - (distance / maxLength);

      if (similarity >= this.similarityThreshold && similarity > maxSimilarity) {
        maxSimilarity = similarity;
        bestClusterId = clusterId;
      }
    }

    if (bestClusterId) {
      const cluster = this.clusters.get(bestClusterId)!;
      cluster.members.push(message.id);
      this.updateProliferationRate(cluster);
    } else {
      // Deterministic ID based on content
      const hash = createHash('sha256').update(message.content).digest('hex').substring(0, 16);
      const newClusterId = `cluster-${hash}`;

      this.clusters.set(newClusterId, {
        id: newClusterId,
        prototype: message.content,
        members: [message.id],
        proliferationRate: 0
      });
    }
  }

  private updateProliferationRate(cluster: VariantCluster) {
    if (cluster.members.length < 2) return;

    const timestamps = cluster.members
      .map(id => this.nodes.get(id)!.timestamp)
      .sort((a, b) => a - b);

    const durationHours = (timestamps[timestamps.length - 1] - timestamps[0]) / (1000 * 60 * 60);
    if (durationHours > 0) {
      cluster.proliferationRate = cluster.members.length / durationHours;
    }
  }

  getClusters(): VariantCluster[] {
    return Array.from(this.clusters.values());
  }

  getHighVelocityClusters(minRate: number): VariantCluster[] {
    return this.getClusters().filter(c => c.proliferationRate >= minRate);
  }
}
