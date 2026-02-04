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

export const SummitProvenanceFacetSchema = BaseFacetSchema.extend({
  runManifestDigest: z.object({
    sha256: z.string(),
  }),
  attestations: z.array(
    z.object({
      uri: z.string().url(),
      digest: z.object({
        sha256: z.string(),
      }),
      predicateType: z.string().url(),
    })
  ),
  sboms: z
    .array(
      z.object({
        uri: z.string().url(),
        digest: z.object({
          sha256: z.string(),
        }),
      })
    )
    .optional(),
});

export type SummitProvenanceFacet = z.infer<typeof SummitProvenanceFacetSchema>;
