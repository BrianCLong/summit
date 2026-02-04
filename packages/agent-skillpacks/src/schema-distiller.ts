import {
  type DistilledToolSchema,
  type JsonSchema,
  type ToolSchema,
} from './types';

export function distillToolSchema(tool: ToolSchema): DistilledToolSchema {
  const purpose = tool.description ?? 'Deferred pending schema source.';
  const paramsSummary = summarizeParams(tool.inputSchema);
  const safetyNote = tool.metadata?.safety ?? 'Governed usage enforced by policy gate.';
  const permissions = tool.metadata?.permissions ?? [];

  return {
    name: tool.name,
    purpose,
    paramsSummary,
    safetyNote,
    permissions,
    source: 'distilled',
  };
}

export function estimateTokensFromSchema(schema: unknown): number {
  const text = JSON.stringify(schema);
  return Math.ceil(text.length / 4);
}

function summarizeParams(schema?: JsonSchema): string {
  if (!schema || !schema.properties) {
    return 'No structured parameters registered.';
  }
  const entries = Object.entries(schema.properties).map(([key, value]) => {
    const type = value.type ?? 'unknown';
    const required = schema.required?.includes(key) ? 'required' : 'optional';
    return `${key}: ${type} (${required})`;
  });
  return entries.length > 0 ? entries.join('; ') : 'No structured parameters registered.';
}
