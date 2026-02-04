import { DistilledToolSchema, ToolSchema } from './types.js';

const TOKEN_DIVISOR = 4;

const stringifyForEstimate = (value: unknown): string =>
  JSON.stringify(value, Object.keys(value ?? {}).sort());

export const estimateTokenFootprint = (value: unknown): number => {
  const serialized = stringifyForEstimate(value);
  return Math.max(1, Math.ceil(serialized.length / TOKEN_DIVISOR));
};

export const summarizeParams = (schema?: ToolSchema['inputSchema']): string[] => {
  if (!schema?.properties) {
    return [];
  }
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties).map(([name, details]) => {
    const type = details.type ?? 'unknown';
    const requiredFlag = required.has(name) ? 'required' : 'optional';
    const description = details.description ? ` - ${details.description}` : '';
    return `${name}: ${type} (${requiredFlag})${description}`;
  });
};

export const distillToolSchema = (
  tool: ToolSchema,
  safetyNotes: string[],
  source: DistilledToolSchema['source']
): DistilledToolSchema => {
  const params = summarizeParams(tool.inputSchema);
  const summary = tool.description?.trim() || 'No description provided.';
  const tokenEstimate = estimateTokenFootprint({ name: tool.name, summary, params });
  return {
    name: tool.name,
    summary,
    params,
    safetyNotes,
    tokenEstimate,
    source,
  };
};
