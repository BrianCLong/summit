import { z } from "zod";

export const EvidenceItemSchema = z.object({
  source: z.string(),
  url: z.string().optional(),
  snippet: z.string().optional(),
});

export const TimeRangeSchema = z.object({
  start: z.number(),
  end: z.number(),
});

export const ClaimSchema = z.object({
  id: z.string(),
  text: z.string(),
  speaker: z.string().optional(),
  time_range: TimeRangeSchema,
  verdict: z.enum(["verified", "disputed", "unverified", "needs_review"]),
  confidence: z.number().min(0).max(1).optional(),
  evidence: z.array(EvidenceItemSchema).optional(),
});

export const FactFlowReportSchema = z.object({
  job_id: z.string(),
  timestamp: z.string().datetime(),
  claims: z.array(ClaimSchema),
});

export const FactFlowMetricsSchema = z.object({
  job_id: z.string(),
  processing_time_ms: z.number(),
  audio_duration_sec: z.number(),
  cache_hit: z.boolean(),
  claims_count: z.number(),
  verified_count: z.number(),
  needs_review_count: z.number(),
});
