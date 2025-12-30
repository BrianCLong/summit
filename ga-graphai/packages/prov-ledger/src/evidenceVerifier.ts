import { createHmac, createHash } from 'node:crypto';
import type { EvidenceAtomProof, EvidenceBundle } from 'common-types';
import { stableHash } from '@ga-graphai/data-integrity';
import { verifyMerkleProof } from './proofs.js';

export interface EvidenceVerificationResult {
  valid: boolean;
  reasons: string[];
}

export interface EvidenceVerificationOptions {
  signingKey?: string;
}

function parseProof(proof?: string[]): { position: 'left' | 'right'; hash: string }[] {
  if (!proof) return [];
  return proof.map((node) => {
    const [position, hash] = node.split(':');
    return { position: position === 'left' ? 'left' : 'right', hash };
  });
}

function deriveLeaf(atom: EvidenceAtomProof): string {
  return createHash('sha256')
    .update(stableHash({
      eaId: atom.eaId,
      contentHash: atom.contentHash,
      metaHash: atom.metaHash,
      viewHash: atom.viewHash,
    }))
    .digest('hex');
}

function verifyPolicy(atom: EvidenceAtomProof, signingKey: string, reasons: string[]): void {
  if (!atom.policyTokens?.length) return;
  for (const token of atom.policyTokens) {
    const payload = stableHash({
      decisionId: token.decisionId,
      subjectHash: token.subjectHash,
      purpose: token.purpose,
      action: token.action,
      objectClass: token.objectClass,
      constraints: token.constraints,
      decision: token.decision,
      issuedAt: token.issuedAt,
      expiresAt: token.expiresAt,
    });
    const expected = createHmac('sha256', signingKey).update(payload).digest('hex');
    if (expected !== token.decisionSig) {
      reasons.push(`Policy token ${token.decisionId} failed signature validation`);
    }
  }
}

export function verifyEvidenceBundle(
  bundle: EvidenceBundle,
  options: EvidenceVerificationOptions = {},
): EvidenceVerificationResult {
  const reasons: string[] = [];
  const signingKey = options.signingKey ?? 'prov-ledger-signing-key';
  if (!bundle.headHash) {
    reasons.push('Bundle is missing head hash');
  }
  if (!bundle.snapshotCommitment) {
    reasons.push('Missing snapshot commitment');
  } else {
    const commitment = bundle.snapshotCommitment;
    const expectedSig = createHmac('sha256', signingKey)
      .update(`${commitment.snapshotId}|${commitment.rootHash}`)
      .digest('hex');
    if (expectedSig !== commitment.rootSignature) {
      reasons.push('Snapshot commitment signature invalid');
    }
    if (commitment.logChainHead && commitment.logChainHead !== commitment.rootSignature) {
      // logChainHead is optional but if present must at least match something deterministic
      reasons.push('Snapshot commitment log chain head mismatch');
    }
  }

  const seen = new Set<string>();
  bundle.entries.forEach((entry) => {
    if (seen.has(entry.hash)) {
      reasons.push(`Duplicate entry hash detected: ${entry.hash}`);
    }
    seen.add(entry.hash);
  });

  const atoms = bundle.atoms ?? [];
  atoms.forEach((atom) => {
    const leaf = atom.leafHash ?? deriveLeaf(atom);
    if (!bundle.snapshotCommitment?.rootHash) {
      reasons.push(`Missing root hash for atom ${atom.eaId}`);
      return;
    }
    const proof = parseProof(atom.inclusionProof);
    if (proof.length === 0) {
      reasons.push(`Missing inclusion proof for atom ${atom.eaId}`);
      return;
    }
    if (!verifyMerkleProof(leaf, bundle.snapshotCommitment.rootHash, proof)) {
      reasons.push(`Inclusion proof invalid for atom ${atom.eaId}`);
    }
    verifyPolicy(atom, signingKey, reasons);
  });

  return { valid: reasons.length === 0, reasons };
}
