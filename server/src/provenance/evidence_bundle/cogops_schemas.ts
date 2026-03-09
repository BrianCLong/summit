import { z } from 'zod';

export const CogOpsReportSchema = z.object({
  report_id: z.string().regex(/^EVID-COGOPS-[0-9a-f]{12}$/),
  fixture_id: z.string(),
  scope: z.object({
    time_window: z.string(),
    region: z.string(),
    sources: z.array(z.string()),
  }).strict(),
  findings: z.array(z.object({
    indicator_id: z.string().regex(/^EVID-COGOPS-[0-9a-f]{12}$/),
    indicator_type: z.enum(['coordination', 'provenance_gap', 'amplification', 'synthetic_media']),
    severity: z.enum(['low', 'medium', 'high']),
    confidence: z.number().min(0).max(1),
    summary: z.string(),
    evidence_refs: z.array(z.string().regex(/^EVID-COGOPS-[0-9a-f]{12}$/)),
  }).strict()),
  evidence: z.array(z.object({
    evidence_id: z.string().regex(/^EVID-COGOPS-[0-9a-f]{12}$/),
    source_ref: z.string(),
    selector: z.string(),
    observation: z.string(),
  }).strict()),
  resilience_scorecard: z.object({
    overall_score: z.number().min(0).max(1),
    proxies: z.array(z.object({
      proxy_type: z.enum(['polarization', 'trust_erosion', 'decision_disruption']),
      value: z.number(),
      delta: z.number(),
      confidence: z.number().min(0).max(1),
      evidence_refs: z.array(z.string().regex(/^EVID-COGOPS-[0-9a-f]{12}$/)),
    }).strict()),
  }).strict(),
}).strict();

export const CogOpsMetricsSchema = z.object({
  metrics_id: z.string().regex(/^EVID-COGOPS-[0-9a-f]{12}$/),
  fixture_id: z.string(),
  indicators: z.array(z.object({
    indicator_type: z.enum(['coordination', 'provenance_gap', 'amplification', 'synthetic_media']),
    score: z.number().min(0).max(1),
    confidence: z.number().min(0).max(1),
    evidence_refs: z.array(z.string().regex(/^EVID-COGOPS-[0-9a-f]{12}$/)),
  }).strict()),
  aggregates: z.object({
    indicator_totals: z.record(z.number()),
    proxy_totals: z.record(z.number()),
  }).strict(),
}).strict();

export const CogOpsStampSchema = z.object({
  timestamp: z.string().datetime(),
}).strict();

export type CogOpsReport = z.infer<typeof CogOpsReportSchema>;
export type CogOpsMetrics = z.infer<typeof CogOpsMetricsSchema>;
export type CogOpsStamp = z.infer<typeof CogOpsStampSchema>;
