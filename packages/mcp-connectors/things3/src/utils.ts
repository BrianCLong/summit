import crypto from 'crypto';
import { MCPTool, TaskRef, TaskSpec, TaskPatch, TaskSearchFilters } from './types.js';

const DEFAULT_REDACT_KEYS = [
  'token',
  'secret',
  'password',
  'authorization',
  'things_token',
];

export const idempotencyMarker = (key: string) => `summit://task/${key}`;

export const stableStringify = (value: unknown): string => {
  if (value === null || value === undefined) {
    return String(value);
  }
  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const entries = keys.map((key) =>
    `${JSON.stringify(key)}:${stableStringify(record[key])}`,
  );
  return `{${entries.join(',')}}`;
};

export const hashRequest = (input: unknown): string => {
  const payload = stableStringify(input);
  return crypto.createHash('sha256').update(payload).digest('hex');
};

const shouldRedactKey = (key: string, extraKeys?: string[]) => {
  const lower = key.toLowerCase();
  const keys = extraKeys ? DEFAULT_REDACT_KEYS.concat(extraKeys) : DEFAULT_REDACT_KEYS;
  return keys.some((needle) => lower.includes(needle.toLowerCase()));
};

export const redact = (value: unknown, extraKeys?: string[]): unknown => {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, extraKeys));
  }
  if (typeof value !== 'object') {
    return value;
  }
  const record = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(record)) {
    if (shouldRedactKey(key, extraKeys)) {
      output[key] = '[REDACTED]';
    } else {
      output[key] = redact(val, extraKeys);
    }
  }
  return output;
};

export const summarizeResponse = (response: unknown): Record<string, unknown> => {
  if (Array.isArray(response)) {
    return {
      kind: 'array',
      count: response.length,
      sample: response.slice(0, 3).map((item) => summarizeResponse(item)),
    };
  }
  if (response && typeof response === 'object') {
    const record = response as Record<string, unknown>;
    const keys = Object.keys(record).slice(0, 12);
    return {
      kind: 'object',
      keys,
    };
  }
  return { kind: 'scalar', value: response };
};

export const extractTasks = (response: unknown): Record<string, unknown>[] => {
  if (!response) {
    return [];
  }
  if (Array.isArray(response)) {
    return response as Record<string, unknown>[];
  }
  if (typeof response === 'object') {
    const record = response as Record<string, unknown>;
    const candidates = ['tasks', 'todos', 'results', 'items', 'data'];
    for (const key of candidates) {
      const value = record[key];
      if (Array.isArray(value)) {
        return value as Record<string, unknown>[];
      }
    }
  }
  return [];
};

const asString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return undefined;
};

const asStringArray = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    return value.map((item) => asString(item)).filter(Boolean) as string[];
  }
  return undefined;
};

export const normalizeTask = (item: Record<string, unknown>): TaskRef => {
  const id =
    asString(item.id) ||
    asString(item.uuid) ||
    asString(item.identifier) ||
    'unknown';
  const title = asString(item.title) || asString(item.name);
  const notes = asString(item.notes) || asString(item.note) || asString(item.description);
  const statusRaw = asString(item.status) || asString(item.state);
  const completed = item.completed === true || statusRaw === 'completed';
  let status: TaskRef['status'] = 'open';
  if (completed) {
    status = 'completed';
  } else if (statusRaw === 'canceled') {
    status = 'canceled';
  }
  const tags = asStringArray(item.tags) || asStringArray(item.labels);
  const due = asString(item.due) || asString(item.dueDate);
  const scheduled = asString(item.scheduled) || asString(item.start) || asString(item.scheduledDate);
  const project = asString(item.project) || asString(item.projectName);
  const area = asString(item.area) || asString(item.areaName);
  const url = asString(item.url) || asString(item.link);

  return {
    id,
    title,
    notes,
    status,
    tags,
    due,
    scheduled,
    project,
    area,
    url,
    raw: item,
  };
};

export const normalizeTasks = (response: unknown): TaskRef[] =>
  extractTasks(response).map((item) => normalizeTask(item));

const mapFields = <T extends TaskSpec | TaskPatch | TaskSearchFilters>(
  input: T,
  mapping: Record<string, string[]>,
  schema?: MCPTool['inputSchema'],
): Record<string, unknown> => {
  const output: Record<string, unknown> = {};
  const schemaKeys = schema?.properties ? Object.keys(schema.properties) : [];

  for (const [field, candidates] of Object.entries(mapping)) {
    const value = (input as Record<string, unknown>)[field];
    if (value === undefined) {
      continue;
    }
    const match = schemaKeys.find((key) => candidates.includes(key));
    if (match) {
      output[match] = value;
    } else if (schemaKeys.length === 0 || schemaKeys.includes(field)) {
      output[field] = value;
    }
  }

  return output;
};

export const buildSearchArgs = (
  tool: MCPTool,
  query: string,
  filters?: TaskSearchFilters,
): Record<string, unknown> => {
  const mapping = {
    query: ['query', 'search', 'text', 'q'],
    status: ['status', 'state'],
    tag: ['tag', 'tags', 'label'],
    project: ['project', 'projectName', 'projectId'],
    area: ['area', 'areaName', 'areaId'],
    limit: ['limit', 'maxResults', 'max'],
  };
  const base = mapFields({ query, ...filters } as TaskSearchFilters & { query: string }, mapping, tool.inputSchema);
  if (Object.keys(base).length === 0) {
    return { query, filters };
  }
  return base;
};

export const buildCreateArgs = (
  tool: MCPTool,
  spec: TaskSpec,
): Record<string, unknown> => {
  const mapping = {
    title: ['title', 'name'],
    notes: ['notes', 'note', 'description'],
    tags: ['tags', 'labels'],
    due: ['due', 'dueDate'],
    scheduled: ['scheduled', 'start', 'scheduledDate'],
    project: ['project', 'projectName', 'projectId'],
    area: ['area', 'areaName', 'areaId'],
    status: ['status', 'state', 'completed'],
    url: ['url', 'link'],
  };
  const base = mapFields(spec, mapping, tool.inputSchema);
  if (Object.keys(base).length === 0) {
    return { ...spec };
  }
  return base;
};

export const buildUpdateArgs = (
  tool: MCPTool,
  patch: TaskPatch,
): Record<string, unknown> => {
  const mapping = {
    title: ['title', 'name'],
    notes: ['notes', 'note', 'description'],
    tags: ['tags', 'labels'],
    due: ['due', 'dueDate'],
    scheduled: ['scheduled', 'start', 'scheduledDate'],
    project: ['project', 'projectName', 'projectId'],
    area: ['area', 'areaName', 'areaId'],
    status: ['status', 'state', 'completed'],
  };
  const base = mapFields(patch, mapping, tool.inputSchema);
  if (Object.keys(base).length === 0) {
    return { ...patch };
  }
  return base;
};

const scoreTool = (tool: MCPTool, keywords: string[]): number => {
  const haystack = `${tool.name} ${tool.description ?? ''}`.toLowerCase();
  return keywords.reduce((score, keyword) =>
    haystack.includes(keyword) ? score + 1 : score,
  0);
};

export const selectTool = (
  tools: MCPTool[],
  keywords: string[],
): MCPTool | undefined => {
  const scored = tools
    .map((tool) => ({ tool, score: scoreTool(tool, keywords) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.tool;
};
