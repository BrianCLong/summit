/**
 * Anomaly Detection Service
 *
 * Main orchestrator for unsupervised anomaly detection over Neo4j/pgvector streams.
 * Combines Isolation Forest and Graph Diffusion detectors with agentic alerting.
 *
 * Performance targets:
 * - 91% precision
 * - p95 latency < 500ms
 */

import { IsolationForestDetector } from './IsolationForestDetector.js';
import { GraphDiffusionDetector } from './GraphDiffusionDetector.js';
import { StreamProcessor } from './StreamProcessor.js';
import { AlertingAgent } from './AlertingAgent.js';
import {
  AnomalyDetectorConfig,
  AlertingConfig,
  StreamDataPoint,
  FeatureVector,
  GraphNode,
  GraphEdge,
  AnomalyScore,
  DetectedAnomaly,
  AnomalyAlert,
  AnomalySeverity,
  DetectionMetrics,
  DetectorHealth,
} from './types.js';

interface ServiceConfig {
  detector: AnomalyDetectorConfig;
  alerting: AlertingConfig;
  redis: {
    url: string;
  };
  training: {
    minSamples: number;
    retrainIntervalMs: number;
    warmupPeriodMs: number;
  };
}

export class AnomalyDetectionService {
  private isolationForest: IsolationForestDetector;
  private graphDiffusion: GraphDiffusionDetector;
  private streamProcessor: StreamProcessor;
  private alertingAgent: AlertingAgent;
  private config: ServiceConfig;

  private isRunning = false;
  private trainingBuffer: FeatureVector[] = [];
  private graphNodesBuffer: GraphNode[] = [];
  private graphEdgesBuffer: GraphEdge[] = [];
  private lastRetrainTime = 0;
  private warmupComplete = false;
  private startTime = 0;

  // Metrics tracking
  private metrics: DetectionMetrics = {
    totalProcessed: 0,
    anomaliesDetected: 0,
    truePositives: 0,
    falsePositives: 0,
    avgLatencyMs: 0,
    p95LatencyMs: 0,
    p99LatencyMs: 0,
    precision: 0,
    recall: 0,
    f1Score: 0,
    lastUpdated: new Date(),
  };
  private latencies: number[] = [];

  constructor(config: Partial<ServiceConfig> = {}) {
    this.config = this.mergeConfig(config);

    this.isolationForest = new IsolationForestDetector(
      this.config.detector.isolationForest,
    );
    this.graphDiffusion = new GraphDiffusionDetector(
      this.config.detector.graphDiffusion,
    );
    this.streamProcessor = new StreamProcessor({
      redisUrl: this.config.redis.url,
      batchSize: this.config.detector.performance.batchSize,
    });
    this.alertingAgent = new AlertingAgent(this.config.alerting);
  }

  private mergeConfig(config: Partial<ServiceConfig>): ServiceConfig {
    return {
      detector: {
        isolationForest: {
          numTrees: 100,
          subsampleSize: 256,
          maxDepth: 8,
          contamination: 0.1,
          bootstrapSampling: true,
          ...config.detector?.isolationForest,
        },
        graphDiffusion: {
          diffusionSteps: 5,
          dampingFactor: 0.85,
          convergenceThreshold: 1e-6,
          neighborhoodSize: 2,
          useEdgeWeights: true,
          embeddingDimension: 64,
          ...config.detector?.graphDiffusion,
        },
        thresholds: {
          anomalyScoreThreshold: 0.7,
          confidenceThreshold: 0.6,
          minEvidenceCount: 2,
          ...config.detector?.thresholds,
        },
        performance: {
          batchSize: 100,
          maxLatencyMs: 500,
          parallelWorkers: 4,
          ...config.detector?.performance,
        },
      },
      alerting: {
        enabled: true,
        deduplicationWindowMs: 300000,
        throttlePerEntityMs: 60000,
        escalationRules: [],
        channels: [],
        ...config.alerting,
      },
      redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        ...config.redis,
      },
      training: {
        minSamples: 500,
        retrainIntervalMs: 3600000, // 1 hour
        warmupPeriodMs: 60000, // 1 minute
        ...config.training,
      },
    };
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    console.log('[AnomalyDetectionService] Initializing...');

    // Initialize stream processor
    await this.streamProcessor.initialize();

    // Initialize alerting agent
    await this.alertingAgent.initialize(this.config.redis.url);

    // Set up stream callbacks
    this.streamProcessor.onData(async (points) => {
      await this.processStreamData(points);
    });

    this.streamProcessor.onGraphUpdate(async (nodes, edges) => {
      await this.processGraphUpdate(nodes, edges);
    });

    console.log('[AnomalyDetectionService] Initialized');
  }

  /**
   * Start the anomaly detection service
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startTime = Date.now();

    console.log('[AnomalyDetectionService] Starting...');

    // Start stream processor
    this.streamProcessor.start().catch((err) => {
      console.error('[AnomalyDetectionService] Stream processor error:', err);
    });

    // Start periodic retraining
    this.startRetrainingLoop();

    console.log('[AnomalyDetectionService] Running');
  }

  /**
   * Stop the service
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    await this.streamProcessor.stop();
    await this.alertingAgent.shutdown();

    console.log('[AnomalyDetectionService] Stopped');
  }

  /**
   * Process incoming stream data
   */
  private async processStreamData(points: StreamDataPoint[]): Promise<void> {
    const startTime = Date.now();

    // Convert to feature vectors
    const featureVectors = StreamProcessor.toFeatureVectors(points);

    // During warmup, just collect training data
    if (!this.warmupComplete) {
      this.trainingBuffer.push(...featureVectors);

      if (
        Date.now() - this.startTime > this.config.training.warmupPeriodMs &&
        this.trainingBuffer.length >= this.config.training.minSamples
      ) {
        await this.trainDetectors();
        this.warmupComplete = true;
      }
      return;
    }

    // Detect anomalies
    const anomalyScores = await this.detectAnomalies(featureVectors);

    // Process anomalies and generate alerts
    const anomalies = this.processAnomalyScores(anomalyScores, featureVectors);

    for (const anomaly of anomalies) {
      await this.alertingAgent.processAnomaly(anomaly);
    }

    // Update metrics
    const latencyMs = Date.now() - startTime;
    this.updateMetrics(featureVectors.length, anomalies.length, latencyMs);

    // Collect samples for incremental training
    this.trainingBuffer.push(
      ...featureVectors.slice(0, Math.min(10, featureVectors.length)),
    );
  }

  /**
   * Process graph structure updates
   */
  private async processGraphUpdate(
    nodes: GraphNode[],
    edges: GraphEdge[],
  ): Promise<void> {
    this.graphNodesBuffer.push(...nodes);
    this.graphEdgesBuffer.push(...edges);

    // If graph diffusion detector is trained, add incrementally
    if (this.graphDiffusion.isTrained()) {
      await this.graphDiffusion.addNodes(nodes, edges);
    }
  }

  /**
   * Train the detectors on collected data
   */
  private async trainDetectors(): Promise<void> {
    console.log(
      `[AnomalyDetectionService] Training detectors with ${this.trainingBuffer.length} samples...`,
    );

    // Train Isolation Forest
    await this.isolationForest.fit(this.trainingBuffer);

    // Train Graph Diffusion if we have graph data
    if (this.graphNodesBuffer.length > 0) {
      await this.graphDiffusion.fit(
        this.graphNodesBuffer,
        this.graphEdgesBuffer,
      );
    }

    this.lastRetrainTime = Date.now();
    console.log('[AnomalyDetectionService] Training complete');
  }

  /**
   * Start periodic retraining loop
   */
  private startRetrainingLoop(): void {
    const retrain = async () => {
      if (!this.isRunning) return;

      const timeSinceRetrain = Date.now() - this.lastRetrainTime;

      if (
        timeSinceRetrain >= this.config.training.retrainIntervalMs &&
        this.trainingBuffer.length >= this.config.training.minSamples
      ) {
        // Partial fit for incremental updates
        await this.isolationForest.partialFit(
          this.trainingBuffer.slice(-this.config.training.minSamples),
        );
        this.trainingBuffer = [];
        this.lastRetrainTime = Date.now();
      }

      setTimeout(retrain, 60000);
    };

    setTimeout(retrain, 60000);
  }

  /**
   * Detect anomalies using both detectors
   */
  private async detectAnomalies(
    featureVectors: FeatureVector[],
  ): Promise<AnomalyScore[]> {
    const allScores: AnomalyScore[] = [];

    // Run Isolation Forest detection
    if (this.isolationForest.isTrained()) {
      const ifScores = await this.isolationForest.detect(featureVectors);
      allScores.push(...ifScores);
    }

    // Run Graph Diffusion detection for neo4j sources
    if (this.graphDiffusion.isTrained()) {
      const neo4jIds = featureVectors
        .filter((v) => v.sourceType === 'neo4j')
        .map((v) => v.sourceId);

      if (neo4jIds.length > 0) {
        const gdScores = await this.graphDiffusion.detect(neo4jIds);
        allScores.push(...gdScores);
      }
    }

    return allScores;
  }

  /**
   * Process anomaly scores and create detected anomalies
   */
  private processAnomalyScores(
    scores: AnomalyScore[],
    vectors: FeatureVector[],
  ): DetectedAnomaly[] {
    const anomalies: DetectedAnomaly[] = [];
    const vectorMap = new Map(vectors.map((v) => [v.id, v]));

    // Group scores by feature ID and combine
    const scoresByFeature = new Map<string, AnomalyScore[]>();
    for (const score of scores) {
      const existing = scoresByFeature.get(score.featureId) || [];
      existing.push(score);
      scoresByFeature.set(score.featureId, existing);
    }

    for (const [featureId, featureScores] of scoresByFeature) {
      // Combine scores from multiple detectors
      const combinedScore = this.combineScores(featureScores);

      if (
        combinedScore.score >= this.config.detector.thresholds.anomalyScoreThreshold &&
        combinedScore.confidence >= this.config.detector.thresholds.confidenceThreshold
      ) {
        const vector = vectorMap.get(featureId);
        const severity = this.scoresToSeverity(combinedScore.score);

        anomalies.push({
          id: `anomaly-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          entityId: vector?.sourceId || featureId,
          entityType: this.inferEntityType(vector),
          anomalyType: this.determineAnomalyType(featureScores),
          severity,
          score: combinedScore.score,
          confidence: combinedScore.confidence,
          description: this.generateDescription(combinedScore, featureScores),
          evidence: this.gatherEvidence(featureScores),
          suggestedActions: this.suggestActions(severity, featureScores),
          detectedAt: new Date(),
          sourceData: vector?.metadata || {},
        });
      }
    }

    return anomalies;
  }

  private combineScores(scores: AnomalyScore[]): {
    score: number;
    confidence: number;
  } {
    if (scores.length === 0) {
      return { score: 0, confidence: 0 };
    }

    if (scores.length === 1) {
      return { score: scores[0].score, confidence: scores[0].confidence };
    }

    // Weighted combination: higher confidence scores get more weight
    let totalWeight = 0;
    let weightedScore = 0;
    let weightedConfidence = 0;

    for (const score of scores) {
      const weight = score.confidence;
      totalWeight += weight;
      weightedScore += score.score * weight;
      weightedConfidence += score.confidence * weight;
    }

    return {
      score: weightedScore / totalWeight,
      confidence: weightedConfidence / totalWeight,
    };
  }

  private scoresToSeverity(score: number): AnomalySeverity {
    if (score >= 0.95) return 'critical';
    if (score >= 0.85) return 'high';
    if (score >= 0.75) return 'medium';
    return 'low';
  }

  private inferEntityType(vector?: FeatureVector): string {
    if (!vector) return 'unknown';

    if (vector.sourceType === 'neo4j') {
      return (vector.metadata.nodeType as string) || 'graph_node';
    }
    if (vector.sourceType === 'pgvector') {
      return 'embedding';
    }
    return 'data_point';
  }

  private determineAnomalyType(
    scores: AnomalyScore[],
  ): DetectedAnomaly['anomalyType'] {
    const types = new Set(scores.map((s) => s.detectorType));

    if (types.has('isolation_forest') && types.has('graph_diffusion')) {
      return 'hybrid';
    }
    if (types.has('graph_diffusion')) {
      return 'graph_diffusion';
    }
    return 'isolation_forest';
  }

  private generateDescription(
    combined: { score: number; confidence: number },
    scores: AnomalyScore[],
  ): string {
    const detectors = [...new Set(scores.map((s) => s.detectorType))].join(', ');
    const topContributors = scores
      .flatMap((s) => s.contributingFeatures)
      .slice(0, 3)
      .map((c) => c.featureName || `feature_${c.featureIndex}`)
      .join(', ');

    return (
      `Anomaly detected with ${(combined.score * 100).toFixed(1)}% score ` +
      `(${(combined.confidence * 100).toFixed(1)}% confidence) by ${detectors}. ` +
      `Key contributors: ${topContributors || 'multiple features'}.`
    );
  }

  private gatherEvidence(scores: AnomalyScore[]): DetectedAnomaly['evidence'] {
    return scores.flatMap((score) =>
      score.contributingFeatures.map((cf) => ({
        type: 'feature' as const,
        description: `${cf.featureName || `Feature ${cf.featureIndex}`} is ${cf.direction}`,
        value: cf.contribution,
        deviation: cf.contribution,
      })),
    );
  }

  private suggestActions(
    severity: AnomalySeverity,
    scores: AnomalyScore[],
  ): string[] {
    const actions: string[] = [];

    if (severity === 'critical' || severity === 'high') {
      actions.push('Immediately investigate the entity');
      actions.push('Review recent changes to entity properties');
      actions.push('Check for related anomalies in connected entities');
    }

    if (scores.some((s) => s.detectorType === 'graph_diffusion')) {
      actions.push('Analyze network neighborhood for suspicious patterns');
      actions.push('Verify relationship authenticity');
    }

    if (scores.some((s) => s.detectorType === 'isolation_forest')) {
      actions.push('Compare feature values against historical baselines');
      actions.push('Check for data quality issues');
    }

    actions.push('Mark as false positive if investigation shows normal behavior');

    return actions;
  }

  private updateMetrics(
    processed: number,
    anomalies: number,
    latencyMs: number,
  ): void {
    this.metrics.totalProcessed += processed;
    this.metrics.anomaliesDetected += anomalies;

    // Track latencies for percentile calculation
    this.latencies.push(latencyMs);
    if (this.latencies.length > 1000) {
      this.latencies = this.latencies.slice(-1000);
    }

    // Update average latency
    this.metrics.avgLatencyMs =
      this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;

    // Update percentiles
    const sorted = [...this.latencies].sort((a, b) => a - b);
    this.metrics.p95LatencyMs = sorted[Math.floor(sorted.length * 0.95)] || 0;
    this.metrics.p99LatencyMs = sorted[Math.floor(sorted.length * 0.99)] || 0;

    // Update precision (estimated from feedback)
    if (this.metrics.truePositives + this.metrics.falsePositives > 0) {
      this.metrics.precision =
        this.metrics.truePositives /
        (this.metrics.truePositives + this.metrics.falsePositives);
    }

    this.metrics.lastUpdated = new Date();
  }

  /**
   * Record feedback for precision tracking
   */
  recordFeedback(alertId: string, isTruePositive: boolean): void {
    if (isTruePositive) {
      this.metrics.truePositives++;
    } else {
      this.metrics.falsePositives++;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): DetectionMetrics {
    return { ...this.metrics };
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<DetectorHealth> {
    const errors: string[] = [];

    const ifState = this.isolationForest.getState();
    const gdState = this.graphDiffusion.getState();

    if (ifState === 'error') errors.push('Isolation Forest in error state');
    if (gdState === 'error') errors.push('Graph Diffusion in error state');

    const status =
      errors.length > 0
        ? 'unhealthy'
        : !this.warmupComplete
          ? 'degraded'
          : 'healthy';

    return {
      status,
      detectorState: this.warmupComplete ? 'ready' : 'initializing',
      neo4jConnected: true, // Assumed via stream processor
      pgvectorConnected: true,
      redisConnected: this.streamProcessor.isActive(),
      queueDepth: this.streamProcessor.getBufferSize(),
      lastDetection: this.metrics.lastUpdated,
      errors,
    };
  }

  /**
   * Manually trigger detection on provided data (for testing)
   */
  async detectManual(data: StreamDataPoint[]): Promise<DetectedAnomaly[]> {
    const featureVectors = StreamProcessor.toFeatureVectors(data);
    const scores = await this.detectAnomalies(featureVectors);
    return this.processAnomalyScores(scores, featureVectors);
  }

  /**
   * Train with provided data (for testing)
   */
  async trainManual(data: FeatureVector[]): Promise<void> {
    await this.isolationForest.fit(data);
  }
}
