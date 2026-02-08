import { z } from 'zod';

export const NarrativeInevitabilitySchema = z.enum(['LOW', 'MED', 'HIGH']);

export const NarrativeFrameSchema = z.object({
  frame_id: z.string(),
  blame_target: z.string().optional(),
  inevitability: NarrativeInevitabilitySchema.optional(),
  solution_constraints: z.array(z.string()),
  moral_vocab: z.array(z.string()),
  causal_template: z.string(),
});

export type NarrativeFrame = z.infer<typeof NarrativeFrameSchema>;

export const NarrativeFrameInputSchema = NarrativeFrameSchema.omit({
  frame_id: true,
});

export type NarrativeFrameInput = z.infer<typeof NarrativeFrameInputSchema>;

export const NarrativeInfrastructureSchema = z.object({
  infrastructure_id: z.string(),
  template_fingerprint: z.string(),
  frame_ids: z.array(z.string()),
  topics_observed: z.array(z.string()),
});

export type NarrativeInfrastructure = z.infer<
  typeof NarrativeInfrastructureSchema
>;

export const NarrativeInfrastructureInputSchema = NarrativeInfrastructureSchema.omit({
  infrastructure_id: true,
});

export type NarrativeInfrastructureInput = z.infer<
  typeof NarrativeInfrastructureInputSchema
>;
