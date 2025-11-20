/**
 * Types for Model Serving
 */

import { z } from 'zod';

// Inference Request/Response
export const InferenceRequestSchema = z.object({
  model_name: z.string(),
  model_version: z.string().optional().default('latest'),
  inputs: z.record(z.string(), z.any()),
  options: z.object({
    timeout_ms: z.number().optional(),
    return_explanation: z.boolean().optional(),
    return_confidence: z.boolean().optional(),
  }).optional(),
});

export type InferenceRequest = z.infer<typeof InferenceRequestSchema>;

export const InferenceResponseSchema = z.object({
  model_name: z.string(),
  model_version: z.string(),
  predictions: z.any(),
  confidence: z.number().optional(),
  explanation: z.any().optional(),
  latency_ms: z.number(),
  timestamp: z.string().datetime(),
});

export type InferenceResponse = z.infer<typeof InferenceResponseSchema>;

// Batch Prediction
export const BatchPredictionJobSchema = z.object({
  id: z.string().uuid(),
  model_name: z.string(),
  model_version: z.string(),
  input_path: z.string(),
  output_path: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  total_records: z.number().optional(),
  processed_records: z.number().optional(),
  error_count: z.number().optional(),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  created_by: z.string(),
});

export type BatchPredictionJob = z.infer<typeof BatchPredictionJobSchema>;

// Ensemble Configuration
export const EnsembleConfigSchema = z.object({
  name: z.string(),
  models: z.array(z.object({
    model_name: z.string(),
    model_version: z.string(),
    weight: z.number().min(0).max(1),
  })),
  aggregation_method: z.enum(['weighted_average', 'voting', 'stacking']),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type EnsembleConfig = z.infer<typeof EnsembleConfigSchema>;

// Model Endpoint
export interface ModelEndpoint {
  model_name: string;
  model_version: string;
  endpoint_url: string;
  status: 'active' | 'inactive' | 'draining';
  created_at: string;
  updated_at: string;
}

// Serving Metrics
export interface ServingMetrics {
  model_name: string;
  model_version: string;
  timestamp: string;
  request_count: number;
  error_count: number;
  avg_latency_ms: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
}
