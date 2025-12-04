/**
 * Anomaly Detection Types
 *
 * Core type definitions for the unsupervised anomaly detection system
 * supporting OSINT/CTI outlier detection over Neo4j/pgvector streams.
 */

export type AnomalyType =
  | 'isolation_forest'
  | 'graph_diffusion'
  | 'statistical'
  | 'hybrid';

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export type AlertPriority = 'p4' | 'p3' | 'p2' | 'p1' | 'p0';

export type DataSourceType = 'neo4j' | 'pgvector' | 'redis_stream';

export type DetectorState = 'initializing' | 'ready' | 'detecting' | 'error';

/**
 * Feature vector for anomaly detection
 */
export interface FeatureVector {
  id: string;
  sourceId: string;
  sourceType: DataSourceType;
  features: number[];
  metadata: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Detection result from anomaly detector
 */
export interface AnomalyScore {
  featureId: string;
  score: number;
  isAnomaly: boolean;
  detectorType: AnomalyType;
  confidence: number;
  contributingFeatures: FeatureContribution[];
  timestamp: Date;
}

/**
 * Feature contribution to anomaly score
 */
export interface FeatureContribution {
  featureIndex: number;
  featureName?: string;
  contribution: number;
  direction: 'high' | 'low' | 'neutral';
}

/**
 * Graph node for diffusion-based detection
 */
export interface GraphNode {
  id: string;
  type: string;
  properties: Record<string, unknown>;
  embedding?: number[];
  degree: number;
  clusteringCoefficient: number;
}

/**
 * Graph edge for diffusion-based detection
 */
export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  weight: number;
  properties: Record<string, unknown>;
}

/**
 * Graph diffusion state
 */
export interface DiffusionState {
  nodeId: string;
  diffusionScore: number;
  hops: number;
  visitedNodes: Set<string>;
  timestamp: Date;
}

/**
 * Detected anomaly with full context
 */
export interface DetectedAnomaly {
  id: string;
  entityId: string;
  entityType: string;
  anomalyType: AnomalyType;
  severity: AnomalySeverity;
  score: number;
  confidence: number;
  description: string;
  evidence: AnomalyEvidence[];
  suggestedActions: string[];
  detectedAt: Date;
  sourceData: Record<string, unknown>;
}

/**
 * Evidence supporting anomaly detection
 */
export interface AnomalyEvidence {
  type: 'feature' | 'graph' | 'temporal' | 'semantic';
  description: string;
  value: unknown;
  expectedRange?: { min: number; max: number };
  deviation?: number;
}

/**
 * Alert generated from detected anomaly
 */
export interface AnomalyAlert {
  id: string;
  anomalyId: string;
  priority: AlertPriority;
  severity: AnomalySeverity;
  title: string;
  description: string;
  entityId: string;
  entityType: string;
  investigationId?: string;
  assignee?: string;
  status: 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'dismissed';
  createdAt: Date;
  updatedAt: Date;
  ttl?: number;
  metadata: Record<string, unknown>;
}

/**
 * Stream data point from Neo4j or pgvector
 */
export interface StreamDataPoint {
  id: string;
  sourceType: DataSourceType;
  timestamp: Date;
  data: {
    neo4j?: {
      nodeId: string;
      nodeType: string;
      properties: Record<string, unknown>;
      relationships?: Array<{
        type: string;
        targetId: string;
        properties: Record<string, unknown>;
      }>;
    };
    pgvector?: {
      id: string;
      embedding: number[];
      metadata: Record<string, unknown>;
      similarity?: number;
    };
  };
}

/**
 * Configuration for Isolation Forest detector
 */
export interface IsolationForestConfig {
  numTrees: number;
  subsampleSize: number;
  maxDepth: number;
  contamination: number;
  bootstrapSampling: boolean;
  randomState?: number;
}

/**
 * Configuration for Graph Diffusion detector
 */
export interface GraphDiffusionConfig {
  diffusionSteps: number;
  dampingFactor: number;
  convergenceThreshold: number;
  neighborhoodSize: number;
  useEdgeWeights: boolean;
  embeddingDimension: number;
}

/**
 * Combined detector configuration
 */
export interface AnomalyDetectorConfig {
  isolationForest: IsolationForestConfig;
  graphDiffusion: GraphDiffusionConfig;
  thresholds: {
    anomalyScoreThreshold: number;
    confidenceThreshold: number;
    minEvidenceCount: number;
  };
  performance: {
    batchSize: number;
    maxLatencyMs: number;
    parallelWorkers: number;
  };
}

/**
 * Alerting configuration
 */
export interface AlertingConfig {
  enabled: boolean;
  deduplicationWindowMs: number;
  throttlePerEntityMs: number;
  escalationRules: EscalationRule[];
  channels: AlertChannel[];
}

/**
 * Escalation rule for alerts
 */
export interface EscalationRule {
  condition: {
    severity?: AnomalySeverity[];
    priority?: AlertPriority[];
    entityTypes?: string[];
    ageMinutes?: number;
  };
  action: 'notify' | 'escalate' | 'auto_investigate';
  target: string;
}

/**
 * Alert channel configuration
 */
export interface AlertChannel {
  type: 'redis' | 'webhook' | 'graphql_subscription' | 'queue';
  endpoint: string;
  enabled: boolean;
  filters?: {
    minSeverity?: AnomalySeverity;
    entityTypes?: string[];
  };
}

/**
 * Metrics for anomaly detection performance
 */
export interface DetectionMetrics {
  totalProcessed: number;
  anomaliesDetected: number;
  truePositives: number;
  falsePositives: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  precision: number;
  recall: number;
  f1Score: number;
  lastUpdated: Date;
}

/**
 * Health status for detector
 */
export interface DetectorHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  detectorState: DetectorState;
  neo4jConnected: boolean;
  pgvectorConnected: boolean;
  redisConnected: boolean;
  queueDepth: number;
  lastDetection?: Date;
  errors: string[];
}
