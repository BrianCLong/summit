import type { ContextManifest } from './types.js';

export const CONTEXT_MANIFEST_SCHEMA_VERSION = '1.0.0';

export const ContextManifestSchema = {
  $id: 'https://summit.example.com/schemas/context-manifest.json',
  type: 'object',
  required: ['schemaVersion', 'createdAt', 'items', 'evictions', 'metrics'],
  properties: {
    schemaVersion: { type: 'string' },
    runId: { type: 'string' },
    createdAt: { type: 'string' },
    items: { type: 'array' },
    evictions: { type: 'array' },
    metrics: { type: 'object' },
  },
} as const;

export function validateManifest(manifest: ContextManifest): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!manifest.schemaVersion) {
    errors.push('schemaVersion is required');
  }
  if (!manifest.createdAt) {
    errors.push('createdAt is required');
  }
  if (!Array.isArray(manifest.items)) {
    errors.push('items must be an array');
  }
  if (!Array.isArray(manifest.evictions)) {
    errors.push('evictions must be an array');
  }
  if (!manifest.metrics) {
    errors.push('metrics is required');
  }
  return { valid: errors.length === 0, errors };
}
