import { createHash, createVerify, verify as verifySignaturePrimitive } from 'node:crypto';
import type { LineageEnvelope } from './types.js';

export function canonicalStringify(value: unknown): string {
  if (Array.isArray(value)) {
    const serialized = value.map((item) => canonicalStringify(item));
    return `[${serialized.join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    const serialized = entries
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalStringify(item)}`)
      .join(',');
    return `{${serialized}}`;
  }

  return JSON.stringify(value);
}

export function sha256Digest(value: unknown): string {
  return createHash('sha256').update(canonicalStringify(value)).digest('hex');
}

export function verifySignature(envelope: LineageEnvelope): boolean {
  const canonicalDag = canonicalStringify(envelope.dag);
  const signature = Buffer.from(envelope.signature, 'base64');

  if (envelope.algorithm === 'ed25519') {
    try {
      return verifySignaturePrimitive(null, Buffer.from(canonicalDag), envelope.publicKey, signature);
    } catch (error) {
      return false;
    }
  }

  const verifier = createVerify('RSA-SHA256');
  verifier.update(canonicalDag);
  verifier.end();

  try {
    return verifier.verify(envelope.publicKey, signature);
  } catch (error) {
    return false;
  }
}
