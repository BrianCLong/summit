import { MessageNode, VariantCluster, VariantGraph } from './variant-graph';

export interface CoordinationResult {
  clusterId: string;
  authorCount: number;
  messageCount: number;
  durationMs: number;
  burstDensity: number; // messages per second
  synchronicityScore: number; // 0 to 1
  isSwarm: boolean;
}

export class CoordinationAnalyzer {
  private graph: VariantGraph;
  private minMessages: number;
  private maxDurationMs: number;

  constructor(graph: VariantGraph, minMessages: number = 5, maxDurationMs: number = 60000) {
    this.graph = graph;
    this.minMessages = minMessages;
    this.maxDurationMs = maxDurationMs;
  }

  analyzeCluster(cluster: VariantCluster): CoordinationResult {
    const messages: MessageNode[] = [];
    for (const msgId of cluster.members) {
      const msg = this.graph.getMessage(msgId);
      if (msg) messages.push(msg);
    }

    if (messages.length < 2) {
      return this.emptyResult(cluster.id);
    }

    const timestamps = messages.map(m => m.timestamp).sort((a, b) => a - b);
    const durationMs = timestamps[timestamps.length - 1] - timestamps[0];
    const authors = new Set(messages.map(m => m.authorId));

    // Density: messages per second
    const burstDensity = durationMs > 0 ? (messages.length / (durationMs / 1000)) : messages.length; // infinite density if 0ms

    // Synchronicity: Close to 1 if density is high and authors are unique
    // If all distinct authors post within a tiny window -> highly coordinated
    // If one author posts rapidly -> spam, not necessarily swarm
    const uniqueAuthorRatio = authors.size / messages.length;

    // Score based on density and author uniqueness
    // Example: 10 messages in 10 seconds (1 msg/sec) by 10 authors (ratio 1.0) -> Score 1.0
    // Example: 10 messages in 100 seconds (0.1 msg/sec) by 10 authors -> Score 0.1
    // Example: 10 messages in 10 seconds by 1 author (ratio 0.1) -> Score 0.1

    const densityComponent = Math.min(burstDensity / 1.0, 1.0); // Cap density at 1 msg/sec for normalized score
    const synchronicityScore = densityComponent * uniqueAuthorRatio;

    const isSwarm = (
      messages.length >= this.minMessages &&
      durationMs <= this.maxDurationMs &&
      synchronicityScore > 0.5
    );

    return {
      clusterId: cluster.id,
      authorCount: authors.size,
      messageCount: messages.length,
      durationMs,
      burstDensity,
      synchronicityScore,
      isSwarm
    };
  }

  private emptyResult(clusterId: string): CoordinationResult {
    return {
      clusterId,
      authorCount: 0,
      messageCount: 0,
      durationMs: 0,
      burstDensity: 0,
      synchronicityScore: 0,
      isSwarm: false
    };
  }
}
