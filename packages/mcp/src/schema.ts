import { z } from "zod";

export const EvidenceSchema = z.object({
  type: z.string(),
  payload: z.any(),
  meta: z.object({
    timestamp: z.string(),
    source: z.string(),
    hash: z.string().optional()
  })
});

export type Evidence = z.infer<typeof EvidenceSchema>;
