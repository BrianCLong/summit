import { ExtensionPoint } from '../ExtensionPoint.js';

/**
 * ML Model extension point for custom machine learning integrations
 */
export interface MLModelExtension extends ExtensionPoint<MLModelInput, MLModelOutput> {
  type: 'ml-model';
  name: string;
  description: string;
  modelType: 'classification' | 'regression' | 'clustering' | 'nlp' | 'embedding' | 'custom';
  supportedInputTypes: string[];
}

export interface MLModelInput {
  data: any;
  inputType: string;
  options?: {
    threshold?: number;
    topK?: number;
    temperature?: number;
    maxTokens?: number;
    [key: string]: any;
  };
}

export interface MLModelOutput {
  predictions: Prediction[];
  embeddings?: number[][];
  metadata: {
    modelVersion: string;
    inferenceTimeMs: number;
    tokenCount?: number;
  };
}

export interface Prediction {
  label: string;
  confidence: number;
  value?: any;
  explanation?: string;
}

/**
 * Base class for ML model extensions
 */
export abstract class BaseMLModelExtension implements MLModelExtension {
  readonly type = 'ml-model' as const;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly modelType: MLModelExtension['modelType'],
    public readonly supportedInputTypes: string[]
  ) {}

  abstract execute(input: MLModelInput): Promise<MLModelOutput>;

  /**
   * Load the model into memory
   */
  abstract loadModel(): Promise<void>;

  /**
   * Unload model from memory
   */
  abstract unloadModel(): Promise<void>;

  /**
   * Get model info
   */
  abstract getModelInfo(): Promise<ModelInfo>;
}

export interface ModelInfo {
  name: string;
  version: string;
  size: number;
  lastTrained?: Date;
  metrics?: Record<string, number>;
}
