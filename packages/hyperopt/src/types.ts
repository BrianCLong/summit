import { z } from 'zod';

/**
 * Hyperparameter optimization types
 */

// Parameter space definition
export const ParameterSchema = z.object({
  name: z.string(),
  type: z.enum(['int', 'float', 'categorical', 'boolean']),
  min: z.number().optional(),
  max: z.number().optional(),
  values: z.array(z.any()).optional(),
  default: z.any().optional(),
  logScale: z.boolean().optional(),
});

export type Parameter = z.infer<typeof ParameterSchema>;

export const SearchSpaceSchema = z.object({
  parameters: z.array(ParameterSchema),
  constraints: z.array(z.object({
    type: z.enum(['conditional', 'forbidden', 'requires']),
    condition: z.string(),
  })).optional(),
});

export type SearchSpace = z.infer<typeof SearchSpaceSchema>;

// Optimization configuration
export const OptimizationConfigSchema = z.object({
  searchSpace: SearchSpaceSchema,
  objective: z.enum(['minimize', 'maximize']),
  metric: z.string(),
  maxEvaluations: z.number().optional(),
  maxTime: z.number().optional(),
  parallelism: z.number().optional(),
  earlyStoppingRounds: z.number().optional(),
  seed: z.number().optional(),
});

export type OptimizationConfig = z.infer<typeof OptimizationConfigSchema>;

// Trial result
export const TrialResultSchema = z.object({
  id: z.string(),
  parameters: z.record(z.string(), z.unknown()),
  metrics: z.record(z.string(), z.number()),
  score: z.number(),
  status: z.enum(['running', 'completed', 'failed', 'pruned']),
  startTime: z.string(),
  endTime: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type TrialResult = z.infer<typeof TrialResultSchema>;

// Optimization study
export interface OptimizationStudy {
  id: string;
  name: string;
  config: OptimizationConfig;
  trials: TrialResult[];
  bestTrial?: TrialResult;
  status: 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  metadata?: Record<string, any>;
}

// Optimizer interface
export interface Optimizer {
  suggest(study: OptimizationStudy): Promise<Record<string, any>>;
  update(study: OptimizationStudy, trial: TrialResult): void;
  getName(): string;
}
