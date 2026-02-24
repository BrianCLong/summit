/**
 * Evidence Bundle Emitter
 *
 * Produces deterministic, tamper-evident JSON evidence bundles.
 * Uses SHA-256 for all hashing. Bundles are persisted to local
 * filesystem under audit/app-surface/.
 */

import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { EvidenceBundleSchema, type EvidenceBundle, type PolicyVerdict, type Environment } from './types.js';
import logger from '../config/logger.js';

const evidenceLogger = logger.child({ name: 'EvidenceBundleEmitter' });

/**
 * Compute a deterministic SHA-256 hash of a JSON-serializable value.
 * Keys are sorted to ensure determinism regardless of insertion order.
 */
export function deterministicHash(value: unknown): string {
  const canonical = JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort());
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/**
 * Compute SHA-256 hash of an arbitrary string.
 */
export function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Produce a canonical JSON string for hashing.
 * Handles nested objects by recursively sorting keys.
 */
export function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalize).join(',') + ']';
  }
  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const entries = sortedKeys.map(k => JSON.stringify(k) + ':' + canonicalize(obj[k]));
  return '{' + entries.join(',') + '}';
}

/**
 * Compute a deterministic hash over deeply nested objects.
 */
export function deepDeterministicHash(value: unknown): string {
  return createHash('sha256').update(canonicalize(value), 'utf8').digest('hex');
}

export interface EmitEvidenceInput {
  actor: string;
  action: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  policyDecision: PolicyVerdict;
  environment: Environment;
  details?: Record<string, unknown>;
}

/**
 * Evidence storage directory. Defaults to <repo>/audit/app-surface.
 * Can be overridden via EVIDENCE_STORAGE_DIR env var.
 */
function getStorageDir(): string {
  return process.env.EVIDENCE_STORAGE_DIR || join(process.cwd(), '..', 'audit', 'app-surface');
}

/**
 * Create and persist an evidence bundle. Returns the validated bundle.
 */
export async function emitEvidenceBundle(input: EmitEvidenceInput): Promise<EvidenceBundle> {
  const id = `ev-${randomUUID()}`;
  const timestamp = new Date().toISOString();
  const inputsHash = deepDeterministicHash(input.inputs);
  const outputsHash = deepDeterministicHash(input.outputs);

  // Build the bundle without the integrity hash first
  const preBundle = {
    id,
    version: '1.0' as const,
    timestamp,
    actor: input.actor,
    action: input.action,
    inputsHash,
    outputsHash,
    policyDecision: input.policyDecision,
    environment: input.environment,
    details: input.details ?? {},
  };

  // Integrity hash covers all fields
  const integrityHash = deepDeterministicHash(preBundle);

  const bundle: EvidenceBundle = {
    ...preBundle,
    integrityHash,
  };

  // Validate against schema
  EvidenceBundleSchema.parse(bundle);

  // Persist to filesystem
  try {
    const storageDir = getStorageDir();
    await mkdir(storageDir, { recursive: true });
    const filePath = join(storageDir, `${id}.json`);
    await writeFile(filePath, JSON.stringify(bundle, null, 2), 'utf8');
    evidenceLogger.info({ evidenceId: id, filePath }, 'Evidence bundle persisted');
  } catch (err) {
    evidenceLogger.error({ error: (err as Error).message, evidenceId: id }, 'Failed to persist evidence bundle');
    // Don't throw — the bundle is still returned and can be stored elsewhere
  }

  return bundle;
}
