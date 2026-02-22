import { z } from 'zod';

export const DeployPackSpecSchema = z.object({
  version: z.literal("1.0.0"),
  name: z.string(),
  description: z.string(),
  source: z.object({
    type: z.enum(['github', 'docker', 'upload', 'ai-generated']),
    uri: z.string().optional(),
    ref: z.string().optional(),
  }),
  config: z.record(z.any()).default({}),
  policy: z.object({
    deny_by_default: z.boolean().default(true),
    allowed_paths: z.array(z.string()).default([]),
  }).default({}),
});

export type DeployPackSpec = z.infer<typeof DeployPackSpecSchema>;
