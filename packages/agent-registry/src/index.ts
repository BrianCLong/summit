import fs from 'fs/promises';
import path from 'path';
import { glob, hasMagic } from 'glob';
import { parse } from 'yaml';
import { z } from 'zod';

export type AgentRole = 'orchestrator' | 'specialist' | 'critic' | 'executor';
export type DataAccess = 'public' | 'internal' | 'restricted';

export interface AgentInput {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface AgentOutput {
  name: string;
  type: string;
  description?: string;
}

export interface AgentDef {
  id: string;
  name: string;
  version: string;
  description: string;
  role: AgentRole;
  inputs: AgentInput[];
  outputs: AgentOutput[];
  sop_refs?: string[];
  allowed_tools: string[];
  data_access: DataAccess;
  policies?: string[];
  evals?: string[];
  tags?: string[];
  owner?: string;
}

export interface ValidationError {
  file: string;
  message: string;
  path?: string;
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    return entries.reduce<Record<string, unknown>>((acc, [key, entryValue]) => {
      acc[key] = sortObjectKeys(entryValue);
      return acc;
    }, {});
  }
  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortObjectKeys(value), null, 2);
}

const semverRegex =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

const AgentInputSchema = z
  .object({
    name: z.string().min(1),
    type: z.string().min(1),
    required: z.boolean(),
    description: z.string().optional(),
  })
  .strict();

const AgentOutputSchema = z
  .object({
    name: z.string().min(1),
    type: z.string().min(1),
    description: z.string().optional(),
  })
  .strict();

const AgentDefSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: z.string().min(1),
    version: z.string().regex(semverRegex),
    description: z.string().min(1),
    role: z.enum(['orchestrator', 'specialist', 'critic', 'executor']),
    inputs: z.array(AgentInputSchema),
    outputs: z.array(AgentOutputSchema),
    sop_refs: z.array(z.string()).optional(),
    allowed_tools: z.array(z.string()).default([]),
    data_access: z.enum(['public', 'internal', 'restricted']).default('internal'),
    policies: z.array(z.string()).optional(),
    evals: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    owner: z.string().optional(),
  })
  .strict();

export function validateAgentDef(value: unknown): AgentDef {
  return AgentDefSchema.parse(value);
}

export function getAgentById(agents: AgentDef[], id: string): AgentDef | undefined {
  return agents.find((agent) => agent.id === id);
}

function formatZodErrors(file: string, error: z.ZodError): ValidationError[] {
  return error.issues.map((issue) => ({
    file,
    path: issue.path.length > 0 ? issue.path.join('.') : undefined,
    message: issue.message,
  }));
}

function isYamlFile(entry: string): boolean {
  return entry.toLowerCase().endsWith('.yaml') || entry.toLowerCase().endsWith('.yml');
}

async function resolveRegistryFiles(dirOrGlob: string): Promise<string[]> {
  if (hasMagic(dirOrGlob)) {
    return (await glob(dirOrGlob, { nodir: true })).sort();
  }

  const resolvedPath = path.resolve(dirOrGlob);
  try {
    const stat = await fs.stat(resolvedPath);
    if (stat.isDirectory()) {
      const entries = await fs.readdir(resolvedPath);
      return entries
        .filter(isYamlFile)
        .map((entry) => path.join(resolvedPath, entry))
        .sort();
    }
    if (stat.isFile()) {
      return [resolvedPath];
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Unable to access registry path: ${error.message}`);
    }
  }

  return [];
}

export async function loadAgentRegistry(
  dirOrGlob: string
): Promise<{ agents: AgentDef[]; errors: ValidationError[] }> {
  const errors: ValidationError[] = [];
  const agents: Array<{ agent: AgentDef; file: string }> = [];
  let files: string[] = [];

  try {
    files = await resolveRegistryFiles(dirOrGlob);
  } catch (error) {
    errors.push({
      file: dirOrGlob,
      message: error instanceof Error ? error.message : 'Unable to resolve registry path.',
    });
    return { agents: [], errors };
  }

  if (files.length === 0) {
    errors.push({
      file: dirOrGlob,
      message: 'No registry files found.',
    });
    return { agents: [], errors };
  }

  for (const file of files) {
    try {
      const raw = await fs.readFile(file, 'utf-8');
      const parsed = parse(raw);
      const agent = validateAgentDef(parsed);
      agents.push({ agent, file });
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...formatZodErrors(file, error));
      } else if (error instanceof Error) {
        errors.push({
          file,
          message: `YAML parse failed: ${error.message}`,
        });
      } else {
        errors.push({ file, message: 'Unknown error while parsing registry file.' });
      }
    }
  }

  const uniqueAgents: AgentDef[] = [];
  const seen = new Map<string, string>();
  for (const entry of agents) {
    const existing = seen.get(entry.agent.id);
    if (existing) {
      errors.push({
        file: entry.file,
        path: 'id',
        message: `Duplicate agent id "${entry.agent.id}" also defined in ${existing}.`,
      });
      continue;
    }
    seen.set(entry.agent.id, entry.file);
    uniqueAgents.push(entry.agent);
  }

  uniqueAgents.sort((a, b) => a.id.localeCompare(b.id));

  return { agents: uniqueAgents, errors };
}
