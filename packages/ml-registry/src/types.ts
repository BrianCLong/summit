/**
 * Core types for ML Model Registry
 */

import { z } from 'zod';

// Model Stages
export enum ModelStage {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  ARCHIVED = 'archived',
}

// Model Framework Types
export enum ModelFramework {
  PYTORCH = 'pytorch',
  TENSORFLOW = 'tensorflow',
  SCIKIT_LEARN = 'scikit-learn',
  XGBOOST = 'xgboost',
  ONNX = 'onnx',
  CUSTOM = 'custom',
}

// Model Type Categories
export enum ModelType {
  CLASSIFICATION = 'classification',
  REGRESSION = 'regression',
  CLUSTERING = 'clustering',
  ANOMALY_DETECTION = 'anomaly_detection',
  GRAPH_NEURAL_NETWORK = 'gnn',
  TRANSFORMER = 'transformer',
  ENSEMBLE = 'ensemble',
}

// Model Metadata Schema
export const ModelMetadataSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  version: z.string(),
  framework: z.nativeEnum(ModelFramework),
  model_type: z.nativeEnum(ModelType),
  stage: z.nativeEnum(ModelStage),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  author: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  parent_version: z.string().optional(),
  metrics: z.record(z.string(), z.number()).default({}),
  hyperparameters: z.record(z.string(), z.any()).default({}),
  training_dataset: z.string().optional(),
  validation_dataset: z.string().optional(),
  test_dataset: z.string().optional(),
  artifact_uri: z.string(),
  model_size_bytes: z.number(),
  input_schema: z.record(z.string(), z.any()).optional(),
  output_schema: z.record(z.string(), z.any()).optional(),
  dependencies: z.array(z.string()).default([]),
  environment: z.record(z.string(), z.string()).default({}),
});

export type ModelMetadata = z.infer<typeof ModelMetadataSchema>;

// Model Artifact Schema
export const ModelArtifactSchema = z.object({
  id: z.string().uuid(),
  model_id: z.string().uuid(),
  model_version: z.string(),
  artifact_type: z.enum(['model', 'weights', 'config', 'preprocessor', 'metrics', 'plots']),
  uri: z.string(),
  size_bytes: z.number(),
  checksum: z.string(),
  created_at: z.string().datetime(),
  metadata: z.record(z.string(), z.any()).default({}),
});

export type ModelArtifact = z.infer<typeof ModelArtifactSchema>;

// Model Lineage Schema
export const ModelLineageSchema = z.object({
  id: z.string().uuid(),
  model_id: z.string().uuid(),
  model_version: z.string(),
  parent_models: z.array(
    z.object({
      model_id: z.string().uuid(),
      version: z.string(),
      relationship: z.enum(['fine-tuned', 'distilled', 'ensemble', 'retrained']),
    })
  ).default([]),
  datasets: z.array(
    z.object({
      dataset_id: z.string(),
      version: z.string(),
      split: z.enum(['train', 'validation', 'test']),
      size: z.number(),
    })
  ).default([]),
  features: z.array(
    z.object({
      feature_id: z.string(),
      version: z.string(),
      transformation: z.string().optional(),
    })
  ).default([]),
  experiment_id: z.string().optional(),
  run_id: z.string().optional(),
  created_at: z.string().datetime(),
});

export type ModelLineage = z.infer<typeof ModelLineageSchema>;

// Model Comparison Schema
export const ModelComparisonSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  models: z.array(
    z.object({
      model_id: z.string().uuid(),
      version: z.string(),
      alias: z.string().optional(),
    })
  ),
  metrics: z.array(z.string()),
  results: z.record(
    z.string(), // model_id:version
    z.record(z.string(), z.number()) // metric -> value
  ),
  winner: z.string().optional(), // model_id:version
  created_at: z.string().datetime(),
  created_by: z.string(),
});

export type ModelComparison = z.infer<typeof ModelComparisonSchema>;

// A/B Test Schema
export const ABTestSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  control_model: z.object({
    model_id: z.string().uuid(),
    version: z.string(),
  }),
  treatment_model: z.object({
    model_id: z.string().uuid(),
    version: z.string(),
  }),
  traffic_split: z.object({
    control: z.number().min(0).max(100),
    treatment: z.number().min(0).max(100),
  }),
  start_date: z.string().datetime(),
  end_date: z.string().datetime().optional(),
  status: z.enum(['draft', 'running', 'completed', 'cancelled']),
  success_metrics: z.array(z.string()),
  results: z.object({
    control: z.record(z.string(), z.number()).optional(),
    treatment: z.record(z.string(), z.number()).optional(),
    statistical_significance: z.number().optional(),
  }).optional(),
  created_at: z.string().datetime(),
  created_by: z.string(),
});

export type ABTest = z.infer<typeof ABTestSchema>;

// Stage Transition Schema
export const StageTransitionSchema = z.object({
  id: z.string().uuid(),
  model_id: z.string().uuid(),
  version: z.string(),
  from_stage: z.nativeEnum(ModelStage),
  to_stage: z.nativeEnum(ModelStage),
  approved_by: z.string().optional(),
  approval_date: z.string().datetime().optional(),
  reason: z.string().optional(),
  checklist: z.array(
    z.object({
      item: z.string(),
      completed: z.boolean(),
      notes: z.string().optional(),
    })
  ).default([]),
  created_at: z.string().datetime(),
});

export type StageTransition = z.infer<typeof StageTransitionSchema>;

// Model Registry Config
export interface ModelRegistryConfig {
  postgres: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
  storage: {
    type: 'local' | 's3' | 'gcs' | 'azure';
    basePath: string;
    credentials?: Record<string, string>;
  };
  mlflow?: {
    trackingUri: string;
    experimentName?: string;
  };
}

// Search and Filter Types
export interface ModelSearchQuery {
  name?: string;
  framework?: ModelFramework;
  model_type?: ModelType;
  stage?: ModelStage;
  tags?: string[];
  author?: string;
  min_version?: string;
  max_version?: string;
  created_after?: Date;
  created_before?: Date;
  limit?: number;
  offset?: number;
  sort_by?: 'created_at' | 'updated_at' | 'name' | 'version';
  sort_order?: 'asc' | 'desc';
}

export interface ModelSearchResult {
  models: ModelMetadata[];
  total: number;
  limit: number;
  offset: number;
}
