import { createHash } from 'node:crypto';

export interface ManifestData {
  runId: string;
  inputs: string[];
  outputs: string[];
  timestamp?: string; // Optional for determinism
}

/**
 * Generates a run-manifest object.
 */
export function generateManifest(runId: string, inputs: string[], outputs: string[], timestamp?: string) {
  const manifest: any = {
    version: "v1",
    runId,
    inputs: [...inputs].sort(),
    outputs: [...outputs].sort(),
  };

  if (timestamp) {
    manifest.timestamp = timestamp;
  }

  return manifest;
}

/**
 * Canonicalizes an object into a stable JSON string.
 */
export function canonicalize(obj: any): string {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return JSON.stringify(obj);
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(key => `"${key}":${canonicalize(obj[key])}`);
  return `{${pairs.join(',')}}`;
}

/**
 * Computes the SHA256 digest of a string.
 */
export function computeDigest(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
