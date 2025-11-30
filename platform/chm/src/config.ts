import { z } from 'zod';

export const classificationLevels = ['TS', 'S', 'C', 'U'] as const;
export type Classification = (typeof classificationLevels)[number];

export const residencyZones = ['us', 'eu', 'apac'] as const;
export type ResidencyZone = (typeof residencyZones)[number];

export const licenseTiers = ['exportable', 'domestic-only', 'blocked'] as const;
export type LicenseTier = (typeof licenseTiers)[number];

export const taxonomySchema = z.object({
  code: z.string(),
  description: z.string(),
  level: z.enum(classificationLevels),
  downgradeTo: z.array(z.enum(classificationLevels)).default([])
});

export const tagRuleSchema = z.object({
  tag: z.string(),
  residency: z.enum(residencyZones),
  license: z.enum(licenseTiers),
  exportable: z.boolean(),
  rationale: z.string()
});

export type TaxonomyEntry = z.infer<typeof taxonomySchema>;
export type TagRule = z.infer<typeof tagRuleSchema>;

export interface ExportContext {
  residency: ResidencyZone;
  license: LicenseTier;
  actorId: string;
  destination: string;
}

export interface DocumentTag {
  documentId: string;
  tag: string;
  classification: Classification;
  derivedFrom?: string;
}

export interface ExportDecision {
  allowed: boolean;
  reason: string;
  violatedRule?: TagRule;
}
