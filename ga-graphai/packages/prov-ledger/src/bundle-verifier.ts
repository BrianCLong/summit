import { createHash } from 'node:crypto';
import type { EvidenceBundle, MerkleProofStep } from 'common-types';
import {
  augmentEvidenceBundle,
  buildMerkleArtifacts,
  verifyMerkleProof,
  verifySnapshotSignature,
} from './bundle-utils.js';

export interface BundleVerificationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function computeLeafFromStoredHashes(
  atomId: string,
  bundle: EvidenceBundle,
  fallbackContent: Record<string, string>,
  fallbackMetadata: Record<string, string>,
): string {
  const contentHash = bundle.contentHashes?.[atomId];
  const metadataHash = bundle.metadataHashes?.[atomId];
  if (contentHash && metadataHash) {
    return createHash('sha256').update(`${contentHash}${metadataHash}`).digest('hex');
  }
  const fallbackContentHash = fallbackContent[atomId];
  const fallbackMetadataHash = fallbackMetadata[atomId];
  return createHash('sha256')
    .update(`${fallbackContentHash ?? ''}${fallbackMetadataHash ?? ''}`)
    .digest('hex');
}

function normalizeProofs(bundle: EvidenceBundle): Record<string, MerkleProofStep[]> {
  return bundle.inclusionProofs ?? {};
}

export class EvidenceBundleVerifier {
  verify(bundle: EvidenceBundle): BundleVerificationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!bundle.entries.length) {
      return { valid: false, errors: ['Bundle contains no entries'], warnings };
    }

    const computedArtifacts = buildMerkleArtifacts(bundle.entries);
    const atomIds = bundle.atomIds ?? computedArtifacts.atomIds;
    const proofs = normalizeProofs(bundle);

    atomIds.forEach((atomId) => {
      if (!computedArtifacts.contentHashes[atomId]) {
        errors.push(`Atom ${atomId} not present in entries`);
      }
    });

    if (!bundle.snapshotCommitment) {
      errors.push('Snapshot commitment is missing');
    }

    const merkleRoot = bundle.snapshotCommitment?.merkleRoot ?? computedArtifacts.merkleRoot;

    atomIds.forEach((atomId) => {
      const leaf = computeLeafFromStoredHashes(
        atomId,
        bundle,
        computedArtifacts.contentHashes,
        computedArtifacts.metadataHashes,
      );
      const proof = proofs[atomId];
      if (!proof) {
        if (bundle.snapshotCommitment?.redacted) {
          warnings.push(`Missing inclusion proof for atom ${atomId} (redacted view)`);
        } else {
          errors.push(`Missing inclusion proof for atom ${atomId}`);
        }
        return;
      }
      if (!verifyMerkleProof(leaf, proof, merkleRoot)) {
        errors.push(`Invalid Merkle proof for atom ${atomId}`);
      }
    });

    if (!merkleRoot) {
      errors.push('Merkle root is empty');
    } else if (computedArtifacts.merkleRoot && merkleRoot !== computedArtifacts.merkleRoot) {
      errors.push('Merkle root mismatch with recomputed tree');
    }

    if (bundle.snapshotCommitment && !verifySnapshotSignature(bundle.snapshotCommitment)) {
      errors.push('Snapshot signature verification failed');
    }

    if (bundle.policyDecisionTokens && bundle.policyDecisionTokens.length > 0) {
      const derived = augmentEvidenceBundle(
        { ...bundle, policyDecisionTokens: undefined },
        bundle.entries,
        { issuedAt: bundle.snapshotCommitment ? new Date(bundle.snapshotCommitment.issuedAt) : undefined },
      ).policyDecisionTokens;
      const derivedTokens = (derived ?? []).map((token) => token.token).sort();
      const providedTokens = bundle.policyDecisionTokens.map((token) => token.token).sort();
      if (derivedTokens.join('|') !== providedTokens.join('|')) {
        errors.push('Policy decision tokens do not match derived tokens');
      }
    } else {
      warnings.push('No policy decision tokens supplied');
    }

    if (bundle.executionAttestation) {
      if (!bundle.executionAttestation.report) {
        errors.push('Execution attestation report missing');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}
