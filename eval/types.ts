import { z } from 'zod';

export const EvalItemSchema = z.object({
  input: z.string(),
  expected: z.string(),
  criteria: z.string().optional(),
});

export type EvalItem = z.infer<typeof EvalItemSchema>;

export const EvalResultSchema = z.object({
  input: z.string(),
  expected: z.string(),
  actual: z.string(),
  score: z.number().min(0).max(1),
  pass: z.boolean(),
  evidence: z.object({
    id: z.string().optional(),
    source: z.string().optional(),
    stub: z.boolean().default(true),
  }),
});

export type EvalResult = z.infer<typeof EvalResultSchema>;

export const EvalReportSchema = z.object({
  timestamp: z.string(),
  commit_sha: z.string().optional(),
  config: z.record(z.string(), z.unknown()),
  results: z.array(EvalResultSchema),
  summary: z.object({
    total: z.number(),
    passed: z.number(),
    accuracy: z.number(),
  }),
});

export type EvalReport = z.infer<typeof EvalReportSchema>;
