import {
  CacheKeyParts,
  serializeCacheKey,
  parseCacheKey,
  buildManifestPayload,
  buildManifest,
  verifyManifest,
  createPurgeReport,
  reportsAreEquivalent,
} from '../src/pac';

const secret = 'super-secret';

describe('PAC SDK', () => {
  it('serializes and parses cache keys with escaping', () => {
    const key: CacheKeyParts = {
      resourceId: 'res|123',
      tenant: 'tenant\\corp',
      subjectClass: 'user',
      policyHash: 'hash',
      locale: 'en-US',
    };
    const serialized = serializeCacheKey(key);
    expect(serialized).toBe('res\\|123|tenant\\\\corp|user|hash|en-US');
    const roundTrip = parseCacheKey(serialized);
    expect(roundTrip).toEqual(key);
  });

  it('creates and verifies signed manifests', () => {
    const key: CacheKeyParts = {
      resourceId: 'doc-1',
      tenant: 'tenant-a',
      subjectClass: 'user',
      policyHash: 'policy-hash',
      locale: 'en-US',
    };
    const createdAt = new Date('2025-01-01T00:00:00.000Z');
    const expiresAt = new Date('2025-01-01T01:00:00.000Z');
    const payload = buildManifestPayload(key, {
      jurisdiction: 'us-ca',
      createdAt,
      expiresAt,
      ttlSeconds: 3600,
      valueChecksum: 'AAAA',
      manifestExtra: { scope: 'policy-aware' },
    });
    const manifest = buildManifest(payload, secret);
    expect(manifest.signature).toBeDefined();
    expect(verifyManifest(manifest, secret)).toBe(true);
  });

  it('produces consistent dry-run purge reports', () => {
    const manifests = [
      buildManifest(
        buildManifestPayload(
          {
            resourceId: 'doc-1',
            tenant: 'tenant',
            subjectClass: 'user',
            policyHash: 'p1',
            locale: 'en',
          },
          {
            jurisdiction: 'us',
            createdAt: new Date('2025-01-01T00:00:00Z'),
            expiresAt: new Date('2025-01-01T01:00:00Z'),
            ttlSeconds: 3600,
            valueChecksum: 'AAAA',
          },
        ),
        secret,
      ),
      buildManifest(
        buildManifestPayload(
          {
            resourceId: 'doc-2',
            tenant: 'tenant',
            subjectClass: 'user',
            policyHash: 'p1',
            locale: 'en',
          },
          {
            jurisdiction: 'us',
            createdAt: new Date('2025-01-01T00:05:00Z'),
            expiresAt: new Date('2025-01-01T01:05:00Z'),
            ttlSeconds: 3600,
            valueChecksum: 'BBBB',
          },
        ),
        secret,
      ),
      buildManifest(
        buildManifestPayload(
          {
            resourceId: 'doc-3',
            tenant: 'tenant',
            subjectClass: 'service',
            policyHash: 'p2',
            locale: 'en',
          },
          {
            jurisdiction: 'eu',
            createdAt: new Date('2025-01-01T00:10:00Z'),
            expiresAt: new Date('2025-01-01T01:10:00Z'),
            ttlSeconds: 3600,
            valueChecksum: 'CCCC',
          },
        ),
        secret,
      ),
    ];

    const criteria = { policyHashes: ['p1'], jurisdictions: ['us'] };
    const dryRun = createPurgeReport(manifests, criteria, true);
    const live = createPurgeReport(manifests, criteria, false);

    expect(reportsAreEquivalent(dryRun, live)).toBe(true);
    expect(dryRun.count).toBe(2);
  });
});

