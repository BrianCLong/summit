import { z } from 'zod';

export const trajectoryStepSchema = z.object({
  ts: z.string().or(z.number()),
  role: z.enum(['system', 'user', 'assistant', 'tool', 'runner']),
  kind: z.enum(['message', 'tool_invocation', 'tool_result', 'agent_decision', 'artifact', 'final']),
  name: z.string().optional(),
  input: z.any().optional(),
  output: z.any().optional(),
  error: z.string().optional(),
  duration_ms: z.number().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const trajectoryHeaderSchema = z.object({
  run_id: z.string(),
  git_sha: z.string().optional(),
  start_ts: z.string(),
  agent_id: z.string().optional(),
  config: z.record(z.string(), z.any()).optional(),
  kind: z.literal('trajectory_header'),
});

export type TrajectoryStep = z.infer<typeof trajectoryStepSchema>;
export type TrajectoryHeader = z.infer<typeof trajectoryHeaderSchema>;

export interface Trajectory {
  header: TrajectoryHeader;
  steps: TrajectoryStep[];
}

export interface InteractionChunk {
  chunk_id: string;
  step_start: number;
  step_end: number;
  summary?: string;
  success_signal?: boolean;
  duration_ms?: number;
  tools_used: string[];
}
