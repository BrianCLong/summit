import crypto from 'crypto';

export type Clock = () => Date;

export const defaultClock: Clock = () => new Date();

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return JSON.stringify(value);
  }
  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value.map((item) => JSON.parse(stableStringify(item))));
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([a], [b]) => a.localeCompare(b),
  );
  const normalized = Object.fromEntries(
    entries.map(([key, item]) => [key, JSON.parse(stableStringify(item))]),
  );
  return JSON.stringify(normalized);
}

export function redactValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(/(api|token|secret|password)[^\s]*/gi, '[redacted]')
      .replace(/\b[A-Za-z0-9_\-]{20,}\b/g, '[redacted]');
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return Object.fromEntries(
      entries.map(([key, item]) => [key, redactValue(item)]),
    );
  }
  return value;
}

export function estimateTokens(value: string): number {
  return Math.ceil(value.length / 4);
}

export async function ensureDir(path: string): Promise<void> {
  const fs = await import('fs/promises');
  await fs.mkdir(path, { recursive: true });
}
