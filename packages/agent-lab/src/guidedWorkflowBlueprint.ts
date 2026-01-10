import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { z } from 'zod';

const BlueprintAccessSchema = z
  .object({
    allowed_roles: z.array(z.string()).optional(),
    required_attributes: z.record(z.string(), z.any()).optional(),
  })
  .optional();

const BlueprintMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  risk_level: z.enum(['low', 'medium', 'high']).default('medium'),
  tags: z.array(z.string()).default([]),
  access: BlueprintAccessSchema,
});

const JsonSchemaObject = z.object({
  type: z.literal('object'),
  properties: z.record(z.string(), z.any()),
  required: z.array(z.string()).optional(),
  additionalProperties: z.boolean().optional(),
});

const BlueprintInputSchema = z.object({
  prompt: z.string(),
  schema: z.union([z.record(z.string(), z.any()), JsonSchemaObject]),
  validation: z
    .object({
      required: z.array(z.string()).optional(),
      maxLength: z.number().optional(),
      minLength: z.number().optional(),
    })
    .optional(),
});

const BlueprintToolSchema = z.object({
  tool_id: z.string(),
  input_mapping: z.record(z.string(), z.any()).default({}),
  output_mapping: z.record(z.string(), z.any()).default({}),
  timeout_ms: z.number().int().positive().optional(),
});

const StopConditionSchema = z.union([
  z.string(),
  z.object({
    key: z.string(),
    equals: z.any().optional(),
    not_equals: z.any().optional(),
    truthy: z.boolean().optional(),
  }),
]);

const BlueprintStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  prompt: z.string(),
  input: BlueprintInputSchema.optional(),
  tool: BlueprintToolSchema.optional(),
  retries: z.number().optional().default(0),
  stop_condition: StopConditionSchema.optional(),
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
