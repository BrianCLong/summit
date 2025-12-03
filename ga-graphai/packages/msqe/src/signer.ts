import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { TraceBundle, TracePayload } from './types.js';

export function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return JSON.stringify(value);
  }

  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => stableStringify(item));
    return `[${items.join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));

  const serialized = entries
    .map(([key, v]) => `${JSON.stringify(key)}:${stableStringify(v)}`)
    .join(',');

  return `{${serialized}}`;
}

export function digestOf(value: unknown): string {
  const canonical = stableStringify(value);
  return createHash('sha256').update(canonical).digest('hex');
}

export function canonicalPayload(payload: TracePayload): string {
  return stableStringify(payload);
}

export function hashPayload(payload: TracePayload): string {
  return createHash('sha256').update(canonicalPayload(payload)).digest('hex');
}

export function signPayload(payload: TracePayload, secret: string | Buffer): { hash: string; signature: string } {
  const hash = hashPayload(payload);
  const signature = createHmac('sha256', secret).update(hash).digest('hex');
  return { hash, signature };
}

function toTracePayload(payload: TracePayload | TraceBundle): TracePayload {
  const { version, requestId, createdAt, summary, events } = payload;
  return { version, requestId, createdAt, summary, events };
}

export function verifySignature(payload: TracePayload | TraceBundle, secret: string | Buffer, signature: string): boolean {
  const base = toTracePayload(payload);
  const { signature: expectedSignature } = signPayload(base, secret);
  try {
    return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
  } catch {
    return false;
  }
}

export function previewOf(value: unknown, maxLength = 160): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
  }

  const serialized = stableStringify(value);
  return serialized.length > maxLength ? `${serialized.slice(0, maxLength)}…` : serialized;
}
