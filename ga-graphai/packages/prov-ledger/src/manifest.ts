import { createHmac, createHash } from 'node:crypto';
import type { EvidenceBundle, LedgerEntry } from 'common-types';
import { stableHash } from '@ga-graphai/data-integrity';

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
  snapshotId: string;
  rootSignature: string;
  issuer: string;
  transparencyHead: string;
  transforms: ManifestTransformNode[];
}

function hashPayload(payload: unknown): string {
  return stableHash(payload);
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
      next.push(
        createHash('sha256')
          .update(left + right)
          .digest('hex'),
      );
    }
    layer = next;
  }
  return layer[0];
}

function deriveTransforms(
  entries: readonly LedgerEntry[],
): ManifestTransformNode[] {
  return entries.map((entry) => ({
    id: entry.id,
    category: entry.category,
    actor: entry.actor,
    action: entry.action,
    resource: entry.resource,
    payloadHash: hashPayload(entry.payload),
    timestamp: entry.timestamp,
    previousHash: entry.previousHash,
  }));
}

export interface ManifestOptions {
  caseId: string;
  ledger: readonly LedgerEntry[];
  evidence?: EvidenceBundle;
  issuer?: string;
  signingKey?: string;
}

export function createExportManifest(options: ManifestOptions): ExportManifest {
  const transforms = deriveTransforms(options.ledger);
  const hashes = transforms.map((node) =>
    createHash('sha256')
      .update(node.id + node.payloadHash)
      .digest('hex'),
  );
  const ledgerHead = options.ledger.at(-1)?.hash ?? '';
  const issuer = options.issuer ?? 'prov-ledger';
  const signingKey = options.signingKey ?? manifest.issuer ?? 'prov-ledger-signing-key';
  const snapshotId = createHash('sha256')
    .update(`${options.caseId}|${ledgerHead}|${hashes.join('|')}`)
    .digest('hex');
  const rootSignature = createHmac('sha256', signingKey)
    .update(`${snapshotId}|${ledgerHead}`)
    .digest('hex');
  const transparencyHead = appendTransparencyLog({
    snapshotId,
    rootSignature,
    issuer,
    ledgerHead,
    merkleRoot: buildMerkleRoot(hashes),
  });

  return {
    caseId: options.caseId,
    generatedAt: new Date().toISOString(),
    version: '1.0.0',
    ledgerHead,
    merkleRoot: buildMerkleRoot(hashes),
    snapshotId,
    rootSignature,
    issuer,
    transparencyHead,
    transforms,
  };
}

export function verifyManifest(
  manifest: ExportManifest,
  ledger: readonly LedgerEntry[],
  evidence?: EvidenceBundle,
  options: { signingKey?: string; issuer?: string } = {},
): {
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
  const expectedHashes = expectedTransforms.map((node) =>
    createHash('sha256')
      .update(node.id + node.payloadHash)
      .digest('hex'),
  );
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
  const signingKey = options.signingKey ?? 'prov-ledger-signing-key';
  const issuer = options.issuer ?? manifest.issuer;
  const expectedSnapshot = createHash('sha256')
    .update(`${manifest.caseId}|${ledgerHead}|${expectedHashes.join('|')}`)
    .digest('hex');
  if (manifest.snapshotId !== expectedSnapshot) {
    reasons.push('Snapshot id mismatch');
  }
  const expectedSig = createHmac('sha256', signingKey)
    .update(`${manifest.snapshotId}|${manifest.ledgerHead}`)
    .digest('hex');
  if (manifest.rootSignature !== expectedSig) {
    reasons.push('Root signature mismatch');
  }
  if (manifest.issuer !== issuer) {
    reasons.push('Unexpected issuer');
  }
  const expectedHead = findTransparencyHead(manifest.snapshotId, manifest.rootSignature);
  if (!expectedHead) {
    reasons.push('Transparency log entry missing');
  } else if (expectedHead !== manifest.transparencyHead) {
    reasons.push('Transparency head mismatch');
  }
  return { valid: reasons.length === 0, reasons };
}

interface TransparencyLogEntry {
  snapshotId: string;
  rootSignature: string;
  issuer: string;
  ledgerHead: string;
  merkleRoot: string;
}

const transparencyLog: string[] = [];
const transparencyEntries: TransparencyLogEntry[] = [];

export function appendTransparencyLog(entry: TransparencyLogEntry): string {
  const previous = transparencyLog.at(-1) ?? '';
  const chainHead = createHash('sha256')
    .update(`${previous}|${entry.snapshotId}|${entry.rootSignature}`)
    .digest('hex');
  transparencyLog.push(chainHead);
  transparencyEntries.push(entry);
  return chainHead;
}

export function findTransparencyHead(snapshotId: string, signature: string): string | undefined {
  const index = transparencyEntries.findIndex(
    (candidate) => candidate.snapshotId === snapshotId && candidate.rootSignature === signature,
  );
  if (index === -1) return undefined;
  return transparencyLog[index];
}

export function resetTransparencyLog(): void {
  transparencyLog.length = 0;
  transparencyEntries.length = 0;
}
