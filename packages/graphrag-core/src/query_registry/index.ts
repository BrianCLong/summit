import { z } from 'zod';
import { Phase } from '../phases.js';

export const QueryMetadataSchema = z.object({
  id: z.string(),
  phase: z.nativeEnum(Phase),
  cypher: z.string(),
  params: z.array(z.string()).optional(),
  max_rows: z.number().int().positive().optional(),
  projection_allowlist: z.array(z.string()).optional(),
  pii_tags: z.array(z.string()).optional(),
  tenant_scope: z.boolean().default(true),
});

export type QueryMetadata = z.infer<typeof QueryMetadataSchema>;

export const QueryRegistrySchema = z.object({
  queries: z.array(QueryMetadataSchema),
});

export type QueryRegistry = z.infer<typeof QueryRegistrySchema>;

export class RegistryLoader {
  static validate(data: unknown): QueryRegistry {
    return QueryRegistrySchema.parse(data);
  }
}
