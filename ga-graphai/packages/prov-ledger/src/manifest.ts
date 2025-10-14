import { createHash } from 'node:crypto';
import type { EvidenceBundle, LedgerEntry } from 'common-types';

export interface ManifestTransformNode {
  id: string;
  category: string;
  actor: string;
  action: string;
  resource: string;
  payloadHash: string;
  timestamp: string;
  previousHash?: string;
}

export interface ExportManifest {
  caseId: string;
  generatedAt: string;
  version: string;
  ledgerHead: string;
  merkleRoot: string;
  transforms: ManifestTransformNode[];
}

function hashPayload(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function buildMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) {
    return '';
  }
  let layer = [...hashes];
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = layer[i + 1] ?? left;
      next.push(createHash('sha256').update(left + right).digest('hex'));
    }
    layer = next;
  }
  return layer[0];
}

function deriveTransforms(entries: readonly LedgerEntry[]): ManifestTransformNode[] {
  return entries.map(entry => ({
    id: entry.id,
    category: entry.category,
    actor: entry.actor,
    action: entry.action,
    resource: entry.resource,
    payloadHash: hashPayload(entry.payload),
    timestamp: entry.timestamp,
    previousHash: entry.previousHash
  }));
}

export interface ManifestOptions {
  caseId: string;
  ledger: readonly LedgerEntry[];
  evidence?: EvidenceBundle;
}

export function createExportManifest(options: ManifestOptions): ExportManifest {
  const transforms = deriveTransforms(options.ledger);
  const hashes = transforms.map(node => createHash('sha256').update(node.id + node.payloadHash).digest('hex'));
  const ledgerHead = options.ledger.at(-1)?.hash ?? '';
  return {
    caseId: options.caseId,
    generatedAt: new Date().toISOString(),
    version: '1.0.0',
    ledgerHead,
    merkleRoot: buildMerkleRoot(hashes),
    transforms
  };
}

export function verifyManifest(manifest: ExportManifest, ledger: readonly LedgerEntry[], evidence?: EvidenceBundle): {
  valid: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const expectedTransforms = deriveTransforms(ledger);
  if (expectedTransforms.length !== manifest.transforms.length) {
    reasons.push('Transform count mismatch');
  }
  expectedTransforms.forEach((transform, index) => {
    const candidate = manifest.transforms[index];
    if (!candidate) {
      return;
    }
    if (candidate.payloadHash !== transform.payloadHash) {
      reasons.push(`Payload hash mismatch for transform ${transform.id}`);
    }
    if (candidate.previousHash !== transform.previousHash) {
      reasons.push(`Previous hash mismatch for transform ${transform.id}`);
    }
  });
  const expectedHashes = expectedTransforms.map(node => createHash('sha256').update(node.id + node.payloadHash).digest('hex'));
  const expectedRoot = buildMerkleRoot(expectedHashes);
  if (expectedRoot !== manifest.merkleRoot) {
    reasons.push('Merkle root mismatch');
  }
  const ledgerHead = ledger.at(-1)?.hash ?? '';
  if (ledgerHead !== manifest.ledgerHead) {
    reasons.push('Ledger head hash mismatch');
  }
  if (evidence && evidence.headHash !== manifest.ledgerHead) {
    reasons.push('Evidence bundle head hash mismatch');
  }
  return { valid: reasons.length === 0, reasons };
}
