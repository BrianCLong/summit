import { z } from 'zod';

export const PackManifestSchema = z.object({
  name: z.string().describe("e.g. ecc/everything-claude-code"),
  version: z.string(),
  upstream: z.object({
    repo: z.string(),
    commit: z.string(),
    license: z.string(),
  }).optional(),
  content: z.object({
    agents: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
    hooks: z.array(z.string()).optional(),
    mcpProfiles: z.array(z.string()).optional(),
    rules: z.array(z.string()).optional(),
  }),
  checksumsFile: z.string().default('checksums.json'),
  signature: z.object({
    alg: z.literal('ed25519'),
    keyId: z.string(),
    sig: z.string(),
  }).optional(),
});

export type PackManifest = z.infer<typeof PackManifestSchema>;
