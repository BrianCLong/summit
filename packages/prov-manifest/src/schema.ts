import { z } from "zod";

export const manifestSchema = z.object({
  version: z.string(),
  createdAt: z.string().datetime(),
  metadata: z.record(z.unknown()),
  files: z.record(
    z.object({
      hash: z.string(),
      size: z.number(),
    })
  ),
  lineage: z.array(
    z.object({
      source: z.string(),
      transforms: z.array(z.string()),
      derived: z.string(),
    })
  ),
});

export type Manifest = z.infer<typeof manifestSchema>;
