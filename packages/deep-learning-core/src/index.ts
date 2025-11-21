/**
 * @intelgraph/deep-learning-core
 * Core deep learning infrastructure and utilities for Summit intelligence platform
 */

import { z } from 'zod';

// ============================================================================
// Core Types and Schemas
// ============================================================================

/**
 * Model metadata schema
 */
export const ModelMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  architecture: z.string(),
  framework: z.enum(['tensorflow', 'pytorch', 'onnx', 'custom']),
  description: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metrics: z.record(z.string(), z.number()).optional(),
  parameters: z.number().optional(),
  inputShape: z.array(z.number()).optional(),
  outputShape: z.array(z.number()).optional(),
});

export type ModelMetadata = z.infer<typeof ModelMetadataSchema>;

/**
 * Training configuration schema
 */
export const TrainingConfigSchema = z.object({
  modelId: z.string(),
  batchSize: z.number().positive(),
  epochs: z.number().positive(),
  learningRate: z.number().positive(),
  optimizer: z.enum(['adam', 'sgd', 'rmsprop', 'adamw', 'adagrad']),
  lossFunction: z.string(),
  metrics: z.array(z.string()),
  validationSplit: z.number().min(0).max(1).optional(),
  earlyStopping: z
    .object({
      monitor: z.string(),
      patience: z.number().positive(),
      minDelta: z.number().optional(),
    })
    .optional(),
  checkpointing: z
    .object({
      frequency: z.number().positive(),
      saveWeightsOnly: z.boolean().optional(),
    })
    .optional(),
  distributed: z
    .object({
      strategy: z.enum(['data_parallel', 'model_parallel', 'pipeline']),
      numWorkers: z.number().positive(),
    })
    .optional(),
});

export type TrainingConfig = z.infer<typeof TrainingConfigSchema>;

/**
 * Training status schema
 */
export const TrainingStatusSchema = z.object({
  jobId: z.string(),
  modelId: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'stopped']),
  currentEpoch: z.number(),
  totalEpochs: z.number(),
  currentBatch: z.number().optional(),
  totalBatches: z.number().optional(),
  metrics: z.record(z.string(), z.number()).optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  error: z.string().optional(),
});

export type TrainingStatus = z.infer<typeof TrainingStatusSchema>;

/**
 * Inference request schema
 */
export const InferenceRequestSchema = z.object({
  modelId: z.string(),
  version: z.string().optional(),
  inputs: z.record(z.string(), z.any()),
  batchSize: z.number().positive().optional(),
  returnMetadata: z.boolean().optional(),
});

export type InferenceRequest = z.infer<typeof InferenceRequestSchema>;

/**
 * Inference response schema
 */
export const InferenceResponseSchema = z.object({
  predictions: z.array(z.any()),
  confidences: z.array(z.number()).optional(),
  metadata: z
    .object({
      modelId: z.string(),
      version: z.string(),
      inferenceTime: z.number(),
      batchSize: z.number(),
    })
    .optional(),
});

export type InferenceResponse = z.infer<typeof InferenceResponseSchema>;

/**
 * Model deployment configuration
 */
export const DeploymentConfigSchema = z.object({
  modelId: z.string(),
  version: z.string(),
  environment: z.enum(['dev', 'staging', 'production']),
  replicas: z.number().positive().optional(),
  resources: z
    .object({
      cpuRequest: z.string().optional(),
      cpuLimit: z.string().optional(),
      memoryRequest: z.string().optional(),
      memoryLimit: z.string().optional(),
      gpu: z.number().optional(),
    })
    .optional(),
  autoScaling: z
    .object({
      enabled: z.boolean(),
      minReplicas: z.number().positive(),
      maxReplicas: z.number().positive(),
      targetCpuUtilization: z.number().min(0).max(100),
    })
    .optional(),
  batching: z
    .object({
      enabled: z.boolean(),
      maxBatchSize: z.number().positive(),
      maxWaitTimeMs: z.number().positive(),
    })
    .optional(),
});

export type DeploymentConfig = z.infer<typeof DeploymentConfigSchema>;

// ============================================================================
// Layer Definitions
// ============================================================================

export interface Layer {
  type: string;
  name: string;
  config: Record<string, any>;
}

export interface DenseLayerConfig {
  units: number;
  activation?: string;
  useBias?: boolean;
  kernelInitializer?: string;
  biasInitializer?: string;
  regularization?: {
    l1?: number;
    l2?: number;
  };
}

export interface ConvolutionalLayerConfig {
  filters: number;
  kernelSize: number | [number, number];
  strides?: number | [number, number];
  padding?: 'valid' | 'same';
  activation?: string;
  useBias?: boolean;
}

export interface RecurrentLayerConfig {
  units: number;
  activation?: string;
  recurrentActivation?: string;
  useBias?: boolean;
  dropout?: number;
  recurrentDropout?: number;
  returnSequences?: boolean;
}

// ============================================================================
// Model Zoo and Registry
// ============================================================================

export interface ModelZooEntry {
  id: string;
  name: string;
  architecture: string;
  pretrainedWeights?: string;
  taskType: 'classification' | 'regression' | 'detection' | 'segmentation' | 'generation';
  domain: 'vision' | 'nlp' | 'audio' | 'multimodal' | 'general';
  description: string;
  paperUrl?: string;
  citationBibtex?: string;
}

export const MODEL_ZOO: Record<string, ModelZooEntry> = {
  'resnet50-imagenet': {
    id: 'resnet50-imagenet',
    name: 'ResNet-50',
    architecture: 'ResNet',
    pretrainedWeights: 'imagenet',
    taskType: 'classification',
    domain: 'vision',
    description: 'Deep residual network with 50 layers trained on ImageNet',
    paperUrl: 'https://arxiv.org/abs/1512.03385',
  },
  'bert-base-uncased': {
    id: 'bert-base-uncased',
    name: 'BERT Base Uncased',
    architecture: 'BERT',
    pretrainedWeights: 'google',
    taskType: 'classification',
    domain: 'nlp',
    description: 'Bidirectional Encoder Representations from Transformers',
    paperUrl: 'https://arxiv.org/abs/1810.04805',
  },
  'gpt2-medium': {
    id: 'gpt2-medium',
    name: 'GPT-2 Medium',
    architecture: 'GPT',
    pretrainedWeights: 'openai',
    taskType: 'generation',
    domain: 'nlp',
    description: 'Generative Pre-trained Transformer 2',
    paperUrl: 'https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf',
  },
  't5-base': {
    id: 't5-base',
    name: 'T5 Base',
    architecture: 'T5',
    pretrainedWeights: 'google',
    taskType: 'generation',
    domain: 'nlp',
    description: 'Text-to-Text Transfer Transformer',
    paperUrl: 'https://arxiv.org/abs/1910.10683',
  },
};

// ============================================================================
// Optimization and Acceleration
// ============================================================================

export interface OptimizationConfig {
  technique: 'quantization' | 'pruning' | 'distillation' | 'onnx_export';
  parameters: Record<string, any>;
}

export interface QuantizationConfig extends OptimizationConfig {
  technique: 'quantization';
  parameters: {
    bitWidth: 8 | 4 | 2;
    method: 'dynamic' | 'static' | 'qat';
    calibrationDataset?: string;
  };
}

export interface PruningConfig extends OptimizationConfig {
  technique: 'pruning';
  parameters: {
    pruningRate: number;
    method: 'magnitude' | 'structured' | 'unstructured';
    fineTuneEpochs?: number;
  };
}

export interface DistillationConfig extends OptimizationConfig {
  technique: 'distillation';
  parameters: {
    teacherModelId: string;
    studentModelId: string;
    temperature: number;
    alpha: number;
  };
}

// ============================================================================
// Model Interpretability
// ============================================================================

export interface ExplainabilityRequest {
  modelId: string;
  version: string;
  input: Record<string, any>;
  method: 'saliency' | 'grad_cam' | 'integrated_gradients' | 'shap' | 'lime';
  outputIndex?: number;
}

export interface ExplainabilityResponse {
  method: string;
  attributions: Record<string, number[]>;
  visualization?: string; // Base64 encoded image
  metadata?: Record<string, any>;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Generate a unique model ID
 */
export function generateModelId(prefix = 'model'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Calculate model size from parameters
 */
export function estimateModelSize(parameters: number, dtype = 'float32'): number {
  const bytesPerParam = dtype === 'float32' ? 4 : dtype === 'float16' ? 2 : 1;
  return parameters * bytesPerParam;
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Validate model inputs against expected shape
 */
export function validateInputShape(
  input: number[],
  expectedShape: number[],
): { valid: boolean; error?: string } {
  if (input.length !== expectedShape.length) {
    return {
      valid: false,
      error: `Input dimension mismatch: expected ${expectedShape.length}, got ${input.length}`,
    };
  }

  for (let i = 0; i < input.length; i++) {
    if (expectedShape[i] !== -1 && input[i] !== expectedShape[i]) {
      return {
        valid: false,
        error: `Shape mismatch at dimension ${i}: expected ${expectedShape[i]}, got ${input[i]}`,
      };
    }
  }

  return { valid: true };
}

// ============================================================================
// Constants
// ============================================================================

export const SUPPORTED_FRAMEWORKS = ['tensorflow', 'pytorch', 'onnx', 'custom'] as const;
export const SUPPORTED_OPTIMIZERS = ['adam', 'sgd', 'rmsprop', 'adamw', 'adagrad'] as const;
export const SUPPORTED_ACTIVATIONS = [
  'relu',
  'sigmoid',
  'tanh',
  'softmax',
  'leaky_relu',
  'elu',
  'selu',
  'gelu',
] as const;

export type Framework = (typeof SUPPORTED_FRAMEWORKS)[number];
export type Optimizer = (typeof SUPPORTED_OPTIMIZERS)[number];
export type Activation = (typeof SUPPORTED_ACTIVATIONS)[number];
