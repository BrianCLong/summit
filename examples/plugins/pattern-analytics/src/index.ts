import {
  AnalyticsExtension,
  AnalyticsInput,
  AnalyticsResult,
  AnalyticsMetadata,
  AnalyticsParameter,
  Insight,
  Entity,
  Relationship,
  PluginContext,
} from '@summit/plugin-system';

/**
 * Pattern Detection Analytics Plugin
 *
 * Analyzes graph data to detect:
 * - Suspicious entity clusters
 * - Anomalous relationship patterns
 * - Hidden connections
 * - Network centrality metrics
 */
export default class PatternAnalyticsPlugin extends AnalyticsExtension {
  private analysisCache = new Map<string, AnalyticsResult>();

  protected async onInitialize(context: PluginContext): Promise<void> {
    await super.onInitialize(context);
    this.log.info('Pattern Analytics Plugin initialized');

    // Load any configuration
    const config = context.config;
    if (config.cacheEnabled) {
      this.log.info('Caching enabled for analytics results');
    }
  }

  protected async onStart(): Promise<void> {
    await super.onStart();
    this.log.info('Pattern Analytics Plugin started - ready to analyze');
  }

  protected async onStop(): Promise<void> {
    await super.onStop();
    this.analysisCache.clear();
  }

  protected async onDestroy(): Promise<void> {
    await super.onDestroy();
  }

  /**
   * Perform pattern analysis on input data
   */
  async analyze(input: AnalyticsInput): Promise<AnalyticsResult> {
    const startTime = Date.now();

    this.log.info('Starting pattern analysis', {
      hasQuery: !!input.query,
      hasData: !!input.data,
    });

    try {
      // Check cache
      const cacheKey = this.getCacheKey(input);
      if (this.analysisCache.has(cacheKey)) {
        this.log.debug('Returning cached result');
        return this.analysisCache.get(cacheKey)!;
      }

      // Extract data from input
      const data = await this.extractData(input);

      // Perform analysis
      const insights: Insight[] = [];
      const discoveredEntities: Entity[] = [];
      const discoveredRelationships: Relationship[] = [];

      // 1. Cluster Detection
      const clusters = this.detectClusters(data.entities, data.relationships);
      insights.push(...this.generateClusterInsights(clusters));

      // 2. Anomaly Detection
      const anomalies = this.detectAnomalies(data.entities, data.relationships);
      insights.push(...anomalies);

      // 3. Centrality Analysis
      const centralityMetrics = this.calculateCentrality(data.entities, data.relationships);
      insights.push(...this.generateCentralityInsights(centralityMetrics));

      // 4. Pattern Matching
      const patterns = this.matchKnownPatterns(data.entities, data.relationships);
      insights.push(...patterns);

      // Calculate confidence score
      const confidence = this.calculateConfidence(insights);

      const result: AnalyticsResult = {
        insights,
        entities: discoveredEntities,
        relationships: discoveredRelationships,
        confidence,
        metadata: {
          executionTimeMs: Date.now() - startTime,
          dataPointsAnalyzed: data.entities.length + data.relationships.length,
          algorithm: 'pattern-detection-v1',
          version: this.manifest.version,
        },
      };

      // Cache result
      this.analysisCache.set(cacheKey, result);

      this.log.info('Pattern analysis completed', {
        insightsCount: insights.length,
        executionTimeMs: result.metadata.executionTimeMs,
        confidence,
      });

      return result;
    } catch (error) {
      this.log.error('Pattern analysis failed', error as Error);
      throw error;
    }
  }

  /**
   * Get plugin metadata
   */
  getMetadata(): AnalyticsMetadata {
    return {
      name: 'Pattern Detection Analytics',
      description: 'Analyzes graph patterns to detect suspicious relationships and entity clusters',
      version: '1.0.0',
      author: 'IntelGraph Team',
      category: 'threat-intelligence',
      tags: ['pattern-detection', 'graph-analysis', 'anomaly-detection'],
      parameters: this.getParameters(),
      supportedDataTypes: ['graph', 'entities', 'relationships'],
      outputTypes: ['insights', 'clusters', 'metrics'],
    };
  }

  /**
   * Get analysis parameters
   */
  private getParameters(): AnalyticsParameter[] {
    return [
      {
        name: 'minClusterSize',
        type: 'number',
        description: 'Minimum size for cluster detection',
        required: false,
        default: 3,
        validation: { min: 2, max: 100 },
      },
      {
        name: 'anomalyThreshold',
        type: 'number',
        description: 'Threshold for anomaly detection (0-1)',
        required: false,
        default: 0.7,
        validation: { min: 0, max: 1 },
      },
      {
        name: 'includeHiddenConnections',
        type: 'boolean',
        description: 'Include analysis of hidden connections',
        required: false,
        default: true,
      },
    ];
  }

  /**
   * Extract data from input
   */
  private async extractData(input: AnalyticsInput): Promise<{ entities: Entity[]; relationships: Relationship[] }> {
    if (input.data) {
      return {
        entities: input.data.entities || [],
        relationships: input.data.relationships || [],
      };
    }

    if (input.query?.cypher) {
      // In a real implementation, this would execute the Cypher query
      // For now, return empty data
      this.log.warn('Cypher query execution not implemented in example');
      return { entities: [], relationships: [] };
    }

    return { entities: [], relationships: [] };
  }

  /**
   * Detect entity clusters
   */
  private detectClusters(entities: Entity[], relationships: Relationship[]): EntityCluster[] {
    // Simplified clustering algorithm
    const clusters: EntityCluster[] = [];
    const visited = new Set<string>();

    for (const entity of entities) {
      if (visited.has(entity.id)) continue;

      const cluster: EntityCluster = {
        id: `cluster-${clusters.length}`,
        entities: [entity],
        density: 0,
      };

      // Find connected entities (simplified BFS)
      const queue = [entity.id];
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        visited.add(currentId);

        const connectedRels = relationships.filter(
          r => r.source === currentId || r.target === currentId
        );

        for (const rel of connectedRels) {
          const otherId = rel.source === currentId ? rel.target : rel.source;
          if (!visited.has(otherId)) {
            const otherEntity = entities.find(e => e.id === otherId);
            if (otherEntity) {
              cluster.entities.push(otherEntity);
              queue.push(otherId);
            }
          }
        }
      }

      if (cluster.entities.length > 1) {
        cluster.density = this.calculateClusterDensity(cluster.entities, relationships);
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  /**
   * Calculate cluster density
   */
  private calculateClusterDensity(entities: Entity[], relationships: Relationship[]): number {
    if (entities.length < 2) return 0;

    const entityIds = new Set(entities.map(e => e.id));
    const internalEdges = relationships.filter(
      r => entityIds.has(r.source) && entityIds.has(r.target)
    );

    const maxPossibleEdges = (entities.length * (entities.length - 1)) / 2;
    return maxPossibleEdges > 0 ? internalEdges.length / maxPossibleEdges : 0;
  }

  /**
   * Generate insights from clusters
   */
  private generateClusterInsights(clusters: EntityCluster[]): Insight[] {
    return clusters
      .filter(c => c.density > 0.6) // High-density clusters
      .map(cluster => ({
        type: 'cluster',
        title: `High-Density Entity Cluster Detected`,
        description: `Found cluster of ${cluster.entities.length} entities with ${(cluster.density * 100).toFixed(1)}% density`,
        confidence: cluster.density,
        severity: cluster.density > 0.8 ? 'high' : 'medium',
        data: {
          clusterId: cluster.id,
          size: cluster.entities.length,
          density: cluster.density,
        },
        recommendations: [
          'Review entities in cluster for suspicious activity',
          'Check temporal patterns of relationship formation',
        ],
      }));
  }

  /**
   * Detect anomalies
   */
  private detectAnomalies(entities: Entity[], relationships: Relationship[]): Insight[] {
    const insights: Insight[] = [];

    // Detect entities with unusually high connection count
    const connectionCounts = new Map<string, number>();
    relationships.forEach(r => {
      connectionCounts.set(r.source, (connectionCounts.get(r.source) || 0) + 1);
      connectionCounts.set(r.target, (connectionCounts.get(r.target) || 0) + 1);
    });

    const avgConnections = Array.from(connectionCounts.values()).reduce((a, b) => a + b, 0) / connectionCounts.size;
    const threshold = avgConnections * 3; // 3x average

    for (const [entityId, count] of connectionCounts) {
      if (count > threshold) {
        const entity = entities.find(e => e.id === entityId);
        insights.push({
          type: 'anomaly',
          title: 'Highly Connected Entity Detected',
          description: `Entity has ${count} connections (${(count / avgConnections).toFixed(1)}x average)`,
          confidence: Math.min(count / threshold, 1),
          severity: count > threshold * 2 ? 'high' : 'medium',
          data: {
            entityId,
            entityType: entity?.type,
            connectionCount: count,
            averageConnections: avgConnections,
          },
          recommendations: [
            'Investigate purpose of high connectivity',
            'Check if entity is a hub or broker',
          ],
        });
      }
    }

    return insights;
  }

  /**
   * Calculate centrality metrics
   */
  private calculateCentrality(entities: Entity[], relationships: Relationship[]): Map<string, CentralityMetrics> {
    const metrics = new Map<string, CentralityMetrics>();

    for (const entity of entities) {
      const inDegree = relationships.filter(r => r.target === entity.id).length;
      const outDegree = relationships.filter(r => r.source === entity.id).length;
      const totalDegree = inDegree + outDegree;

      metrics.set(entity.id, {
        inDegree,
        outDegree,
        totalDegree,
        betweenness: 0, // Simplified - full calculation would be expensive
      });
    }

    return metrics;
  }

  /**
   * Generate centrality insights
   */
  private generateCentralityInsights(metrics: Map<string, CentralityMetrics>): Insight[] {
    const insights: Insight[] = [];
    const sortedByDegree = Array.from(metrics.entries())
      .sort((a, b) => b[1].totalDegree - a[1].totalDegree)
      .slice(0, 5); // Top 5

    if (sortedByDegree.length > 0) {
      insights.push({
        type: 'centrality',
        title: 'Key Network Nodes Identified',
        description: `Identified ${sortedByDegree.length} highly central entities in the network`,
        confidence: 0.9,
        severity: 'medium',
        data: {
          topNodes: sortedByDegree.map(([id, m]) => ({ id, degree: m.totalDegree })),
        },
        recommendations: [
          'Monitor these entities as they are central to the network',
          'Investigate their role and importance',
        ],
      });
    }

    return insights;
  }

  /**
   * Match known attack patterns
   */
  private matchKnownPatterns(entities: Entity[], relationships: Relationship[]): Insight[] {
    const insights: Insight[] = [];

    // Example: Detect star pattern (one central node with many connections)
    const connectionCounts = new Map<string, number>();
    relationships.forEach(r => {
      connectionCounts.set(r.source, (connectionCounts.get(r.source) || 0) + 1);
    });

    for (const [entityId, count] of connectionCounts) {
      if (count >= 5) {
        const entity = entities.find(e => e.id === entityId);
        insights.push({
          type: 'pattern',
          title: 'Star Pattern Detected',
          description: `Entity acts as a central hub with ${count} outbound connections`,
          confidence: 0.85,
          severity: count > 10 ? 'high' : 'medium',
          data: {
            entityId,
            entityType: entity?.type,
            pattern: 'star',
            connectionCount: count,
          },
          recommendations: [
            'Verify if this hub pattern is expected',
            'Check for potential command-and-control behavior',
          ],
        });
      }
    }

    return insights;
  }

  /**
   * Calculate overall confidence
   */
  private calculateConfidence(insights: Insight[]): number {
    if (insights.length === 0) return 0;
    const avgConfidence = insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length;
    return Math.min(avgConfidence, 1);
  }

  /**
   * Generate cache key
   */
  private getCacheKey(input: AnalyticsInput): string {
    return JSON.stringify({
      query: input.query,
      dataLength: input.data?.entities?.length || 0,
      params: input.parameters,
    });
  }
}

interface EntityCluster {
  id: string;
  entities: Entity[];
  density: number;
}

interface CentralityMetrics {
  inDegree: number;
  outDegree: number;
  totalDegree: number;
  betweenness: number;
}
