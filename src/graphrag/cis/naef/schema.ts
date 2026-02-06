import { z } from 'zod';

export const NAEFEventSchema = z.object({
  tenant_id: z.string(),
  event_id: z.string(),
  event_time: z.string().datetime(),
  source: z.string(),
  artifact: z.object({
    type: z.enum(['text', 'image', 'audio', 'video', 'link']),
    hash: z.string(),
    uri_ref: z.string().optional(),
    mime: z.string().optional(),
    size: z.number().optional(),
  }),
  actor_ref: z.string().optional(),
  channel_ref: z.string().optional(),
  claims: z.array(z.string()).optional(),
  topics: z.array(z.string()).optional(),
  entities: z.array(z.string()).optional(),
  integrity_signals: z.array(z.object({
    source: z.string(),
    score: z.number().optional(),
    metadata: z.record(z.any()).optional(),
  })).optional(),
  audience_refs: z.array(z.string()).optional(),
  provenance: z.object({
    source_pointer: z.string(),
    ingestion_run_id: z.string(),
  }),
});

export type NAEFEvent = z.infer<typeof NAEFEventSchema>;
