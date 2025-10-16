import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import type { LedgerEntry } from 'common-types';
import { createExportManifest, verifyManifest } from '../src/manifest.js';

function buildLedgerEntries(): LedgerEntry[] {
  const timestamp = new Date('2024-01-01T00:00:00Z').toISOString();
  const first: LedgerEntry = {
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
  first.hash = createHash('sha256')
    .update(first.id + JSON.stringify(first.payload))
    .digest('hex');
  const second: LedgerEntry = {
    id: 'evt-2',
    category: 'analysis',
    actor: 'nlp-service',
    action: 'extract',
    resource: 'entity',
    payload: { entityId: 'person-1', confidence: 0.92 },
    timestamp,
    hash: '',
    previousHash: first.hash,
  };
  second.hash = createHash('sha256')
    .update(second.id + JSON.stringify(second.payload) + second.previousHash)
    .digest('hex');
  return [first, second];
}

describe('export manifest', () => {
  it('creates a manifest with deterministic merkle root', () => {
    const entries = buildLedgerEntries();
    const manifest = createExportManifest({
      caseId: 'case-42',
      ledger: entries,
    });
    expect(manifest.caseId).toBe('case-42');
    expect(manifest.merkleRoot).toHaveLength(64);
    const verification = verifyManifest(manifest, entries, {
      generatedAt: new Date().toISOString(),
      headHash: entries.at(-1)?.hash,
      entries,
    });
    expect(verification.valid).toBe(true);
    expect(verification.reasons).toHaveLength(0);
  });

  it('detects tampering when payload changes', () => {
    const entries = buildLedgerEntries().slice(0, 1);
    const manifest = createExportManifest({
      caseId: 'case-99',
      ledger: entries,
    });
    manifest.transforms[0].payloadHash = 'tampered';
    const verification = verifyManifest(manifest, entries);
    expect(verification.valid).toBe(false);
    expect(verification.reasons).toContain(
      'Payload hash mismatch for transform evt-1',
    );
  });
});
