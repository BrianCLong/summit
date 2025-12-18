import crypto from 'crypto';
import { translate } from './translator.js';
import { SandboxResult } from './types.js';

const ROW_CAP = 20;

function seedObject(label: string): Record<string, unknown> {
  const hash = crypto.createHash('md5').update(label).digest('hex').slice(0, 6);
  return {
    label,
    id: hash,
    name: `${label}-${hash}`,
  };
}

export function sandboxRun(prompt: string): SandboxResult {
  const translation = translate(prompt);
  const base = seedObject(translation.cypher.match(/\((\w+):/i)?.[1] || 'Node');
  const requestedRows = Math.max(5, Math.floor(translation.confidence * 30));
  const previewRows: Record<string, unknown>[] = [];

  for (let i = 0; i < Math.min(requestedRows, ROW_CAP + 5); i += 1) {
    previewRows.push({ ...base, row: i + 1 });
  }

  const truncated = previewRows.length > ROW_CAP;
  return { previewRows: previewRows.slice(0, ROW_CAP), truncated };
}
