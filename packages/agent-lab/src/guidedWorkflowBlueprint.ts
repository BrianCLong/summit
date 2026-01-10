import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { z } from 'zod';

const ValidationRuleSchema = z.object({
  path: z.string(),
  rule: z.enum([
    'required',
    'nonEmpty',
    'regex',
    'enum',
    'minLength',
    'maxLength',
    'min',
    'max',
    'minItems',
    'maxItems',
    'uri',
    'email',
  ]),
  value: z.any().optional(),
  message: z.string().optional(),
});

const StopConditionSchema = z.object({
  path: z.string(),
  equals: z.any().optional(),
  exists: z.boolean().optional(),
});

const ToolInvocationSchema = z.object({
  toolId: z.string(),
  inputMapping: z.record(z.string(), z.string()).default({}),
  outputMapping: z.record(z.string(), z.string()).optional(),
  retries: z.number().int().min(0).default(0),
  fallbackStepId: z.string().optional(),
});

export const GuidedWorkflowStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  prompt: z.string(),
  inputSchema: z.record(z.string(), z.any()).default({ type: 'object', properties: {} }),
  validations: z.array(ValidationRuleSchema).default([]),
  tool: ToolInvocationSchema.optional(),
  stopConditions: z.array(StopConditionSchema).default([]),
  retries: z.number().int().min(0).default(0),
  fallbackStepId: z.string().optional(),
});

const MetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  risk_level: z.enum(['low', 'medium', 'high', 'critical']),
  tags: z.array(z.string()).default([]),
});

export const GuidedWorkflowBlueprintSchema = z.object({
  version: z.string().default('0.1.0'),
  metadata: MetadataSchema,
  featureFlag: z.string().default('guidedWorkflows.enabled'),
  steps: z.array(GuidedWorkflowStepSchema).nonempty(),
  policies: z
    .object({
      maxAttempts: z.number().int().min(1).default(3),
      allowDebug: z.boolean().default(true),
      redactKeys: z.array(z.string()).default(['password', 'secret', 'token']),
      rateLimitPerRun: z
        .object({
          maxSteps: z.number().int().min(1).default(50),
          intervalMs: z.number().int().min(1000).default(15 * 60 * 1000),
        })
        .default({ maxSteps: 50, intervalMs: 15 * 60 * 1000 }),
    })
    .default({
      maxAttempts: 3,
      allowDebug: true,
      redactKeys: ['password', 'secret', 'token'],
      rateLimitPerRun: { maxSteps: 50, intervalMs: 15 * 60 * 1000 },
    }),
});

export type GuidedWorkflowBlueprint = z.infer<typeof GuidedWorkflowBlueprintSchema>;
export type GuidedWorkflowStep = z.infer<typeof GuidedWorkflowStepSchema>;

export const validateBlueprint = (spec: unknown): GuidedWorkflowBlueprint => {
  return GuidedWorkflowBlueprintSchema.parse(spec);
};

export const loadBlueprint = (filePath: string): GuidedWorkflowBlueprint => {
  const resolved = path.resolve(filePath);
  const raw = fs.readFileSync(resolved, 'utf-8');
  const data = resolved.endsWith('.json') ? JSON.parse(raw) : yaml.load(raw);
  return validateBlueprint(data);
};
