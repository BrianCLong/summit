import { canonicalString } from './canonicalize.js';
import { hashJson } from './hash.js';
import {
  LedgerEntry,
  LedgerFile,
  LedgerVerificationResult,
  verifyLedger,
} from './ledger.js';
import { signPayload, verifyPayload } from './signing.js';

export interface ManifestEvidence {
  evidenceId: string;
  stage: string;
  artifactHash: string;
  ledgerSequence: number;
  artifactUri?: string;
  transformChain?: string[];
  annotations?: Record<string, unknown>;
}

export interface ManifestClaim {
  claimId: string;
  entityId: string;
  type: string;
  disposition: string;
  summary: string;
  createdAt: string;
  confidence: string;
  evidence: ManifestEvidence[];
}

export interface ManifestArtifact {
  path: string;
  hash: string;
  ledgerSequence?: number;
  mimeType?: string;
  bytes?: number;
  sourceStage?: string;
}

export interface ManifestLedgerEntryRef {
  sequence: number;
  hash: string;
}

export interface ManifestLedger {
  uri: string;
  rootHash: string;
  entries: ManifestLedgerEntryRef[];
}

export interface ManifestSignature {
  algorithm: 'ed25519';
  keyId: string;
  value: string;
}

export interface ManifestIntegrity {
  manifestHash: string;
  signature?: ManifestSignature;
}

export interface ManifestBundle {
  id: string;
  generatedAt: string;
  sourceSystem: string;
  environment: string;
  exportType: string;
  itemCount: number;
  filters?: Record<string, unknown>;
}

export interface ExportManifest {
  version: string;
  bundle: ManifestBundle;
  claims: ManifestClaim[];
  artifacts: ManifestArtifact[];
  ledger: ManifestLedger;
  integrity: ManifestIntegrity;
}

export interface ManifestVerificationOptions {
  manifestPublicKey?: string | Buffer;
}

export interface ManifestVerificationResult {
  valid: boolean;
  errors: string[];
  ledger: LedgerVerificationResult;
}

function manifestPayload(manifest: ExportManifest): Omit<ExportManifest, 'integrity'> {
  const { integrity: _integrity, ...rest } = manifest;
  return rest;
}

export function calculateManifestHash(manifest: ExportManifest): string {
  return hashJson(manifestPayload(manifest));
}

export function signManifest(
  manifest: ExportManifest,
  privateKeyPem: string | Buffer,
  keyId: string,
): ManifestIntegrity {
  const payload = manifestPayload(manifest);
  const canonical = canonicalString(payload);
  const manifestHash = hashJson(payload);
  const signature = signPayload(canonical, privateKeyPem);
  manifest.integrity = {
    manifestHash,
    signature: {
      algorithm: 'ed25519',
      keyId,
      value: signature,
    },
  };
  return manifest.integrity;
}

function buildLedgerMap(ledger: LedgerFile): Map<number, LedgerEntry> {
  const map = new Map<number, LedgerEntry>();
  for (const entry of ledger.entries) {
    map.set(entry.sequence, entry);
  }
  return map;
}

function validateManifestLedger(manifest: ExportManifest, ledger: LedgerFile): string[] {
  const errors: string[] = [];
  const ledgerMap = buildLedgerMap(ledger);

  for (const ref of manifest.ledger.entries) {
    const entry = ledgerMap.get(ref.sequence);
    if (!entry) {
      errors.push(`manifest references missing ledger sequence ${ref.sequence}`);
      continue;
    }
    if (entry.hash !== ref.hash) {
      errors.push(
        `ledger hash mismatch for sequence ${ref.sequence}: manifest=${ref.hash} ledger=${entry.hash}`,
      );
    }
  }

  for (const claim of manifest.claims) {
    for (const evidence of claim.evidence) {
      const entry = ledgerMap.get(evidence.ledgerSequence);
      if (!entry) {
        errors.push(
          `claim ${claim.claimId} evidence ${evidence.evidenceId} missing ledger sequence ${evidence.ledgerSequence}`,
        );
        continue;
      }

      if (entry.claimId !== claim.claimId) {
        errors.push(
          `claim ${claim.claimId} evidence ${evidence.evidenceId} ledger claim mismatch ${entry.claimId}`,
        );
      }

      if (entry.entityId !== claim.entityId) {
        errors.push(
          `claim ${claim.claimId} evidence ${evidence.evidenceId} ledger entity mismatch ${entry.entityId}`,
        );
      }

      if (entry.stage !== evidence.stage) {
        errors.push(
          `claim ${claim.claimId} evidence ${evidence.evidenceId} stage mismatch manifest=${evidence.stage} ledger=${entry.stage}`,
        );
      }

      if (entry.contentHash !== evidence.artifactHash) {
        errors.push(
          `claim ${claim.claimId} evidence ${evidence.evidenceId} content hash mismatch manifest=${evidence.artifactHash} ledger=${entry.contentHash}`,
        );
      }

      if (evidence.artifactUri && entry.artifactUri && entry.artifactUri !== evidence.artifactUri) {
        errors.push(
          `claim ${claim.claimId} evidence ${evidence.evidenceId} artifactUri mismatch manifest=${evidence.artifactUri} ledger=${entry.artifactUri}`,
        );
      }
    }
  }

  const itemCount = manifest.bundle.itemCount;
  if (itemCount !== manifest.claims.length) {
    errors.push(`bundle itemCount ${itemCount} does not match number of claims ${manifest.claims.length}`);
  }

  return errors;
}

export function verifyManifest(
  manifest: ExportManifest,
  ledger: LedgerFile,
  options: ManifestVerificationOptions = {},
): ManifestVerificationResult {
  const errors: string[] = [];
  const ledgerVerification = verifyLedger(ledger);
  if (!ledgerVerification.valid) {
    errors.push(...ledgerVerification.errors);
  }

  errors.push(...validateManifestLedger(manifest, ledger));

  if (manifest.ledger.rootHash !== ledgerVerification.rootHash) {
    errors.push(
      `manifest rootHash ${manifest.ledger.rootHash} does not match ledger root ${ledgerVerification.rootHash}`,
    );
  }

  const payload = manifestPayload(manifest);
  const canonical = canonicalString(payload);
  const computedHash = hashJson(payload);

  if (manifest.integrity.manifestHash !== computedHash) {
    errors.push(
      `manifest hash mismatch manifest=${manifest.integrity.manifestHash} computed=${computedHash}`,
    );
  }

  const signature = manifest.integrity.signature;
  if (signature) {
    if (signature.algorithm !== 'ed25519') {
      errors.push(`unsupported manifest signature algorithm ${signature.algorithm}`);
    }

    if (!options.manifestPublicKey) {
      errors.push('manifest signature present but no public key provided');
    } else {
      const verified = verifyPayload(canonical, options.manifestPublicKey, signature.value);
      if (!verified) {
        errors.push('manifest signature verification failed');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    ledger: ledgerVerification,
  };
}

export interface EvidenceChainNode {
  sequence: number;
  stage: string;
  actor: string;
  timestamp: string;
  contentHash: string;
  artifactUri?: string;
  metadata?: Record<string, unknown>;
}

export interface EvidenceChain {
  claimId: string;
  entityId: string;
  summary: string;
  evidence: EvidenceChainNode[];
}

export function buildEvidenceChain(
  entityId: string,
  manifest: ExportManifest,
  ledger: LedgerFile,
): EvidenceChain[] {
  const ledgerMap = buildLedgerMap(ledger);
  const chains: EvidenceChain[] = [];

  for (const claim of manifest.claims) {
    if (claim.entityId !== entityId) {
      continue;
    }

    const nodes: EvidenceChainNode[] = claim.evidence
      .map((evidence) => {
        const entry = ledgerMap.get(evidence.ledgerSequence);
        return {
          sequence: evidence.ledgerSequence,
          stage: evidence.stage,
          actor: entry?.actor ?? '',
          timestamp: entry?.timestamp ?? '',
          contentHash: entry?.contentHash ?? evidence.artifactHash,
          artifactUri: entry?.artifactUri ?? evidence.artifactUri,
          metadata: entry?.metadata,
        };
      })
      .sort((a, b) => a.sequence - b.sequence);

    chains.push({
      claimId: claim.claimId,
      entityId: claim.entityId,
      summary: claim.summary,
      evidence: nodes,
    });
  }

  return chains;
}
