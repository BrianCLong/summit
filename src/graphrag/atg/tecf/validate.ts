import { z } from 'zod';
import { TECFActorType, TECFAssetType, TECFIntentHypothesis } from './schema.js';
export const TECFEventSchema = z.object({
  tenant_id: z.string().min(1), event_id: z.string().min(1), event_time: z.string().datetime(),
  actor: z.object({ type: z.nativeEnum(TECFActorType), id: z.string().min(1) }),
  asset: z.object({ type: z.nativeEnum(TECFAssetType), id: z.string().min(1) }),
  channel: z.string().min(1), action: z.string().min(1),
  intent_hypothesis: z.object({ type: z.nativeEnum(TECFIntentHypothesis), note: z.string() }).optional(),
  confidence: z.number().min(0).max(1),
  raw_ref: z.object({ source_system: z.string().min(1), external_id: z.string().min(1) }),
  provenance: z.object({ connector_id: z.string().min(1), run_id: z.string().min(1) })
});
export function validateTECFEvent(data: unknown) { return TECFEventSchema.parse(data); }
