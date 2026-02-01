import { z } from 'zod';
import { BaseFacetSchema } from './core.js';

export const TenantFacetSchema = BaseFacetSchema.extend({
  tenantId: z.string(),
  workspaceId: z.string().optional(),
  residencyRegion: z.string().optional(),
});

export type TenantFacet = z.infer<typeof TenantFacetSchema>;

export const SecurityFacetSchema = BaseFacetSchema.extend({
  classification: z.enum(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED']),
  approvedBy: z.string().optional(),
});

export type SecurityFacet = z.infer<typeof SecurityFacetSchema>;

// Summit Custom Facet for Build Info (if not covered by core SourceCode)
export const BuildFacetSchema = BaseFacetSchema.extend({
  imageDigest: z.string().optional(),
  buildId: z.string().optional(),
  builder: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

export type BuildFacet = z.infer<typeof BuildFacetSchema>;
