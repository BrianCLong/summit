import { createHash } from 'node:crypto';

export type EvidenceId =
  `EVID::${string}::${string}::${string}::${string}`;

export interface EvidenceIdParts {
  tenant: string;
  source: string;
  date: string;
  hash: string;
}

const evidenceIdPattern =
  /^EVID::([^:]+)::([^:]+)::(\d{4}-\d{2}-\d{2})::([a-f0-9]{16,64})$/;

export function stableJsonStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableJsonStringify).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const entries = keys.map((key) => {
    return `${JSON.stringify(key)}:${stableJsonStringify(record[key])}`;
  });

  return `{${entries.join(',')}}`;
}

export function stableHash(value: unknown): string {
  const canonical = stableJsonStringify(value);
  return createHash('sha256').update(canonical).digest('hex');
}

export function toEvidenceDate(occurredAt: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(occurredAt)) {
    return occurredAt;
  }

  const parsed = new Date(occurredAt);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid occurred_at timestamp: ${occurredAt}`);
  }

  return parsed.toISOString().slice(0, 10);
}

export function buildEvidenceId(input: {
  tenant: string;
  source: string;
  occurredAt: string;
  payload: unknown;
}): EvidenceId {
  const date = toEvidenceDate(input.occurredAt);
  const hash = stableHash(input.payload).slice(0, 32);
  return `EVID::${input.tenant}::${input.source}::${date}::${hash}`;
}

export function parseEvidenceId(evidenceId: string): EvidenceIdParts | null {
  const match = evidenceIdPattern.exec(evidenceId);
  if (!match) {
    return null;
  }

  const [, tenant, source, date, hash] = match;
  return { tenant, source, date, hash };
}

export function isEvidenceId(value: string): value is EvidenceId {
  return evidenceIdPattern.test(value);
}

export function assertEvidenceId(value: string): asserts value is EvidenceId {
  if (!isEvidenceId(value)) {
    throw new Error(`Invalid evidence id: ${value}`);
  }
}
