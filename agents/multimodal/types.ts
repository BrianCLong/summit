/**
 * Multimodal Fusion Pipeline Types
 * Core type definitions for OSINT text/image/video fusion into Neo4j embeddings
 */

// Modality Types
export type ModalityType = 'text' | 'image' | 'video' | 'audio' | 'document';

export type EmbeddingModel =
  | 'clip-vit-base-patch32'
  | 'clip-vit-large-patch14'
  | 'openai-clip'
  | 'text-embedding-3-small'
  | 'text-embedding-3-large'
  | 'all-MiniLM-L6-v2';

// Base Embedding Types
export interface BaseEmbedding {
  id: string;
  vector: number[];
  dimension: number;
  model: EmbeddingModel;
  modality: ModalityType;
  timestamp: Date;
  metadata: EmbeddingMetadata;
}

export interface EmbeddingMetadata {
  sourceId: string;
  sourceUri: string;
  investigationId: string;
  confidence: number;
  processingTime: number;
  provenance: ProvenanceInfo;
}

export interface ProvenanceInfo {
  extractorName: string;
  extractorVersion: string;
  modelName: string;
  modelVersion: string;
  processingParams: Record<string, unknown>;
  errors: string[];
  warnings: string[];
}

// Text Embeddings
export interface TextEmbedding extends BaseEmbedding {
  modality: 'text';
  text: string;
  language?: string;
  entities?: ExtractedEntity[];
  sentiment?: SentimentScore;
}

export interface ExtractedEntity {
  text: string;
  type: string;
  startOffset: number;
  endOffset: number;
  confidence: number;
}

export interface SentimentScore {
  positive: number;
  negative: number;
  neutral: number;
}

// Image Embeddings (CLIP/ViT)
export interface ImageEmbedding extends BaseEmbedding {
  modality: 'image';
  imagePath: string;
  width: number;
  height: number;
  format: string;
  clipVector?: number[];
  vitVector?: number[];
  objects?: DetectedObject[];
  faces?: DetectedFace[];
  ocrText?: string;
}

export interface DetectedObject {
  label: string;
  confidence: number;
  boundingBox: BoundingBox;
}

export interface DetectedFace {
  faceId: string;
  confidence: number;
  boundingBox: BoundingBox;
  embedding?: number[];
  landmarks?: FaceLandmarks;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceLandmarks {
  leftEye: [number, number];
  rightEye: [number, number];
  nose: [number, number];
  leftMouth: [number, number];
  rightMouth: [number, number];
}

// Video Embeddings
export interface VideoEmbedding extends BaseEmbedding {
  modality: 'video';
  videoPath: string;
  duration: number;
  fps: number;
  width: number;
  height: number;
  keyFrames: KeyFrame[];
  aggregateVector: number[];
  temporalSegments: TemporalSegment[];
}

export interface KeyFrame {
  frameNumber: number;
  timestamp: number;
  embedding: number[];
  objects?: DetectedObject[];
  faces?: DetectedFace[];
  sceneType?: string;
}

export interface TemporalSegment {
  startTime: number;
  endTime: number;
  embedding: number[];
  activity?: string;
  confidence: number;
}

// Fusion Types
export interface FusedEmbedding {
  id: string;
  investigationId: string;
  entityId: string;
  fusionMethod: FusionMethod;
  modalityVectors: ModalityVector[];
  fusedVector: number[];
  fusedDimension: number;
  crossModalScore: number;
  hallucinationScore: number;
  verificationStatus: VerificationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type FusionMethod =
  | 'concatenation'
  | 'average'
  | 'weighted_average'
  | 'attention'
  | 'cross_modal_transformer';

export interface ModalityVector {
  modality: ModalityType;
  vector: number[];
  weight: number;
  sourceId: string;
  confidence: number;
}

export type VerificationStatus =
  | 'unverified'
  | 'auto_verified'
  | 'human_verified'
  | 'flagged'
  | 'rejected';

// Pipeline Configuration
export interface FusionPipelineConfig {
  clipModel: EmbeddingModel;
  textModel: EmbeddingModel;
  fusionMethod: FusionMethod;
  targetDimension: number;
  hallucinationThreshold: number;
  crossModalThreshold: number;
  batchSize: number;
  maxConcurrency: number;
  enableGPU: boolean;
  cacheEnabled: boolean;
  cacheTTL: number;
}

export interface PipelineJob {
  id: string;
  investigationId: string;
  status: JobStatus;
  sources: SourceInput[];
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  results?: FusedEmbedding[];
  errors: PipelineError[];
}

export type JobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface SourceInput {
  type: ModalityType;
  uri: string;
  metadata?: Record<string, unknown>;
}

export interface PipelineError {
  code: string;
  message: string;
  sourceId?: string;
  modality?: ModalityType;
  timestamp: Date;
  recoverable: boolean;
}

// Hallucination Detection
export interface HallucinationCheckResult {
  sourceId: string;
  isHallucination: boolean;
  score: number;
  reasons: HallucinationReason[];
  suggestedAction: HallucinationAction;
}

export interface HallucinationReason {
  type: HallucinationType;
  description: string;
  evidence: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export type HallucinationType =
  | 'semantic_inconsistency'
  | 'cross_modal_mismatch'
  | 'temporal_inconsistency'
  | 'entity_conflict'
  | 'confidence_anomaly'
  | 'embedding_outlier';

export type HallucinationAction =
  | 'accept'
  | 'flag_for_review'
  | 'auto_correct'
  | 'reject';

// Neo4j Graph Embedding Types
export interface GraphEmbeddingNode {
  nodeId: string;
  labels: string[];
  properties: Record<string, unknown>;
  embedding: number[];
  neighbors: NeighborInfo[];
}

export interface NeighborInfo {
  nodeId: string;
  relationship: string;
  weight: number;
}

export interface GraphEmbeddingConfig {
  algorithm: 'node2vec' | 'graphsage' | 'gat' | 'gcn';
  dimensions: number;
  walkLength: number;
  numWalks: number;
  p: number; // Return parameter
  q: number; // In-out parameter
}

// pgvector Storage Types
export interface VectorStoreConfig {
  tableName: string;
  dimension: number;
  indexType: 'ivfflat' | 'hnsw';
  distanceMetric: 'cosine' | 'euclidean' | 'inner_product';
  indexParams: IVFFlatParams | HNSWParams;
}

export interface IVFFlatParams {
  lists: number;
  probes: number;
}

export interface HNSWParams {
  m: number;
  efConstruction: number;
  efSearch: number;
}

export interface VectorSearchResult {
  id: string;
  entityId: string;
  distance: number;
  similarity: number;
  metadata: Record<string, unknown>;
}

// Pipeline Events
export type PipelineEvent =
  | { type: 'job_started'; jobId: string; timestamp: Date }
  | { type: 'modality_processed'; jobId: string; modality: ModalityType; sourceId: string }
  | { type: 'fusion_completed'; jobId: string; entityId: string; fusedEmbeddingId: string }
  | { type: 'hallucination_detected'; jobId: string; sourceId: string; score: number }
  | { type: 'job_completed'; jobId: string; totalEmbeddings: number }
  | { type: 'job_failed'; jobId: string; error: string };

export interface PipelineEventHandler {
  onJobStarted?(jobId: string): void;
  onModalityProcessed?(jobId: string, modality: ModalityType, sourceId: string): void;
  onFusionCompleted?(jobId: string, entityId: string, fusedEmbeddingId: string): void;
  onHallucinationDetected?(jobId: string, sourceId: string, score: number): void;
  onJobCompleted?(jobId: string, totalEmbeddings: number): void;
  onJobFailed?(jobId: string, error: string): void;
}

// Metrics Types
export interface PipelineMetrics {
  totalJobsProcessed: number;
  totalEmbeddingsGenerated: number;
  averageProcessingTime: number;
  hallucinationRate: number;
  crossModalAccuracy: number;
  modalityDistribution: Record<ModalityType, number>;
  errorRate: number;
}

export interface PerformanceMetrics {
  embeddingLatencyMs: number;
  fusionLatencyMs: number;
  vectorSearchLatencyMs: number;
  throughputPerSecond: number;
  memoryUsageMB: number;
  gpuUtilization?: number;
}
