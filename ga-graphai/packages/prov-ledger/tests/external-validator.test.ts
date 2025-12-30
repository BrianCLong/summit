import { createHash, createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { EvidenceBundle, LedgerEntry } from 'common-types';
import { createExportManifest, resetTransparencyLog } from '../src/manifest.js';
import {
  ProvenanceBundleValidator,
  hashBundle,
  type ExternalValidationPayload,
  type ThirdPartyValidator,
} from '../src/externalValidator.js';
import { buildMerkleTree, mapEntriesToAtoms } from '../src/proofs.js';
import { verifyEvidenceBundle } from '../src/evidenceVerifier.js';

function computeHash(
  entry: Omit<LedgerEntry, 'hash'> & { previousHash?: string },
): string {
  const hash = createHash('sha256');
  hash.update(entry.id);
  hash.update(entry.category);
  hash.update(entry.actor);
  hash.update(entry.action);
  hash.update(entry.resource);
  hash.update(JSON.stringify(entry.payload));
  hash.update(entry.timestamp);
  if (entry.previousHash) {
    hash.update(entry.previousHash);
  }
  return hash.digest('hex');
}

function buildLedgerEntries(): LedgerEntry[] {
  const timestamp = new Date('2024-06-01T00:00:00Z').toISOString();
  const ingest: LedgerEntry = {
    id: 'evt-1',
    category: 'ingest',
    actor: 'collector',
    action: 'register',
    resource: 'rss-feed',
    payload: { url: 'https://example.com/feed', checksum: 'abc123' },
    timestamp,
    hash: '',
    previousHash: undefined,
  };
  ingest.hash = computeHash(ingest);
  const analysis: LedgerEntry = {
    id: 'evt-2',
    category: 'analysis',
    actor: 'nlp-service',
    action: 'extract',
    resource: 'entity',
    payload: { entityId: 'person-1', confidence: 0.92 },
    timestamp,
    hash: '',
    previousHash: ingest.hash,
  };
  analysis.hash = computeHash(analysis);
  return [ingest, analysis];
}

const fixedNow = () => new Date('2024-06-01T12:00:00Z');

function buildBundle(entries: LedgerEntry[], signingKey = 'prov-ledger-signing-key'): EvidenceBundle {
  const { root, proofs } = buildMerkleTree(entries);
  const atoms = mapEntriesToAtoms(entries, proofs);
  const snapshotCommitment = {
    snapshotId: createHash('sha256').update(`${entries.at(-1)?.hash}|${root}`).digest('hex'),
    rootHash: root,
    rootSignature: createHmac('sha256', signingKey)
      .update(`${createHash('sha256').update(`${entries.at(-1)?.hash}|${root}`).digest('hex')}|${root}`)
      .digest('hex'),
    issuer: 'test-ledger',
    issuedAt: fixedNow().toISOString(),
    logChainHead: createHmac('sha256', signingKey)
      .update(`${createHash('sha256').update(`${entries.at(-1)?.hash}|${root}`).digest('hex')}|${root}`)
      .digest('hex'),
  };
  return {
    generatedAt: fixedNow().toISOString(),
    headHash: entries.at(-1)?.hash,
    entries,
    atoms: atoms.map((atom) => ({
      ...atom,
      inclusionProof: atom.inclusionProof?.map((node) => node.replace('right', 'right')),
    })),
    snapshotCommitment,
    traceDigest: createHash('sha256').update(root).digest('hex'),
  };
}

describe('ProvenanceBundleValidator', () => {
  it('submits provenance bundles for third-party verification with custody tracking', async () => {
    resetTransparencyLog();
    const entries = buildLedgerEntries();
    const bundle = buildBundle(entries, 'TrustCheck');
    const manifest = createExportManifest({ caseId: 'case-77', ledger: entries, signingKey: 'TrustCheck', issuer: 'TrustCheck' });

    const captured: ExternalValidationPayload[] = [];
    const validator: ThirdPartyValidator = {
      name: 'TrustCheck',
      async verify(payload) {
        captured.push(payload);
        return {
          validator: 'TrustCheck',
          status: 'verified',
          correlationId: 'ver-001',
          checkedAt: fixedNow().toISOString(),
          notes: 'signature matched',
        };
      },
    };

    const bundleValidator = new ProvenanceBundleValidator(validator, {
      complianceFramework: 'NIST 800-53',
      attestor: 'trust-office',
      custodyLocation: 'us-east-1',
      now: fixedNow,
    });

    const report = await bundleValidator.validate(bundle, manifest);

    expect(report.manifestVerification.valid).toBe(true);
    expect(report.thirdParty.status).toBe('verified');
    expect(report.thirdParty.validator).toBe('TrustCheck');
    expect(report.compliance.status).toBe('compliant');
    expect(report.compliance.framework).toBe('NIST 800-53');
    expect(report.compliance.attestedBy).toBe('trust-office');
    expect(report.compliance.evidenceRef).toBe(hashBundle(bundle));
    expect(report.custodyTrail.map((event) => event.stage)).toEqual([
      'received',
      'submitted',
      'verified',
      'attested',
    ]);
    expect(report.custodyTrail[1].location).toBe('us-east-1');
    expect(captured[0].bundleHash).toBe(hashBundle(bundle));
    expect(captured[0].manifest.merkleRoot).toBe(manifest.merkleRoot);
  });

  it('flags compliance when manifest verification fails', async () => {
    resetTransparencyLog();
    const entries = buildLedgerEntries();
    const bundle = buildBundle(entries);
    const manifest = createExportManifest({ caseId: 'case-21', ledger: entries });
    manifest.merkleRoot = 'tampered-root';

    const validator: ThirdPartyValidator = {
      name: 'AttestCorp',
      async verify() {
        return {
          validator: 'AttestCorp',
          status: 'verified',
          correlationId: 'ver-404',
          checkedAt: fixedNow().toISOString(),
        };
      },
    };

    const bundleValidator = new ProvenanceBundleValidator(validator, { now: fixedNow });

    const report = await bundleValidator.validate(bundle, manifest);

    expect(report.manifestVerification.valid).toBe(false);
    expect(report.compliance.status).toBe('non-compliant');
    expect(report.custodyTrail.at(-1)?.stage).toBe('attested');
  });

  it('detects tampering in evidence bundle hashing and ordering', () => {
    const entries = buildLedgerEntries();
    const bundle = buildBundle(entries);
    const baseline = hashBundle(bundle);
    const reordered = buildBundle([...entries].reverse());
    expect(() => hashBundle({ ...bundle, headHash: undefined })).toThrow(/headhash/i);
    expect(() => hashBundle({ ...bundle, entries: [...entries, entries[0]] })).toThrow(/duplicate/i);
    expect(hashBundle(reordered)).not.toBe(baseline);
  });

  it('verifies inclusion proofs and policy tokens', () => {
    const entries = buildLedgerEntries();
    const bundle = buildBundle(entries, 'trust-check');
    const verification = verifyEvidenceBundle(bundle, { signingKey: 'trust-check' });
    expect(verification.valid).toBe(false);
    const fixedSignature = createHash('sha256')
      .update(`${bundle.snapshotCommitment?.snapshotId}|${bundle.snapshotCommitment?.rootHash}`)
      .digest('hex');
    const fixedBundle: EvidenceBundle = {
      ...bundle,
      snapshotCommitment: { ...bundle.snapshotCommitment!, rootSignature: fixedSignature },
    };
    const success = verifyEvidenceBundle(fixedBundle, { signingKey: 'trust-check' });
    expect(success.valid).toBe(true);
  });
});
