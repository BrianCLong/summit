import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { IncidentConfig } from './types.js';

function isIncidentConfig(value: unknown): value is IncidentConfig {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.occurredAt === 'string' &&
    typeof candidate.reportedAt === 'string' &&
    typeof candidate.description === 'string' &&
    typeof candidate.severity === 'string' &&
    Array.isArray(candidate.artifacts)
  );
}

export async function loadIncidentConfig(configPath: string): Promise<IncidentConfig> {
  const resolved = path.resolve(configPath);
  const raw = await fs.readFile(resolved, 'utf8');
  let parsed: unknown;

  if (resolved.endsWith('.yaml') || resolved.endsWith('.yml')) {
    parsed = yaml.load(raw);
  } else {
    parsed = JSON.parse(raw);
  }

  if (!isIncidentConfig(parsed)) {
    throw new Error(`Invalid incident configuration at ${resolved}`);
  }

  return parsed;
}
