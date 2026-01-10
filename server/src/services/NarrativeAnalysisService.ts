import GraphAnalyticsService from './GraphAnalyticsService.js';
import { runCypher } from '../graph/neo4j.js';

export interface NarrativeSnapshot {
  timestamp: Date;
  narrativeId: string;
  metrics: {
    nodeCount: number;
    edgeCount: number;
    avgDegree: number;
    density: number;
    clusteringCoefficient: number;
  };
  topTopics: { topic: string; frequency: number }[];
  amplificationVelocity: number;
}

export interface TopicTrend {
  topic: string;
  emergenceTime: Date;
  decayTime?: Date;
  peakVelocity: number;
  status: 'emerging' | 'peaking' | 'decaying' | 'stable';
}

export class NarrativeAnalysisService {
  private graphService: GraphAnalyticsService;
  private snapshots: Map<string, NarrativeSnapshot[]> = new Map();

  constructor() {
    this.graphService = new GraphAnalyticsService();
  }

  /**
   * Takes a snapshot of the current narrative graph state.
   * To be called every 6 hours by a scheduler.
   */
  async takeSnapshot(narrativeId: string): Promise<NarrativeSnapshot> {
    // 1. Calculate metrics using GraphAnalyticsService
    // Assuming calculateBasicMetrics doesn't exist yet in the interface, using standard centrality as proxy or implementing it.
    // Let's assume we want basic stats. GraphAnalyticsService doesn't have "getStats" yet.
    // We will query Neo4j directly here for global stats of the narrative subgraph.

    // We assume entities in a narrative are tagged with `narrativeId` property or related to a Narrative node.
    // For MVP, assuming `investigationId` on entities = narrativeId.

    const stats = await this.getNarrativeStats(narrativeId);

    // 2. Identify top topics
    const topTopics = await this.extractTopTopics(narrativeId);

    // 3. Calculate amplification velocity
    const velocity = await this.calculateAmplificationVelocity(narrativeId);

    const snapshot: NarrativeSnapshot = {
      timestamp: new Date(),
      narrativeId,
      metrics: {
        nodeCount: stats.nodeCount,
        edgeCount: stats.edgeCount,
        avgDegree: stats.avgDegree,
        density: stats.density,
        clusteringCoefficient: 0 // Expensive to calc on large graph without GDS
      },
      topTopics,
      amplificationVelocity: velocity
    };

    // Store snapshot
    if (!this.snapshots.has(narrativeId)) {
      this.snapshots.set(narrativeId, []);
    }
    this.snapshots.get(narrativeId)?.push(snapshot);

    return snapshot;
  }

  async getNarrativeEvolution(narrativeId: string): Promise<NarrativeSnapshot[]> {
    return this.snapshots.get(narrativeId) || [];
  }

  async detectTrends(narrativeId: string): Promise<TopicTrend[]> {
    const history = this.snapshots.get(narrativeId);
    if (!history || history.length < 2) return [];

    const trends: TopicTrend[] = [];
    const recent = history[history.length - 1];
    const previous = history[history.length - 2];

    // Detect emergence
    recent.topTopics.forEach(topic => {
      const prevTopic = previous.topTopics.find(t => t.topic === topic.topic);
      if (!prevTopic) {
        trends.push({
          topic: topic.topic,
          emergenceTime: recent.timestamp,
          peakVelocity: topic.frequency, // Proxy
          status: 'emerging'
        });
      } else if (topic.frequency > prevTopic.frequency * 1.2) {
         trends.push({
          topic: topic.topic,
          emergenceTime: recent.timestamp,
          peakVelocity: topic.frequency,
          status: 'peaking'
        });
      } else if (topic.frequency < prevTopic.frequency * 0.8) {
         trends.push({
          topic: topic.topic,
          emergenceTime: recent.timestamp,
          peakVelocity: topic.frequency,
          status: 'decaying'
        });
      }
    });

    return trends;
  }

  private async getNarrativeStats(narrativeId: string) {
      const cypher = `
        MATCH (n:Entity {investigationId: $narrativeId})
        OPTIONAL MATCH (n)-[r]-(m:Entity {investigationId: $narrativeId})
        RETURN count(distinct n) as nodeCount, count(r) as edgeCount
      `;
      // Note: edgeCount is double counted in undirected sense if we don't handle direction carefully,
      // but "count(r)" counts relationships.

      const result = await runCypher<{nodeCount: number, edgeCount: number}>(cypher, { narrativeId });
      const nodeCount = Number(result[0]?.nodeCount || 0);
      const edgeCount = Number(result[0]?.edgeCount || 0) / 2; // Undirected adjustment if needed, but let's assume directed

      const avgDegree = nodeCount > 0 ? (edgeCount * 2) / nodeCount : 0;
      const density = nodeCount > 1 ? (2 * edgeCount) / (nodeCount * (nodeCount - 1)) : 0;

      return { nodeCount, edgeCount, avgDegree, density };
  }

  private async extractTopTopics(narrativeId: string): Promise<{ topic: string; frequency: number }[]> {
    // Extract hashtags or topics from entity attributes.
    // Since 'attributes' might be a JSON string, we fetch and parse in JS to be safe without APOC dependence.
    const cypher = `
        MATCH (n:Entity {investigationId: $narrativeId})
        RETURN n.attributes as attributes
        LIMIT 1000
    `;

    const result = await runCypher<{attributes: string | any}>(cypher, { narrativeId });

    const topicCounts = new Map<string, number>();

    result.forEach(row => {
        let attrs = row.attributes;
        if (typeof attrs === 'string') {
            try {
                attrs = JSON.parse(attrs);
            } catch (e: any) {
                return; // Skip invalid JSON
            }
        }

        if (attrs && Array.isArray(attrs.hashtags)) {
            attrs.hashtags.forEach((tag: string) => {
                const count = topicCounts.get(tag) || 0;
                topicCounts.set(tag, count + 1);
            });
        }
    });

    return Array.from(topicCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([topic, frequency]) => ({ topic, frequency }));
  }

  private async calculateAmplificationVelocity(narrativeId: string): Promise<number> {
    // Calculate rate of new edges/nodes added in the last hour
    // Assuming entities have createdAt
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

    const cypher = `
        MATCH (n:Entity {investigationId: $narrativeId})
        WHERE n.createdAt > $oneHourAgo
        RETURN count(n) as newNodes
    `;

    const result = await runCypher<{newNodes: number}>(cypher, { narrativeId, oneHourAgo });
    return Number(result[0]?.newNodes || 0);
  }
}
