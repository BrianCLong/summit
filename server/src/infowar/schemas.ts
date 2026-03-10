import { z } from 'zod';

export const NarrativeSchema = z.object({
  id: z.string().regex(/^NAR:[a-z0-9-]+$/),
  canonicalLabel: z.string(),
  keyPhrases: z.array(z.string()),
  firstSeenAt: z.string().datetime().nullable(),
  languages: z.array(z.string()),
  intendedAudiences: z.array(z.string()),
  evidenceIds: z.array(z.string())
});

export const ClaimSchema = z.object({
  id: z.string(),
  text: z.string(),
  stance: z.string(),
  emotionalTone: z.string(),
  narrativeIds: z.array(z.string()).optional(),
  evidenceIds: z.array(z.string())
});

export const ConnectivityStateSchema = z.object({
  region: z.string(),
  platform: z.string(),
  state: z.enum(["normal", "throttled", "shutdown"]),
  startedAt: z.string().datetime().nullable(),
  endedAt: z.string().datetime().nullable(),
  evidenceIds: z.array(z.string())
});

export const SITREPSchema = z.object({
  id: z.string(),
  type: z.literal('Monthly SITREP'),
  generatedAt: z.string().datetime(),
  narratives: z.array(NarrativeSchema),
  claims: z.array(ClaimSchema),
  connectivity: z.array(ConnectivityStateSchema),
  evidenceIndex: z.object({
    version: z.string(),
    item_slug: z.literal("INFOWAR"),
    entries: z.array(z.string())
  })
});

export type Narrative = z.infer<typeof NarrativeSchema>;
export type Claim = z.infer<typeof ClaimSchema>;
export type ConnectivityState = z.infer<typeof ConnectivityStateSchema>;
export type SITREP = z.infer<typeof SITREPSchema>;
