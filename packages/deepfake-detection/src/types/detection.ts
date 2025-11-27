/**
 * Detection type definitions
 */

export enum DetectorType {
  VIDEO_FACE = 'VIDEO_FACE',
  VIDEO_GENERIC = 'VIDEO_GENERIC',
  AUDIO_SPECTROGRAM = 'AUDIO_SPECTROGRAM',
  AUDIO_WAVEFORM = 'AUDIO_WAVEFORM',
  IMAGE_MANIPULATION = 'IMAGE_MANIPULATION',
  IMAGE_GAN = 'IMAGE_GAN',
  TEXT_SYNTHETIC = 'TEXT_SYNTHETIC',
  ENSEMBLE = 'ENSEMBLE',
}

export enum DetectionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface DeepfakeDetection {
  id: string;
  mediaId: string;
  
  // Detection result
  isSynthetic: boolean;
  confidenceScore: number; // 0.0 to 1.0
  
  // Detector info
  detectorType: DetectorType;
  modelVersion: string;
  modelId?: string;
  
  // Detailed results
  frameScores?: FrameScore[];
  segmentScores?: SegmentScore[];
  features?: Record<string, unknown>;
  explanation?: ExplanationData;
  
  // Performance metrics
  processingTimeMs: number;
  processedAt: Date;
  
  // Status
  status: DetectionStatus;
  errorMessage?: string;
  
  // Audit
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Relationships
  investigationId?: string;
  entityId?: string;
}

export interface FrameScore {
  frameNumber: number;
  timestamp: number; // seconds
  score: number; // 0.0 to 1.0
  regions?: BoundingBox[];
  features?: Record<string, unknown>;
}

export interface SegmentScore {
  segmentId: number;
  startTime: number; // seconds
  endTime: number; // seconds
  score: number; // 0.0 to 1.0
  features?: Record<string, unknown>;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  label?: string;
}

export interface ExplanationData {
  method: ExplanationMethod;
  visualizationUrl?: string;
  topFeatures?: string[];
  featureImportance?: Record<string, number>;
  reasoning?: string;
  heatmapUrl?: string;
  attentionWeights?: number[][];
}

export enum ExplanationMethod {
  GRAD_CAM = 'GRAD_CAM',
  LIME = 'LIME',
  SHAP = 'SHAP',
  ATTENTION_WEIGHTS = 'ATTENTION_WEIGHTS',
  INTEGRATED_GRADIENTS = 'INTEGRATED_GRADIENTS',
}

export interface EnsembleResult {
  id: string;
  mediaId: string;
  
  // Aggregate result
  finalConfidence: number;
  isSynthetic: boolean;
  
  // Component scores
  videoConfidence?: number;
  audioConfidence?: number;
  imageConfidence?: number;
  textConfidence?: number;
  
  // Voting details
  votingMethod: VotingMethod;
  componentDetectionIds: string[];
  weights?: Record<DetectorType, number>;
  
  // Metadata
  createdAt: Date;
}

export enum VotingMethod {
  WEIGHTED_AVERAGE = 'WEIGHTED_AVERAGE',
  MAJORITY_VOTE = 'MAJORITY_VOTE',
  MAX_CONFIDENCE = 'MAX_CONFIDENCE',
  UNANIMOUS = 'UNANIMOUS',
}

export interface DetectionConfig {
  enabledDetectors?: DetectorType[];
  confidenceThreshold?: number; // 0.0 to 1.0
  enableExplanation?: boolean;
  priority?: number; // 1-10, higher = faster processing
  timeoutMs?: number;
  maxFrames?: number; // for video
  maxSegments?: number; // for audio
  ensembleMethod?: VotingMethod;
  customWeights?: Record<DetectorType, number>;
}

export interface DetectionRequest {
  mediaId: string;
  config?: DetectionConfig;
  requestedBy?: string;
  investigationId?: string;
  metadata?: Record<string, unknown>;
}

export interface DetectionResult {
  detection: DeepfakeDetection;
  ensembleResult?: EnsembleResult;
  media: {
    id: string;
    type: string;
    url: string;
  };
}
