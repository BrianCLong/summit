import { z } from 'zod';

export const TacticSchema = z.enum([
  'SURVEILLANCE_CLAIM',
  'TIME_PRESSURE',
  'LEGAL_LIABILITY_FRAMING',
  'PUBLIC_SHAMING',
  'DATA_DISCLOSURE_THREAT',
  'DOWNTIME_EMPHASIS',
]);

export type Tactic = z.infer<typeof TacticSchema>;

export const LeakSiteRecordSchema = z.object({
  evidence_id: z.string(),
  victim_name: z.string(),
  country: z.string().optional(),
  sector: z.string().optional(),
  source: z.string(),
  first_seen_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dataset_tags: z.array(z.string()).default([]),
});

export type LeakSiteRecord = z.infer<typeof LeakSiteRecordSchema>;

export const ExposureFindingSchema = z.object({
  evidence_id: z.string(),
  finding_type: z.string(),
  description: z.string(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  affected_asset: z.string(),
});

export type ExposureFinding = z.infer<typeof ExposureFindingSchema>;

export const ExtortionNoteAnalysisSchema = z.object({
  evidence_id: z.string(),
  tactics: z.array(TacticSchema),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
});

export type ExtortionNoteAnalysis = z.infer<typeof ExtortionNoteAnalysisSchema>;

export const PressureScoreSchema = z.object({
  overall_score: z.number().min(0).max(100),
  vectors: z.object({
    legal_regulatory: z.number().min(0).max(10),
    reputation: z.number().min(0).max(10),
    operational: z.number().min(0).max(10),
    coercion: z.number().min(0).max(10),
  }),
  explain: z.record(z.string(), z.string()),
});

export type PressureScore = z.infer<typeof PressureScoreSchema>;
