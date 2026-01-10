import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { computeRoot } from './merkle.js';
import { stableHash } from './stableHash.js';
import type { BuildProof } from './types.js';

export interface VerificationResult {
  success: boolean;
  rootMatches: boolean;
  artifactsMatch: boolean;
  errors: string[];
}

export async function verifyProof(proofPath: string, outDir: string): Promise<VerificationResult> {
  if (!existsSync(proofPath)) {
    return { success: false, rootMatches: false, artifactsMatch: false, errors: [`Proof file not found: ${proofPath}`] };
  }

  const proof: BuildProof = JSON.parse(readFileSync(proofPath, 'utf-8'));
  const errors: string[] = [];

  // 1. Verify Root
  // Reconstruct root from layers in proof
  try {
    const computedRoot = computeRoot(proof.layers);
    if (computedRoot !== proof.root) {
      errors.push(`Root hash mismatch. Proof: ${proof.root}, Computed: ${computedRoot}`);
    }
  } catch (e) {
    errors.push(`Error computing root: ${e}`);
  }

  // 2. Verify Artifacts
  // Check if current artifacts on disk match the digests in the proof
  for (const [relPath, digestInfo] of Object.entries(proof.artifactDigests)) {
    const fullPath = join(outDir, relPath);
    if (!existsSync(fullPath)) {
      errors.push(`Artifact missing: ${relPath}`);
      continue;
    }
    const content = readFileSync(fullPath);
    const actualDigest = stableHash([content]);

    // Support both old string format (if any legacy proof exists) and new object format
    const expectedDigest = typeof digestInfo === 'string' ? digestInfo : digestInfo.digest;

    if (actualDigest !== expectedDigest) {
      errors.push(`Artifact hash mismatch for ${relPath}. Expected ${expectedDigest}, got ${actualDigest}`);
    }
  }

  const rootMatches = !errors.some(e => e.includes('Root hash mismatch'));
  const artifactsMatch = !errors.some(e => e.includes('Artifact'));

  return {
    success: errors.length === 0,
    rootMatches,
    artifactsMatch,
    errors
  };
}
