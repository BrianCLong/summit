import { TrainingMetrics } from '../training/TrainingPipeline.js';

export type ModelEngine =
  | 'entity-resolution'
  | 'object-detection/yolo'
  | 'speech-to-text/whisper'
  | 'nlp/spacy'
  | 'multimodal/clip'
  | string;

type InputModality =
  | 'graph'
  | 'image'
  | 'audio'
  | 'text'
  | 'video'
  | 'multimodal';

export interface PerformanceSnapshot {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  evaluationDate?: Date | string;
  dataset?: string;
  testSetSize?: number;
  context?: Record<string, any>;
}

export interface InferenceRecord {
  modelVersionId: string;
  modelType: ModelEngine;
  latencyMs: number;
  success: boolean;
  inputType: InputModality;
  timestamp?: Date;
  actualLabel?: string;
  predictedLabel?: string;
  metadata?: Record<string, any>;
  metrics?: Partial<PerformanceSnapshot>;
}

export interface RealtimeMetricSnapshot {
  modelVersionId: string;
  modelType: ModelEngine;
  averageLatencyMs: number;
  requestCount: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  lastUpdated: string;
  lastPerformance?: PerformanceSnapshot;
}

export interface ModelPerformanceRecord extends PerformanceSnapshot {
  modelVersionId: string;
  modelType: ModelEngine;
  evaluationContext?: Record<string, any>;
}

export interface ABTestVariant {
  id: string;
  modelVersionId: string;
  weight: number;
  description?: string;
}

export interface ABTestConfig {
  name: string;
  description?: string;
  modelType: ModelEngine;
  variants: ABTestVariant[];
  status?: 'active' | 'paused' | 'completed';
  metadata?: Record<string, any>;
}

export interface ABTestAssignment {
  experimentId: string;
  variantId: string;
  modelVersionId: string;
}

export interface ABTestOutcome {
  experimentId: string;
  variantId: string;
  subjectId: string;
  metrics: Partial<PerformanceSnapshot> & { inferenceLatencyMs?: number };
}

export interface HyperparameterSearchSpace {
  [parameter: string]:
    | {
        type: 'int';
        min: number;
        max: number;
        step?: number;
      }
    | {
        type: 'float';
        min: number;
        max: number;
        step?: number;
        log?: boolean;
      }
    | {
        type: 'categorical';
        choices: (string | number | boolean)[];
      };
}

export interface HyperparameterOptimizationRequest {
  modelType: string;
  searchSpace?: HyperparameterSearchSpace;
  nTrials?: number;
  timeoutSeconds?: number;
}

export interface HyperparameterOptimizationResult {
  modelType: string;
  bestHyperparameters: Record<string, any>;
  bestMetrics: PerformanceSnapshot;
  trials: number;
  studySummary?: Record<string, any>;
}

export interface RegisteredModel extends Omit<TrainingMetrics, 'trainingTime'> {
  id: string;
  version: string;
  modelType: ModelEngine;
  isActive: boolean;
  createdAt: Date;
  modelPath: string;
  hyperparameters: Record<string, any>;
  metadata?: Record<string, any>;
}
