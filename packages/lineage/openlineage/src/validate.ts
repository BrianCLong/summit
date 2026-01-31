import { z } from 'zod';
import { SourceCodeJobFacetSchema, DocumentationJobFacetSchema, SqlJobFacetSchema } from './facets/core.js';
import { TenantFacetSchema, SecurityFacetSchema, BuildFacetSchema } from './facets/summit.js';

const DatasetSchema = z.object({
  namespace: z.string(),
  name: z.string(),
  facets: z.record(z.any()).optional(),
});

export const RunEventSchema = z.object({
  eventType: z.enum(['START', 'RUNNING', 'COMPLETE', 'ABORT', 'FAIL', 'OTHER']),
  eventTime: z.string().datetime(),
  run: z.object({
    runId: z.string().uuid(),
    facets: z.object({
        tenant: TenantFacetSchema.optional(),
        security: SecurityFacetSchema.optional(),
        build: BuildFacetSchema.optional(),
    }).passthrough().optional()
  }),
  job: z.object({
    namespace: z.string(),
    name: z.string(),
    facets: z.object({
        sourceCode: SourceCodeJobFacetSchema.optional(),
        documentation: DocumentationJobFacetSchema.optional(),
        sql: SqlJobFacetSchema.optional()
    }).passthrough().optional()
  }),
  inputs: z.array(DatasetSchema).optional(),
  outputs: z.array(DatasetSchema).optional(),
  producer: z.string().url(),
  schemaURL: z.string().url(),
});

export function validateEvent(event: unknown) {
  return RunEventSchema.safeParse(event);
}
