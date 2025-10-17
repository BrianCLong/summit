import crypto from 'crypto';
import yaml from 'js-yaml';
import { z } from 'zod';

export const TaskSchema = z.object({
  id: z.string().min(1),
  uses: z.string().min(1),
  with: z.record(z.any()).optional(),
  needs: z.array(z.string()).optional(),
});

export const WorkflowSpecSchema = z.object({
  apiVersion: z.literal('chronos.v1'),
  kind: z.literal('Workflow'),
  metadata: z.object({
    name: z.string().min(1),
    namespace: z.string().min(1),
  }),
  spec: z.object({
    inputs: z.record(z.any()).optional(),
    tasks: z.array(TaskSchema).min(1),
    retries: z
      .object({
        default: z.object({
          strategy: z.enum(['none', 'fixed', 'exponential']).default('exponential'),
          maxAttempts: z.number().int().positive().default(3),
          baseMs: z.number().int().positive().default(250),
        }),
      })
      .optional(),
    compensation: z.any().optional(),
  }),
});

export type WorkflowSpec = z.infer<typeof WorkflowSpecSchema>;

export interface IRNode {
  id: string;
  uses: string;
  with?: Record<string, unknown>;
}

export interface IREdge {
  from: string;
  to: string;
}

export interface IRDag {
  name: string;
  namespace: string;
  nodes: IRNode[];
  edges: IREdge[];
  retry: {
    strategy: 'none' | 'fixed' | 'exponential';
    maxAttempts: number;
    baseMs: number;
  };
  specHash: string;
}

export function compileToIR(spec: WorkflowSpec): IRDag {
  const nodes = spec.spec.tasks.map((task) => ({
    id: task.id,
    uses: task.uses,
    with: task.with,
  }));

  const edges: IREdge[] = [];
  for (const task of spec.spec.tasks) {
    for (const dependency of task.needs ?? []) {
      edges.push({ from: dependency, to: task.id });
    }
  }

  nodes.sort((a, b) => a.id.localeCompare(b.id));
  edges.sort((a, b) => `${a.from}:${a.to}`.localeCompare(`${b.from}:${b.to}`));

  const retry = spec.spec.retries?.default ?? {
    strategy: 'exponential',
    maxAttempts: 3,
    baseMs: 250,
  };

  const specHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(spec))
    .digest('hex');

  return {
    name: spec.metadata.name,
    namespace: spec.metadata.namespace,
    nodes,
    edges,
    retry,
    specHash,
  };
}

export function parseWorkflow(yamlText: string): WorkflowSpec {
  const raw = yaml.load(yamlText);
  return WorkflowSpecSchema.parse(raw);
}

export function yamlToIR(yamlText: string): IRDag {
  const spec = parseWorkflow(yamlText);
  return compileToIR(spec);
}

export function jsonToIR(jsonText: string): IRDag {
  const raw = JSON.parse(jsonText);
  const spec = WorkflowSpecSchema.parse(raw);
  return compileToIR(spec);
}
