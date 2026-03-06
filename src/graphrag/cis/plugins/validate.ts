import { z } from 'zod';
import { IntegritySignal, NarrativeIntel } from './contracts';

/**
 * Zod schema for BaseSignal.
 * Enforces strict presence of tenant_id and provenance fields.
 */
export const BaseSignalSchema = z.object({
  tenant_id: z.string().min(1, { message: "tenant_id is required for isolation" }),
  provider: z.string().min(1, { message: "provider is required" }),
  provider_ref: z.string().min(1, { message: "provider_ref is required for provenance" }),
  observed_at: z.string().datetime({ message: "observed_at must be valid ISO 8601" }),
});

/**
 * Zod schema for IntegritySignal.
 * Validates scores are between 0 and 1.
 */
export const IntegritySignalSchema = BaseSignalSchema.extend({
  artifact_hash: z.string().min(1, { message: "artifact_hash is required" }),
  artifact_type: z.string().min(1),
  scores: z.object({
    ai_generated: z.number().min(0).max(1),
    manipulated: z.number().min(0).max(1),
    spoof: z.number().min(0).max(1),
  }).catchall(z.number().min(0).max(1)),
  explanations: z.array(z.string()).optional(),
});

/**
 * Zod schema for NarrativeIntel.
 */
export const NarrativeIntelSchema = BaseSignalSchema.extend({
  narrative_id: z.string().min(1, { message: "narrative_id is required" }),
  topic: z.string().min(1),
  entities: z.array(z.string()),
  actor_refs: z.array(z.string()),
  channels: z.array(z.string()),
  risk_scores: z.object({
    toxicity: z.number().min(0),
    manipulation: z.number().min(0),
    automation: z.number().min(0),
    growth: z.number().min(0),
  }).catchall(z.number()),
});

/**
 * Validates and normalizes an IntegritySignal.
 * Throws ZodError if validation fails.
 */
export function validateIntegritySignal(data: unknown): IntegritySignal {
  // Use safeParse if we wanted to handle errors gracefully, but parse throws which is fine for now
  return IntegritySignalSchema.parse(data) as unknown as IntegritySignal;
}

/**
 * Validates and normalizes a NarrativeIntel signal.
 * Throws ZodError if validation fails.
 */
export function validateNarrativeIntel(data: unknown): NarrativeIntel {
  return NarrativeIntelSchema.parse(data) as unknown as NarrativeIntel;
}
