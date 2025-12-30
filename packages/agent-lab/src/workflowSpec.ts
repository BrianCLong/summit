import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { z } from 'zod';

export const WorkflowStepSchema = z.object({
  name: z.string(),
  tool: z.string(),
  inputs: z.record(z.string(), z.any()).optional(),
  expect: z.array(z.string()).optional(),
});

export const WorkflowSpecSchema = z.object({
  version: z.string().default('1.0.0'),
  name: z.string(),
  description: z.string().optional(),
  dryRun: z.boolean().optional(),
  objectives: z.array(z.string()).optional(),
  expect: z.array(z.string()).optional(),
  policy: z
    .object({
      allowedTools: z.array(z.string()).optional(),
      targetAllowlist: z.array(z.string()).optional(),
      commandAllowlist: z.array(z.string()).optional(),
      defaultTimeoutMs: z.number().optional(),
    })
    .optional(),
  steps: z.array(WorkflowStepSchema).nonempty(),
});

export type WorkflowSpec = z.infer<typeof WorkflowSpecSchema>;

export const validateWorkflowSpec = (spec: unknown): WorkflowSpec => {
  return WorkflowSpecSchema.parse(spec);
};

export const loadWorkflowSpec = (filePath: string): WorkflowSpec => {
  const resolved = path.resolve(filePath);
  const raw = fs.readFileSync(resolved, 'utf-8');
  const data = resolved.endsWith('.json') ? JSON.parse(raw) : yaml.load(raw);
  return validateWorkflowSpec(data);
};
