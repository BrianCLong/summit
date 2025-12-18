import { MediaType } from '../services/MediaUploadService.js';

export interface ExtractionEngineConfig {
  pythonPath: string;
  modelsPath: string;
  tempPath: string;
  maxConcurrentJobs: number;
  enableGPU: boolean;
}

export interface ExtractionRequest {
  jobId: string;
  mediaSourceId: string;
  mediaPath: string;
  mediaType: MediaType;
  extractionMethods: string[];
  options: Record<string, any>;
}

export interface ExtractionResult {
  jobId: string;
  method: string;
  entities: ExtractedEntity[];
  metrics: ExtractionMetrics;
  errors: string[];
}

export interface ExtractedEntity {
  entityType: string;
  extractedText?: string;
  boundingBox?: BoundingBox;
  temporalRange?: TemporalRange;
  confidence: number;
  extractionMethod: string;
  extractionVersion: string;
  embeddings?: {
    text?: number[];
    visual?: number[];
    audio?: number[];
  };
  metadata: Record<string, any>;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface TemporalRange {
  startTime: number;
  endTime: number;
  confidence: number;
}

export interface ExtractionMetrics {
  processingTime: number;
  entitiesExtracted: number;
  averageConfidence: number;
  memoryUsage: number;
  gpuUsage?: number;
  modelVersion: string;
}
