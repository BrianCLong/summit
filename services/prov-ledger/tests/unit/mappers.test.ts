import { toClaimEnvelope, toEvidenceEnvelope, toManifestEnvelope } from '../../src/domain/mappers';
import { PROV_CONTEXT, type ClaimRecord, type EvidenceRecord, type ManifestDocument } from '../../src/domain/types';

describe('domain mappers', () => {
  it('wraps evidence records with provenance context', () => {
    const evidence: EvidenceRecord = {
      id: 'evidence-1',
      bundleId: 'bundle',
      createdAt: '2024-01-01T00:00:00.000Z',
      canonicalHash: 'hash',
      source: { url: 'https://example.org' },
      checksum: { algorithm: 'sha256', value: 'abc' },
      license: 'MIT'
    };

    const envelope = toEvidenceEnvelope(evidence);
    expect(envelope['@context']).toBe(PROV_CONTEXT);
    expect(envelope.payload).toBe(evidence);
  });

  it('wraps claim records with provenance context', () => {
    const claim: ClaimRecord = {
      id: 'claim-1',
      bundleId: 'bundle',
      text: 'Claim text',
      evidenceIds: ['evidence-1'],
      confidence: 0.9,
      license: 'Apache-2.0',
      transforms: [],
      createdAt: '2024-01-01T00:00:00.000Z',
      canonicalHash: 'claim-hash'
    };

    const envelope = toClaimEnvelope(claim);
    expect(envelope['@context']).toBe(PROV_CONTEXT);
    expect(envelope.payload).toBe(claim);
  });

  it('defaults manifest context when missing', () => {
    const manifest: ManifestDocument = {
      '@context': '',
      bundleId: 'bundle',
      merkleRoot: 'root',
      generatedAt: '2024-01-01T00:00:00.000Z',
      files: [],
      claims: []
    };

    const envelope = toManifestEnvelope({ ...manifest, '@context': undefined as unknown as string });
    expect(envelope['@context']).toBe(PROV_CONTEXT);
  });

  it('preserves existing manifest context', () => {
    const manifest: ManifestDocument = {
      '@context': 'https://example.org/context',
      bundleId: 'bundle',
      merkleRoot: 'root',
      generatedAt: '2024-01-01T00:00:00.000Z',
      files: [],
      claims: []
    };

    const envelope = toManifestEnvelope(manifest);
    expect(envelope['@context']).toBe('https://example.org/context');
  });
});
