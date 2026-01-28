import { z } from 'zod';

export const ObservableSchema = z.object({
  type: z.string(),
  description: z.string(),
});

export const TechniqueSchema = z.object({
  tactic_id: z.string(),
  tactic_name: z.string(),
  technique_id: z.string(),
  technique_name: z.string(),
  description: z.string(),
  observables: z.array(ObservableSchema).optional().default([]),
  mitigations: z.array(z.string()).optional().default([]),
});

export const DisarmTaxonomySchema = z.object({
  version: z.string(),
  description: z.string().optional(),
  techniques: z.array(TechniqueSchema),
});

export type Observable = z.infer<typeof ObservableSchema>;
export type Technique = z.infer<typeof TechniqueSchema>;
export type DisarmTaxonomy = z.infer<typeof DisarmTaxonomySchema>;
