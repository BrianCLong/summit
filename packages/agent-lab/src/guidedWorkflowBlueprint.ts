import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { z } from 'zod';

const BlueprintMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  risk_level: z.enum(['low', 'medium', 'high']).default('medium'),
  tags: z.array(z.string()).default([]),
});

const BlueprintInputSchema = z.object({
  prompt: z.string(),
  schema: z.record(z.string(), z.any()),
  validation: z
    .object({
      required: z.array(z.string()).optional(),
      maxLength: z.number().optional(),
    })
    .optional(),
});

const BlueprintToolSchema = z.object({
  tool_id: z.string(),
  input_mapping: z.record(z.string(), z.any()).default({}),
  output_mapping: z.record(z.string(), z.any()).default({}),
});

const BlueprintStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  prompt: z.string(),
  input: BlueprintInputSchema.optional(),
  tool: BlueprintToolSchema.optional(),
  retries: z.number().optional().default(0),
  stop_condition: z.string().optional(),
  fallback_step: z.string().optional(),
});

export const GuidedWorkflowBlueprintSchema = z.object({
  metadata: BlueprintMetadataSchema,
  steps: z.array(BlueprintStepSchema).nonempty(),
});

export type GuidedWorkflowBlueprint = z.infer<
  typeof GuidedWorkflowBlueprintSchema
>;

export const loadGuidedWorkflowBlueprint = (filePath: string) => {
  const resolved = path.resolve(filePath);
  const raw = fs.readFileSync(resolved, 'utf-8');
  const parsed = resolved.endsWith('.json')
    ? JSON.parse(raw)
    : (yaml.load(raw) as unknown);
  return GuidedWorkflowBlueprintSchema.parse(parsed);
};
