/**
 * Core types for Feature Store
 */

import { z } from 'zod';

// Feature value types
export enum FeatureType {
  INT = 'int',
  FLOAT = 'float',
  STRING = 'string',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  EMBEDDING = 'embedding',
  CATEGORICAL = 'categorical',
}

// Feature metadata
export const FeatureSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  version: z.string(),
  feature_type: z.nativeEnum(FeatureType),
  description: z.string().optional(),
  entity_type: z.string(), // e.g., 'user', 'transaction', 'entity'
  tags: z.array(z.string()).default([]),
  owner: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  transformation: z.string().optional(), // SQL or code for feature computation
  dependencies: z.array(z.string()).default([]), // Other features this depends on
  metadata: z.record(z.string(), z.any()).default({}),
  online_enabled: z.boolean().default(true),
  offline_enabled: z.boolean().default(true),
  ttl_seconds: z.number().optional(), // Time-to-live for online features
});

export type Feature = z.infer<typeof FeatureSchema>;

// Feature Group (collection of related features)
export const FeatureGroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  entity_type: z.string(),
  features: z.array(z.string()), // Feature IDs
  owner: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.any()).default({}),
});

export type FeatureGroup = z.infer<typeof FeatureGroupSchema>;

// Feature Value
export const FeatureValueSchema = z.object({
  feature_id: z.string().uuid(),
  entity_id: z.string(),
  value: z.any(),
  timestamp: z.string().datetime(),
  version: z.string(),
});

export type FeatureValue = z.infer<typeof FeatureValueSchema>;

// Feature Vector (multiple features for an entity)
export interface FeatureVector {
  entity_id: string;
  entity_type: string;
  features: Record<string, any>; // feature_name -> value
  timestamp: string;
  version?: string;
}

// Transformation
export const TransformationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  input_features: z.array(z.string()),
  output_feature: z.string(),
  transformation_type: z.enum(['sql', 'python', 'javascript']),
  code: z.string(),
  version: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Transformation = z.infer<typeof TransformationSchema>;

// Feature Lineage
export const FeatureLineageSchema = z.object({
  id: z.string().uuid(),
  feature_id: z.string().uuid(),
  version: z.string(),
  source_tables: z.array(z.object({
    table: z.string(),
    columns: z.array(z.string()),
  })).default([]),
  source_features: z.array(z.object({
    feature_id: z.string().uuid(),
    version: z.string(),
  })).default([]),
  transformations: z.array(z.string().uuid()).default([]),
  created_at: z.string().datetime(),
});

export type FeatureLineage = z.infer<typeof FeatureLineageSchema>;

// Feature Store Config
export interface FeatureStoreConfig {
  postgres: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  offline: {
    type: 'postgres' | 'parquet' | 's3';
    config: Record<string, any>;
  };
}

// Feature Statistics
export interface FeatureStatistics {
  feature_id: string;
  version: string;
  count: number;
  null_count: number;
  unique_count?: number;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std_dev?: number;
  percentiles?: Record<string, number>;
  most_common?: Array<{ value: any; count: number }>;
  computed_at: string;
}

// Feature Monitoring
export const FeatureMonitoringSchema = z.object({
  feature_id: z.string().uuid(),
  version: z.string(),
  drift_score: z.number(),
  drift_detected: z.boolean(),
  data_quality_score: z.number(),
  null_rate: z.number(),
  anomalies_detected: z.number(),
  timestamp: z.string().datetime(),
  details: z.record(z.string(), z.any()).default({}),
});

export type FeatureMonitoring = z.infer<typeof FeatureMonitoringSchema>;
