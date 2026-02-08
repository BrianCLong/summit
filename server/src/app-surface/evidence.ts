/**
 * Evidence Bundle Emitter
 *
 * Produces deterministic evidence bundles with stable SHA-256 hashing.
 * Persists bundles to local filesystem (swappable to DB via interface).
 */

import { createHash, randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { EvidenceBundle, PolicyPreflightRequest, ToolVerdict } from './schemas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EVIDENCE_DIR = resolve(__dirname, '..', '..', 'data', 'evidence');

/**
 * Compute a deterministic SHA-256 hash of a JSON-serializable value.
 * Keys are sorted to ensure determinism regardless of insertion order.
 */
export function deterministicHash(value: unknown): string {
  const canonical = JSON.stringify(value, Object.keys(value as object).sort());
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Build an evidence bundle from preflight inputs and outputs.
 */
export function buildEvidenceBundle(
  request: PolicyPreflightRequest,
  toolVerdicts: ToolVerdict[],
  verdict: 'ALLOW' | 'DENY' | 'PARTIAL',
  actor: string,
): EvidenceBundle {
  const id = randomUUID();
  const timestamp = new Date().toISOString();

  const inputsHash = deterministicHash({
    environment: request.environment,
    tools: [...request.tools].sort(),
    rationale: request.rationale,
    dryRun: request.dryRun,
  });

  const outputsHash = deterministicHash({
    verdict,
    toolVerdicts: toolVerdicts.map((v) => ({
      tool: v.tool,
      allowed: v.allowed,
      reason: v.reason,
    })),
  });

  return {
    id,
    timestamp,
    actor,
    action: 'policy_preflight',
    inputsHash,
    outputsHash,
    policyDecision: verdict,
    environment: request.environment,
    tools: request.tools,
    toolVerdicts,
    rationale: request.rationale,
    dryRun: request.dryRun ?? false,
  };
}

/**
 * Persist an evidence bundle to the local filesystem.
 * Creates the evidence directory if it does not exist.
 */
export async function persistEvidenceBundle(
  bundle: EvidenceBundle,
  baseDir: string = EVIDENCE_DIR,
): Promise<string> {
  await mkdir(baseDir, { recursive: true });
  const filePath = resolve(baseDir, `${bundle.id}.json`);
  await writeFile(filePath, JSON.stringify(bundle, null, 2), 'utf-8');
  return filePath;
}
