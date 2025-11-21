import {
  persistenceService,
  GraphEntity,
  GraphRelationship,
} from './persistenceService';
import { cacheService } from './cacheService';
import {
  ActorAwarenessOptions,
  ActorAwarenessResult,
  ActorSignal,
  StochasticActorAwareness,
} from './StochasticActorAwareness';

interface MLPrediction {
  confidence: number;
  reasoning: string[];
  probability: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface EntityCluster {
  id: string;
  entities: string[];
  centerEntity: string;
  similarity_score: number;
  cluster_type: 'BEHAVIORAL' | 'TEMPORAL' | 'STRUCTURAL' | 'SEMANTIC';
  characteristics: string[];
}

interface AnomalyDetection {
  entity_id: string;
  anomaly_type: 'STATISTICAL' | 'BEHAVIORAL' | 'TEMPORAL' | 'NETWORK';
  severity: number;
  description: string;
  baseline_deviation: number;
  contributing_factors: string[];
  timestamp: string;
}

interface GraphMetrics {
  centrality_scores: Record<string, number>;
  clustering_coefficient: number;
  average_path_length: number;
  network_density: number;
  community_modularity: number;
  influence_scores: Record<string, number>;
}

export class MLAnalysisService {
  private modelVersion = '1.2.3';
  private lastTraining = new Date().toISOString();
  private readonly actorAwareness: StochasticActorAwareness;

  constructor(deps: { actorAwareness?: StochasticActorAwareness } = {}) {
    this.actorAwareness = deps.actorAwareness ?? new StochasticActorAwareness();
    console.log('[ML] AI/ML Analysis Service initialized');
    console.log(`[ML] Model version: ${this.modelVersion}`);
  }

  /**
   * Intelligent entity clustering using graph embeddings and behavioral analysis
   */
  async clusterEntities(investigationId: string): Promise<EntityCluster[]> {
    const cacheKey = `ml:clusters:${investigationId}`;
    let clusters = await cacheService.get<EntityCluster[]>(cacheKey);

    if (clusters) {
      console.log(`[ML] Cache hit for clusters: ${investigationId}`);
      return clusters;
    }

    console.log(
      `[ML] Computing entity clusters for investigation: ${investigationId}`,
    );

    const entities = await persistenceService.getEntities(investigationId);
    const relationships =
      await persistenceService.getRelationships(investigationId);

    // Simulate advanced clustering algorithm
    clusters = await this.performEntityClustering(entities, relationships);

    await cacheService.set(cacheKey, clusters, 900); // Cache for 15 minutes
    console.log(`[ML] Generated ${clusters.length} entity clusters`);

    return clusters;
  }

  /**
   * Anomaly detection using statistical analysis and behavioral modeling
   */
  async detectAnomalies(investigationId: string): Promise<AnomalyDetection[]> {
    const cacheKey = `ml:anomalies:${investigationId}`;
    let anomalies = await cacheService.get<AnomalyDetection[]>(cacheKey);

    if (anomalies) {
      console.log(`[ML] Cache hit for anomalies: ${investigationId}`);
      return anomalies;
    }

    console.log(
      `[ML] Detecting anomalies for investigation: ${investigationId}`,
    );

    const entities = await persistenceService.getEntities(investigationId);
    anomalies = await this.performAnomalyDetection(entities);

    await cacheService.set(cacheKey, anomalies, 600); // Cache for 10 minutes
    console.log(`[ML] Detected ${anomalies.length} anomalies`);

    return anomalies;
  }

  /**
   * Predict entity relationships using graph neural networks
   */
  async predictRelationships(
    entityId: string,
    candidateIds: string[],
  ): Promise<
    Array<{
      target_entity: string;
      predicted_relationship: string;
      confidence: number;
      reasoning: string[];
    }>
  > {
    const cacheKey = `ml:predictions:${entityId}:${candidateIds.join(',')}`;
    let predictions = await cacheService.get<any[]>(cacheKey);

    if (predictions) {
      return predictions;
    }

    console.log(`[ML] Predicting relationships for entity: ${entityId}`);

    const sourceEntity = await persistenceService.getEntity(entityId);
    if (!sourceEntity) {
      return [];
    }

    // Simulate ML-based relationship prediction
    predictions = candidateIds.map((candidateId) => ({
      target_entity: candidateId,
      predicted_relationship: this.predictRelationshipType(
        sourceEntity,
        candidateId,
      ),
      confidence: 0.7 + Math.random() * 0.25, // 70-95% confidence
      reasoning: [
        'Similar behavioral patterns detected',
        'Temporal correlation in activity',
        'Shared infrastructure indicators',
      ],
    }));

    await cacheService.set(cacheKey, predictions, 1800); // Cache for 30 minutes
    return predictions;
  }

  /**
   * Risk scoring using ensemble ML models
   */
  async calculateRiskScore(entityId: string): Promise<MLPrediction> {
    const cacheKey = `ml:risk:${entityId}`;
    let prediction = await cacheService.get<MLPrediction>(cacheKey);

    if (prediction) {
      return prediction;
    }

    console.log(`[ML] Calculating risk score for entity: ${entityId}`);

    const entity = await persistenceService.getEntity(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    // Simulate ensemble model prediction
    const baseScore = entity.triage_score || 0.5;
    const ttpWeight = entity.attack_ttps ? entity.attack_ttps.length * 0.1 : 0;
    const confidenceWeight = entity.confidence * 0.3;

    const riskScore = Math.min(
      0.95,
      baseScore + ttpWeight + confidenceWeight * 0.2,
    );

    prediction = {
      confidence: riskScore,
      reasoning: [
        'Historical behavioral analysis indicates elevated risk',
        'MITRE ATT&CK technique correlation suggests advanced capabilities',
        'Network position analysis shows potential for lateral movement',
        'Temporal patterns match known threat actor profiles',
      ],
      probability: riskScore,
      risk_level:
        riskScore > 0.8
          ? 'CRITICAL'
          : riskScore > 0.6
            ? 'HIGH'
            : riskScore > 0.4
              ? 'MEDIUM'
              : 'LOW',
    };

    await cacheService.set(cacheKey, prediction, 1200); // Cache for 20 minutes
    return prediction;
  }

  /**
   * Advanced graph metrics calculation
   */
  async computeGraphMetrics(investigationId: string): Promise<GraphMetrics> {
    const cacheKey = `ml:graph_metrics:${investigationId}`;
    let metrics = await cacheService.get<GraphMetrics>(cacheKey);

    if (metrics) {
      return metrics;
    }

    console.log(
      `[ML] Computing graph metrics for investigation: ${investigationId}`,
    );

    const entities = await persistenceService.getEntities(investigationId);
    const relationships =
      await persistenceService.getRelationships(investigationId);

    // Simulate advanced graph analysis
    const centralityScores: Record<string, number> = {};
    const influenceScores: Record<string, number> = {};

    entities.forEach((entity) => {
      // Simulate betweenness centrality calculation
      centralityScores[entity.id] = Math.random() * 0.8 + 0.1; // 0.1-0.9

      // Simulate influence score based on connections and TTP sophistication
      const ttpInfluence = entity.attack_ttps
        ? entity.attack_ttps.length * 0.15
        : 0;
      const confidenceInfluence = entity.confidence * 0.4;
      influenceScores[entity.id] = Math.min(
        1.0,
        ttpInfluence + confidenceInfluence,
      );
    });

    metrics = {
      centrality_scores: centralityScores,
      clustering_coefficient: 0.67 + Math.random() * 0.2, // 0.67-0.87
      average_path_length: 2.3 + Math.random() * 0.8, // 2.3-3.1
      network_density:
        entities.length > 0
          ? relationships.length / (entities.length * (entities.length - 1))
          : 0,
      community_modularity: 0.45 + Math.random() * 0.3, // 0.45-0.75
      influence_scores: influenceScores,
    };

    await cacheService.set(cacheKey, metrics, 1800); // Cache for 30 minutes
    return metrics;
  }

  /**
   * Behavioral pattern analysis
   */
  async analyzeBehavioralPatterns(entityId: string): Promise<{
    patterns: Array<{
      pattern_type: string;
      description: string;
      confidence: number;
      frequency: number;
      time_window: string;
    }>;
    behavioral_score: number;
    pattern_stability: number;
  }> {
    console.log(`[ML] Analyzing behavioral patterns for entity: ${entityId}`);

    const entity = await persistenceService.getEntity(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    // Simulate behavioral pattern detection
    const patterns = [
      {
        pattern_type: 'RECONNAISSANCE_BURST',
        description: 'Elevated scanning activity in specific time windows',
        confidence: 0.87,
        frequency: 0.23,
        time_window: '2-4 hours daily',
      },
      {
        pattern_type: 'CREDENTIAL_ACCESS_SEQUENCE',
        description: 'Sequential credential harvesting attempts',
        confidence: 0.92,
        frequency: 0.15,
        time_window: 'Weekly intervals',
      },
      {
        pattern_type: 'LATERAL_MOVEMENT_PATTERN',
        description: 'Systematic network traversal behavior',
        confidence: 0.79,
        frequency: 0.31,
        time_window: 'Post-compromise phases',
      },
    ];

    const behavioralScore =
      patterns.reduce((sum, p) => sum + p.confidence * p.frequency, 0) /
      patterns.length;
    const patternStability = 0.85 + Math.random() * 0.1; // 85-95% stability

    return {
      patterns,
      behavioral_score: behavioralScore,
      pattern_stability: patternStability,
    };
  }

  private async performEntityClustering(
    entities: GraphEntity[],
    relationships: GraphRelationship[],
  ): Promise<EntityCluster[]> {
    // Simulate advanced clustering using graph embeddings
    const clusters: EntityCluster[] = [];

    // Group by entity type first
    const typeGroups = entities.reduce(
      (groups, entity) => {
        const type = entity.type;
        if (!groups[type]) groups[type] = [];
        groups[type].push(entity);
        return groups;
      },
      {} as Record<string, GraphEntity[]>,
    );

    Object.entries(typeGroups).forEach(([type, typeEntities], index) => {
      if (typeEntities.length >= 2) {
        clusters.push({
          id: `cluster-${type}-${index}`,
          entities: typeEntities.map((e) => e.id),
          centerEntity: typeEntities[0].id,
          similarity_score: 0.75 + Math.random() * 0.2,
          cluster_type: type === 'person' ? 'BEHAVIORAL' : 'STRUCTURAL',
          characteristics: [
            `Common ${type} attributes`,
            'Similar confidence levels',
            'Temporal activity correlation',
          ],
        });
      }
    });

    // Add cross-type behavioral clusters
    if (entities.length >= 3) {
      clusters.push({
        id: 'cluster-behavioral-mixed',
        entities: entities.slice(0, 3).map((e) => e.id),
        centerEntity: entities[0].id,
        similarity_score: 0.68,
        cluster_type: 'BEHAVIORAL',
        characteristics: [
          'Similar MITRE ATT&CK techniques',
          'Coordinated timing patterns',
          'Shared infrastructure usage',
        ],
      });
    }

    return clusters;
  }

  private async performAnomalyDetection(
    entities: GraphEntity[],
  ): Promise<AnomalyDetection[]> {
    const anomalies: AnomalyDetection[] = [];

    entities.forEach((entity) => {
      // Simulate statistical anomaly detection
      if (entity.confidence > 0.95 || entity.triage_score! > 0.9) {
        anomalies.push({
          entity_id: entity.id,
          anomaly_type: 'STATISTICAL',
          severity: 0.85,
          description:
            'Unusually high confidence/triage scores indicate potential false positive or sophisticated threat',
          baseline_deviation: 2.7,
          contributing_factors: [
            'Confidence score exceeds 95th percentile',
            'Triage score indicates critical risk level',
            'Limited validation sources available',
          ],
          timestamp: new Date().toISOString(),
        });
      }

      // Check for behavioral anomalies
      if (entity.attack_ttps && entity.attack_ttps.length > 5) {
        anomalies.push({
          entity_id: entity.id,
          anomaly_type: 'BEHAVIORAL',
          severity: 0.78,
          description:
            'Entity exhibits unusually diverse MITRE ATT&CK technique portfolio',
          baseline_deviation: 1.9,
          contributing_factors: [
            'TTP diversity exceeds typical threat actor profile',
            'Multi-tactic capability suggests advanced persistent threat',
            'Technique combination indicates possible attribution mixing',
          ],
          timestamp: new Date().toISOString(),
        });
      }
    });

    return anomalies;
  }

  private predictRelationshipType(
    sourceEntity: GraphEntity,
    targetId: string,
  ): string {
    // Simple heuristic for relationship prediction
    const relationshipTypes = [
      'COMMUNICATES_WITH',
      'SHARES_INFRASTRUCTURE',
      'COORDINATES_WITH',
      'EXPLOITS',
      'IMPERSONATES',
      'LEVERAGES',
    ];

    // Choose relationship type based on entity characteristics
    if (sourceEntity.type === 'person') {
      return relationshipTypes[Math.floor(Math.random() * 3)]; // More social relationships
    } else {
      return relationshipTypes[3 + Math.floor(Math.random() * 3)]; // More technical relationships
    }
  }

  /**
   * Get ML service statistics
   */
  getServiceStats() {
    return {
      model_version: this.modelVersion,
      last_training: this.lastTraining,
      active_models: [
        'Entity Risk Scorer v2.1',
        'Relationship Predictor v1.8',
        'Anomaly Detector v3.0',
        'Behavioral Analyzer v2.5',
      ],
      cache_stats: cacheService.getStats(),
    };
  }

  generateStochasticActorAwareness(
    signals: ActorSignal[],
    options: ActorAwarenessOptions = {},
  ): {
    actors: ActorAwarenessResult[];
    summary: string;
    sampleCount: number;
    dominantActor: ActorAwarenessResult | null;
  } {
    if (!Array.isArray(signals) || signals.length === 0) {
      return {
        actors: [],
        summary: 'No actor signals provided for awareness simulation.',
        sampleCount: 0,
        dominantActor: null,
      };
    }

    const simulation = this.actorAwareness.runSimulation(signals, options);
    const summary = this.actorAwareness.buildSummary(
      simulation,
      options.summaryLimit ?? 3,
    );

    return {
      actors: simulation,
      summary,
      sampleCount: options.sampleCount ?? 500,
      dominantActor: simulation.length > 0 ? simulation[0] : null,
    };
  }
}

// Global ML analysis service instance
export const mlAnalysisService = new MLAnalysisService();
