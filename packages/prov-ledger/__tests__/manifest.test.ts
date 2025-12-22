import { createManifest, verifyManifest } from '../src/manifest';
import { hashObject } from '../src/hash';
import { Evidence, Claim } from '../src/types';

describe('manifest', () => {
  it('should create and verify a golden bundle', () => {
    const sourceMetadata = { content: 'hello world' };
    const evidence: Evidence[] = [
      {
        evidenceId: 'evidence-1',
        hash: hashObject(sourceMetadata),
        sourceMetadata,
        licenseTag: 'cc-by-sa-4.0',
        transforms: [],
        recordedAt: '2024-01-01T00:00:00Z',
      },
    ];

    const claims: Claim[] = [
      {
        claimId: 'claim-1',
        evidenceIds: ['evidence-1'],
        confidence: 0.95,
        statement: 'The content is "hello world"',
        observedAt: '2024-01-01T00:00:00Z',
        recordedAt: '2024-01-01T00:00:00Z',
      },
    ];

    const manifest = createManifest('bundle-1', evidence, claims);
    expect(verifyManifest(manifest)).toBe(true);
  });
});
