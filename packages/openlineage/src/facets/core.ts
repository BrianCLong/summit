import { z } from 'zod';

export const BaseFacetSchema = z.object({
  _producer: z.string().url(),
  _schemaURL: z.string().url(),
});

export const SourceCodeJobFacetSchema = BaseFacetSchema.extend({
  language: z.string(),
  sourceUri: z.string().url().optional(), // Often git remote
  version: z.string().optional(), // git sha
  repoUrl: z.string().url().optional(),
  branch: z.string().optional(),
  commitId: z.string().optional(),
});

export type SourceCodeJobFacet = z.infer<typeof SourceCodeJobFacetSchema>;

export const DocumentationJobFacetSchema = BaseFacetSchema.extend({
  description: z.string(),
});

export type DocumentationJobFacet = z.infer<typeof DocumentationJobFacetSchema>;

export const SqlJobFacetSchema = BaseFacetSchema.extend({
  query: z.string(),
});

export type SqlJobFacet = z.infer<typeof SqlJobFacetSchema>;
