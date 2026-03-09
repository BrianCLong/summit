import { z } from 'zod';

export const RetryPolicySchema = z.object({
  attempts: z.number().int().min(1).default(3),
  delay: z.string().regex(/^\d+[smh]$/).default('1m'),
  backoff: z.enum(['fixed', 'exponential']).default('exponential'),
});

export const SloTargetsSchema = z.object({
  latency_p95_ms: z.number().int().min(1).optional(),
  success_rate_percent: z.number().min(0).max(100).optional(),
});

export const PipelineContractSchema = z.object({
  apiVersion: z.string(),
  kind: z.literal('Pipeline'),
  metadata: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    owners: z.array(z.string().email()).min(1), // EMAIL ENFORCEMENT
    tags: z.record(z.any()).optional(),
  }),
  spec: z.object({
    source: z.object({
      connector: z.string().min(1),
      config: z.record(z.any()),
    }).optional(),
    inputs: z.array(z.any()).optional(),

    transformations: z.array(z.object({
      step: z.string().min(1),
      config: z.record(z.any()).optional(),
    })).optional(),
    tasks: z.array(z.any()).optional(),

    destination: z.object({
      connector: z.string().min(1),
      config: z.record(z.any()),
    }).optional(),
    outputs: z.array(z.any()).optional(),

    retry_policy: RetryPolicySchema.optional(),
    slo_targets: SloTargetsSchema.optional(),
    governance_tags: z.array(z.string()).optional(),
  }),
}).refine(data => {
  const s = data.spec;
  return (s.source || s.inputs) && (s.transformations || s.tasks) && (s.destination || s.outputs);
}, {
  message: "Pipeline must define sources, transformations, and destinations (or legacy inputs, tasks, and outputs)"
});

export type PipelineContract = z.infer<typeof PipelineContractSchema>;
export type RetryPolicy = z.infer<typeof RetryPolicySchema>;
export type SloTargets = z.infer<typeof SloTargetsSchema>;
