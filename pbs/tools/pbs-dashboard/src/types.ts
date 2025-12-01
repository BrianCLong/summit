import { z } from "zod";

export const summarySchema = z.object({
  total_decisions: z.number(),
  original_block_rate: z.number(),
  new_block_rate: z.number(),
  block_rate_delta: z.number(),
  original_average_latency_ms: z.number(),
  new_average_latency_ms: z.number(),
  average_latency_delta_ms: z.number(),
  false_negative_canary_catchers: z.number(),
});

export const ruleImpactSchema = z.object({
  rule_id: z.string(),
  matches: z.number(),
  block_escalations: z.number(),
  relaxations: z.number(),
  resulting_action: z.string(),
  average_latency_ms: z.number(),
});

export const reportSchema = z.object({
  schema_version: z.string(),
  engine_version: z.string(),
  deterministic_run_id: z.string(),
  policy: z.object({
    name: z.string(),
    version: z.string(),
    digest: z.string(),
  }),
  inputs: z.object({
    history_digest: z.string(),
    total_decisions: z.number(),
    source: z.string(),
  }),
  summary: summarySchema,
  rule_impacts: z.array(ruleImpactSchema),
  signatures: z
    .array(
      z.object({
        key_id: z.string(),
        algorithm: z.string(),
        digest: z.string(),
        signature: z.string(),
      })
    )
    .optional(),
});

export type Report = z.infer<typeof reportSchema>;
export type Summary = z.infer<typeof summarySchema>;
export type RuleImpact = z.infer<typeof ruleImpactSchema>;
