import { z } from 'zod';

export const HICFEventSchema = z.object({
  tenant_id: z.string(),
  event_id: z.string(),
  event_type: z.enum(['BADGE_ACCESS', 'DOOR_OPEN', 'ALARM_TRIGGER', 'RF_ANOMALY', 'DRONE_DETECTED', 'OT_ALERT', 'IT_ALERT']),
  site_id: z.string(),
  zone_id: z.string().optional(),
  asset_id: z.string().optional(),
  observed_at: z.string().datetime(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  provenance: z.string(),
  confidence: z.number().min(0).max(1),
  raw_payload: z.never().optional(),
});

export type HICFEvent = z.infer<typeof HICFEventSchema>;
