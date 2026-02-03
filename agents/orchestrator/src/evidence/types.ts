import { z } from 'zod';

export const PlanStepSchema = z.object({
  step_id: z.string(),
  name: z.string(),
  tool_name: z.string().optional(),
  args_schema_ref: z.string().optional(),
  preconditions: z.array(z.string()),
  postconditions: z.array(z.string()),
  permissions: z.array(z.string()),
  cost_bounds: z
    .object({
      max_cost_usd: z.number().nonnegative().optional(),
      max_tokens: z.number().int().nonnegative().optional(),
    })
    .optional(),
  retry_policy: z
    .object({
      max_retries: z.number().int().nonnegative().optional(),
      backoff_ms: z.number().int().nonnegative().optional(),
    })
    .optional(),
});

export const PlanIRSchema = z.object({
  plan_id: z.string(),
  run_id: z.string(),
  goal: z.string(),
  steps: z.array(PlanStepSchema),
});

export type PlanStepIR = z.infer<typeof PlanStepSchema>;
export type PlanIR = z.infer<typeof PlanIRSchema>;

export type TraceEventType =
  | 'run:started'
  | 'run:completed'
  | 'run:failed'
  | 'chain:started'
  | 'chain:completed'
  | 'chain:failed'
  | 'step:started'
  | 'step:completed'
  | 'step:failed'
  | 'step:fallback'
  | 'tool:started'
  | 'tool:completed'
  | 'tool:failed'
  | 'tool:validation_failed'
  | 'tool:postcondition_failed'
  | 'governance:blocked'
  | 'governance:violation'
  | 'budget:exceeded'
  | 'budget:warning'
  | 'hallucination:detected'
  | 'circuit:opened'
  | 'circuit:closed'
  | 'circuit:half-open';

export interface TraceEvent {
  type: TraceEventType;
  timestamp: string;
  run_id: string;
  plan_id?: string;
  chain_id?: string;
  step_id?: string;
  tool_name?: string;
  data?: Record<string, unknown>;
}

export const TraceEventSchema = z.object({
  type: z.string(),
  timestamp: z.string(),
  run_id: z.string(),
  plan_id: z.string().optional(),
  chain_id: z.string().optional(),
  step_id: z.string().optional(),
  tool_name: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

export interface EvidenceBundleManifestEntry {
  path: string;
  sha256: string;
  bytes: number;
}

export interface EvidenceBundleManifest {
  bundle_version: string;
  plan_id: string;
  run_id: string;
  created_at: string;
  finalized_at: string;
  git_sha: string;
  config_flags: Record<string, unknown>;
  files: EvidenceBundleManifestEntry[];
}
