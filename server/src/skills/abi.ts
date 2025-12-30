import { z, type ZodTypeAny } from 'zod';

export type SkillId = string;

export interface ArtifactRef {
  id: string;
  uri: string;
  description?: string;
}

export interface CitationRef {
  id: string;
  uri: string;
  note?: string;
}

export interface SkillSpec<I = unknown, O = unknown> {
  id: SkillId;
  version: string;
  description: string;
  inputsSchema: ZodTypeAny;
  outputsSchema: ZodTypeAny;
  requiredCapabilities: string[];
  policyTags: string[];
}

export interface SkillContext {
  tenantId: string;
  actorId: string;
  traceId: string;
  requestId: string;
  now: string;
  budget: {
    maxSteps: number;
    maxToolCalls: number;
    maxMillis: number;
  };
  policy: {
    classification: string;
    allowedTools: string[];
  };
}

export type SkillTerminationReason =
  | 'completed'
  | 'failed'
  | 'aborted'
  | 'budget_exceeded_time'
  | 'budget_exceeded_steps'
  | 'budget_exceeded_tool_calls'
  | 'policy_denied'
  | 'skill_not_found';

export interface SkillResult<O = unknown> {
  status: 'success' | 'failed' | 'aborted';
  termination: {
    reason: SkillTerminationReason | string;
    when: string;
  };
  artifacts: ArtifactRef[];
  citations: CitationRef[];
  stateDelta?: Record<string, unknown>;
  metrics: {
    steps: number;
    toolCalls: number;
    durationMs: number;
  };
  error?: {
    code: string;
    message: string;
  };
  output?: O;
}

export interface Skill<I = unknown, O = unknown> {
  run(input: I, ctx: SkillContext, deps?: Record<string, unknown>): Promise<SkillResult<O>>;
}

export const defaultSkillBudget = {
  maxSteps: 10,
  maxToolCalls: 10,
  maxMillis: 30_000,
};

export const SkillSchemas = {
  skillContext: z.object({
    tenantId: z.string(),
    actorId: z.string(),
    traceId: z.string(),
    requestId: z.string(),
    now: z.string(),
    budget: z.object({
      maxSteps: z.number().int().positive(),
      maxToolCalls: z.number().int().nonnegative(),
      maxMillis: z.number().int().positive(),
    }),
    policy: z.object({
      classification: z.string(),
      allowedTools: z.array(z.string()),
    }),
  }),
};
