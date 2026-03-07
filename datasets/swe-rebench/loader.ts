import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { SweRebenchInstance, SweRebenchLoadOptions } from './types';

function isSweRebenchInstance(value: unknown): value is SweRebenchInstance {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.instance_id === 'string' &&
    typeof candidate.repo === 'string' &&
    typeof candidate.base_commit === 'string' &&
    typeof candidate.image_name === 'string'
  );
}

function parseJsonl(raw: string): unknown[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

function normalizeArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

export class SweRebenchLoader {
  async loadDataset(datasetPath: string, options: SweRebenchLoadOptions = {}): Promise<SweRebenchInstance[]> {
    const raw = await readFile(datasetPath, 'utf8');
    const ext = path.extname(datasetPath).toLowerCase();

    const parsed = ext === '.jsonl' ? parseJsonl(raw) : JSON.parse(raw);
    const rows = Array.isArray(parsed) ? parsed : [parsed];

    const validated = rows.map((row, index) => {
      if (!isSweRebenchInstance(row)) {
        throw new Error(`Invalid SWE-rebench row at index ${index}: required keys are instance_id, repo, base_commit, image_name`);
      }

      return {
        ...row,
        fail_to_pass: normalizeArray(row.fail_to_pass),
        pass_to_pass: normalizeArray(row.pass_to_pass),
      } satisfies SweRebenchInstance;
    });

    const languageFilter = options.languages ? new Set(options.languages.map((lang) => lang.toLowerCase())) : null;
    const filtered = languageFilter
      ? validated.filter((instance) => instance.language && languageFilter.has(instance.language.toLowerCase()))
      : validated;

    if (!options.maxInstances || options.maxInstances <= 0) {
      return filtered;
    }

    return filtered.slice(0, options.maxInstances);
  }
}
