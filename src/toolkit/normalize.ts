import { createHash } from 'crypto';
import type { OsintTool, ToolRegistry } from './schema.js';

/**
 * Computes a deterministic ID for a tool based on its source and name.
 */
export function normalizeToolId(source: string, name: string): string {
  const normalizedSource = source.trim().toLowerCase();
  const normalizedName = name.trim().toLowerCase();
  const hash = createHash('sha256').update(`${normalizedSource}::${normalizedName}`).digest('hex');

  const slug = normalizedName
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `${normalizedSource}-${slug}-${hash.substring(0, 8)}`;
}

/**
 * Normalizes and sorts an array of tools deterministically by their IDs.
 */
export function sortRegistry(tools: OsintTool[]): OsintTool[] {
  return [...tools].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Constructs a fully normalized ToolRegistry object.
 */
export function createNormalizedRegistry(source: string, tools: OsintTool[], generatedAt?: string): ToolRegistry {
  const sortedTools = sortRegistry(tools);
  return {
    source,
    tools: sortedTools,
    count: sortedTools.length,
    // Provide a deterministic fallback if not supplied (for static artifacts/evidence)
    generatedAt: generatedAt || '2024-01-01T00:00:00.000Z',
  };
}
