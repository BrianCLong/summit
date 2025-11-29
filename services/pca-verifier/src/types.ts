import { z } from 'zod';

/**
 * Proof-Carrying Analytics Types
 */

export const TransformSchema = z.object({
  id: z.string(),
  type: z.enum(['parse', 'dedupe', 'aggregate', 'filter', 'join', 'transform']),
  version: z.string(),
  params: z.record(z.any()),
  inputHash: z.string().optional(),
  outputHash: z.string().optional(),
});

export const ProvenanceNodeSchema = z.object({
  hash: z.string(),
  type: z.enum(['input', 'transform', 'output']),
  timestamp: z.string(),
  transform: TransformSchema.optional(),
  metadata: z.record(z.any()).optional(),
});

export const ProvenanceManifestSchema = z.object({
  version: z.literal('1.0'),
  created: z.string(),
  rootHash: z.string(),
  nodes: z.array(ProvenanceNodeSchema),
  signature: z.string().optional(),
  verifier: z.object({
    algorithm: z.string(),
    tolerance: z.number().optional(),
  }),
});

export type Transform = z.infer<typeof TransformSchema>;
export type ProvenanceNode = z.infer<typeof ProvenanceNodeSchema>;
export type ProvenanceManifest = z.infer<typeof ProvenanceManifestSchema>;

export interface TransformDAG {
  transforms: Transform[];
  dependencies: Map<string, string[]>;
}

export interface VerificationResult {
  valid: boolean;
  manifest: ProvenanceManifest;
  errors: string[];
  warnings: string[];
  replayHash?: string;
  tolerance?: number;
}
