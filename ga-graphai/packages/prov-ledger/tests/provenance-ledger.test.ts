import { describe, expect, it } from 'vitest';
import { ProvenanceLedger } from '../src/index';

describe('ProvenanceLedger', () => {
  it('appends entries and maintains a valid hash chain', () => {
    const ledger = new ProvenanceLedger();
    const first = ledger.append({
      id: '1',
      category: 'deployment',
      actor: 'ci-bot',
      action: 'promote',
      resource: 'service-api',
      payload: { version: '1.0.0' }
    });

    const second = ledger.append({
      id: '2',
      category: 'deployment',
      actor: 'ci-bot',
      action: 'promote',
      resource: 'service-api',
      payload: { version: '1.0.1' }
    });

    expect(first.hash).toBeTruthy();
    expect(second.previousHash).toBe(first.hash);
    expect(ledger.verify()).toBe(true);
  });

  it('filters entries by category and limit', () => {
    const ledger = new ProvenanceLedger();
    ledger.append({
      id: '1',
      category: 'policy',
      actor: 'compliance',
      action: 'approve',
      resource: 'llm',
      payload: { policy: 'safe' }
    });
    ledger.append({
      id: '2',
      category: 'deployment',
      actor: 'ci-bot',
      action: 'promote',
      resource: 'service-api',
      payload: { version: '1.0.0' }
    });

    const filtered = ledger.list({ category: 'deployment', limit: 1 });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].category).toBe('deployment');
  });

  it('exports evidence bundles with the latest head hash', () => {
    const ledger = new ProvenanceLedger();
    ledger.append({
      id: '1',
      category: 'evaluation',
      actor: 'eval-service',
      action: 'score',
      resource: 'rag-output',
      payload: { score: 0.95 }
    });

    const bundle = ledger.exportEvidence();
    expect(bundle.entries).toHaveLength(1);
    expect(bundle.headHash).toBe(bundle.entries[0].hash);
  });

  it('builds export manifests with merkle roots and warnings when unsigned', () => {
    const ledger = new ProvenanceLedger();
    ledger.append({
      id: 'proof-1',
      category: 'ingest',
      actor: 'connector:csv',
      action: 'ingest',
      resource: 'file',
      payload: { records: 2 }
    });

    const manifest = ledger.createManifest({
      exportId: 'demo-export',
      artifacts: [
        {
          path: 'evidence/001.csv',
          sha256: 'ad186c862bc7bb198f7966188c3c7cd05eddbd7251ab29c463bb41034daae199',
          bytes: 128,
          role: 'source'
        }
      ],
      transforms: [],
      provenance: { source: 'CSV', fetchedAt: '2025-09-01T00:00:00Z' },
      policy: { redactions: [] }
    });

    expect(manifest.merkleRoot).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.unverifiable).toContain('missing-signatures');

    const verification = ledger.verifyManifest(manifest);
    expect(verification.status).toBe('unverifiable');
    expect(verification.issues).toContain('missing-signatures');
  });

  it('detects tampering when the manifest merkle root is altered', () => {
    const ledger = new ProvenanceLedger();
    const manifest = ledger.createManifest({
      artifacts: [
        {
          path: 'evidence/001.csv',
          sha256: 'ad186c862bc7bb198f7966188c3c7cd05eddbd7251ab29c463bb41034daae199',
          bytes: 128,
          role: 'source'
        }
      ],
      transforms: [
        {
          op: 'clean',
          tool: 'demo',
          inputSha256: 'ad186c862bc7bb198f7966188c3c7cd05eddbd7251ab29c463bb41034daae199',
          outputSha256: 'ad186c862bc7bb198f7966188c3c7cd05eddbd7251ab29c463bb41034daae199'
        }
      ],
      provenance: { source: 'CSV' },
      policy: { redactions: [] },
      signatures: [
        {
          alg: 'ed25519',
          keyId: 'team-key',
          sig: 'placeholder'
        }
      ]
    });

    manifest.merkleRoot = manifest.merkleRoot.replace(/^./, '0');
    const verification = ledger.verifyManifest(manifest);
    expect(verification.status).toBe('tampered');
    expect(verification.issues).toContain('manifest merkleRoot does not match recomputed value');
  });

  it('exports bundles with embedded manifests when provided', () => {
    const ledger = new ProvenanceLedger();
    ledger.append({
      id: '1',
      category: 'ingest',
      actor: 'connector:csv',
      action: 'ingest',
      resource: 'file',
      payload: { records: 2 }
    });

    const bundle = ledger.exportEvidence(undefined, {
      artifacts: [
        {
          path: 'evidence/001.csv',
          sha256: 'ad186c862bc7bb198f7966188c3c7cd05eddbd7251ab29c463bb41034daae199',
          bytes: 128,
          role: 'source'
        }
      ],
      transforms: [],
      provenance: { source: 'CSV' },
      policy: { redactions: [] },
      signatures: []
    });

    expect(bundle.manifest).toBeDefined();
    expect(bundle.warnings).toContain('missing-signatures');
  });
});
