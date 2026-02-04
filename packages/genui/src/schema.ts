import { z } from 'zod';

export const IntentSchema = z.enum([
  'investigate',
  'compare',
  'plan',
  'remediate',
  'onboard',
  'triage',
]);

export const ComponentKindSchema = z.enum([
  'kpi',
  'table',
  'timeline',
  'graphView',
  'checklist',
  'diff',
  'callout',
  'form',
  'stepper',
  'citationList',
]);

export const DataRequestTypeSchema = z.enum([
  'graphql',
  'sql',
  'cypher',
  'search',
  'rest',
]);

export const DataRequestSchema = z.object({
  id: z.string().min(1),
  type: DataRequestTypeSchema,
  query: z.string().min(1),
  params: z.record(z.string(), z.unknown()).optional(),
  description: z.string().optional(),
});

export const ActionSchema = z.object({
  id: z.string().min(1),
  tool: z.string().min(1),
  input: z.record(z.string(), z.unknown()).optional(),
  requiresConfirmation: z.boolean().default(false),
  description: z.string().optional(),
});

export const CitationSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  source: z.string().min(1),
  url: z.string().url().optional(),
  evidenceId: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const PanelSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  component: ComponentKindSchema,
  props: z.record(z.string(), z.unknown()).optional(),
  dataRequestIds: z.array(z.string()).default([]),
  actionIds: z.array(z.string()).default([]),
  citationIds: z.array(z.string()).default([]),
});

export const SectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  panels: z.array(PanelSchema).min(1),
});

export const PageSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  sections: z.array(SectionSchema).min(1),
});

export const LayoutSchema = z.object({
  pages: z.array(PageSchema).min(1),
});

export const ConstraintsSchema = z.object({
  theme: z.string().optional(),
  accessibility: z.object({
    minContrastRatio: z.number().min(1).optional(),
    requiresKeyboardNav: z.boolean().default(true),
    prefersReducedMotion: z.boolean().default(false),
  }),
  tenantPolicies: z.array(z.string()).default([]),
  networkPolicy: z.enum(['no-external', 'allowlisted']).default('no-external'),
});

export const UiPlanSchema = z.object({
  version: z.string().min(1),
  intent: IntentSchema,
  layout: LayoutSchema,
  dataRequests: z.array(DataRequestSchema).default([]),
  actions: z.array(ActionSchema).default([]),
  citations: z.array(CitationSchema).default([]),
  constraints: ConstraintsSchema,
});

export type Intent = z.infer<typeof IntentSchema>;
export type ComponentKind = z.infer<typeof ComponentKindSchema>;
export type DataRequestType = z.infer<typeof DataRequestTypeSchema>;
export type DataRequest = z.infer<typeof DataRequestSchema>;
export type ActionDefinition = z.infer<typeof ActionSchema>;
export type Citation = z.infer<typeof CitationSchema>;
export type Panel = z.infer<typeof PanelSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type Page = z.infer<typeof PageSchema>;
export type Layout = z.infer<typeof LayoutSchema>;
export type Constraints = z.infer<typeof ConstraintsSchema>;
export type UiPlan = z.infer<typeof UiPlanSchema>;

export function validatePlan(plan: unknown): UiPlan {
  return UiPlanSchema.parse(plan);
}
