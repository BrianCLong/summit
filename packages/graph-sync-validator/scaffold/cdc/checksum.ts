import { createHash } from 'node:crypto';

function stableSort(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(stableSort);
  }

  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    const next = (value as Record<string, unknown>)[key];
    if (next === null || next === undefined) {
      continue;
    }
    sorted[key] = stableSort(next);
  }
  return sorted;
}

export function canonicalChecksum(payload: unknown): string {
  const canonical = JSON.stringify(stableSort(payload));
  return createHash('sha256').update(canonical).digest('hex');
}

export function mutationVersionKey(txid: string, lsn: string): string {
  return `${txid}:${lsn}`;
}
