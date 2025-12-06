// @ts-ignore
import GraphAnalyticsService from './GraphAnalyticsService.js';

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
  private graphService: any;
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
    const basicMetrics = await this.graphService.calculateBasicMetrics(narrativeId);

    // 2. Identify top topics (mocked or using another service)
    const topTopics = await this.extractTopTopics(narrativeId);

    // 3. Calculate amplification velocity
    const velocity = await this.calculateAmplificationVelocity(narrativeId);

    const snapshot: NarrativeSnapshot = {
      timestamp: new Date(),
      narrativeId,
      metrics: {
        nodeCount: basicMetrics.nodeCount,
        edgeCount: basicMetrics.edgeCount,
        avgDegree: basicMetrics.avgDegree,
        density: basicMetrics.density,
        clusteringCoefficient: 0 // Placeholder, or implement in GraphService
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
          emergenceTime: recent.timestamp, // Already emerged, but status update
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

  private async extractTopTopics(narrativeId: string): Promise<{ topic: string; frequency: number }[]> {
    // In a real impl, this would query Neo4j for most frequent keywords/hashtags in the narrative subgraph
    return [
      { topic: 'disinformation', frequency: 150 },
      { topic: 'botnet', frequency: 80 }
    ];
  }

  private async calculateAmplificationVelocity(narrativeId: string): Promise<number> {
    // Calculate rate of new edges/nodes added in the last hour
    return 45.5; // Mock
  }
}
