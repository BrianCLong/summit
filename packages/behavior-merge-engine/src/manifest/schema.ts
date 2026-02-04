import { z } from 'zod';

export const MergeDeltaSchema = z.object({
  id: z.string(),
  uri: z.string().describe("URI to the delta artifact"),
  weight: z.number().default(1.0),
  metadata: z.record(z.any()).optional()
});

export const MergePolicyConfigSchema = z.object({
  name: z.enum(['ram', 'ram_plus', 'ties', 'average']),
  parameters: z.object({
    threshold: z.number().min(0).max(1).default(0.001),
    rescale: z.boolean().default(true),
    // Additional parameters for other policies can go here
  }).optional()
});

export const MergeManifestSchema = z.object({
  version: z.string().default("1.0.0"),
  timestamp: z.string().datetime().default(() => new Date().toISOString()),
  baseModel: z.object({
    uri: z.string(),
    hash: z.string()
  }),
  deltas: z.array(MergeDeltaSchema),
  policy: MergePolicyConfigSchema,
  toolchain: z.object({
    engine: z.string().default("@summit/behavior-merge-engine"),
    version: z.string().optional()
  })
});

export type MergeManifest = z.infer<typeof MergeManifestSchema>;
export type MergeDelta = z.infer<typeof MergeDeltaSchema>;
export type MergePolicyConfig = z.infer<typeof MergePolicyConfigSchema>;
