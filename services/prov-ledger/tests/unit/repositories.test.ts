import { randomUUID } from 'crypto';
import type { DatabasePool } from '../../src/db/pool';
import { runMigrations } from '../../src/db/migrator';
import { createInMemoryPool } from '../../src/testing/in-memory-db';
import type { JsonLdEnvelope, EvidenceInput, ClaimInput, TransformStep } from '../../src/domain/types';
import { createEvidence, getEvidenceByBundle, getEvidenceByIds } from '../../src/repositories/evidence';
import {
  createClaim,
  getClaim,
  getClaimsByBundle,
  getClaimChain
} from '../../src/repositories/claims';
import { computeEvidenceHash, computeClaimHash } from '../../src/domain/manifest';

function buildEvidenceEnvelope(bundleId?: string): JsonLdEnvelope<EvidenceInput> {
  return {
    '@context': { '@vocab': 'https://example.org' },
    payload: {
      bundleId,
      source: { url: 'https://example.org/data' },
      checksum: { algorithm: 'sha256', value: randomUUID().replace(/-/g, '') },
      license: 'Apache-2.0',
      metadata: { tags: ['a', 'b'] },
      sourceSignature: { type: 'rsa', value: 'signature' }
    }
  };
}

function buildTransform(name: string, extra?: Partial<TransformStep>): TransformStep {
  return {
    name,
    description: 'step',
    inputs: ['input-a', 'input-b'],
    parameters: { mode: 'strict' },
    ...extra
  };
}

describe('repository integration', () => {
  let pool: DatabasePool;

  beforeEach(async () => {
    pool = createInMemoryPool();
    await runMigrations(pool);
  });

  afterEach(async () => {
    await pool.end();
  });

  it('persists evidence records and retrieves them deterministically', async () => {
    const envelope = buildEvidenceEnvelope();
    const record = await createEvidence(pool, envelope);

    expect(record.bundleId).toBeDefined();
    expect(record.canonicalHash).toBe(computeEvidenceHash(envelope.payload));

    const byBundle = await getEvidenceByBundle(pool, record.bundleId);
    expect(byBundle).toHaveLength(1);
    expect(byBundle[0].id).toBe(record.id);
    expect(byBundle[0].metadata).toEqual(envelope.payload.metadata);

    const byIds = await getEvidenceByIds(pool, [record.id, record.id]);
    expect(byIds).toHaveLength(1);
    expect(byIds[0].canonicalHash).toBe(record.canonicalHash);

    const empty = await getEvidenceByIds(pool, []);
    expect(empty).toEqual([]);
  });

  it('creates claims with transforms and links evidence', async () => {
    const bundleId = randomUUID();
    const evidenceOne = await createEvidence(pool, buildEvidenceEnvelope(bundleId));
    const evidenceTwo = await createEvidence(pool, buildEvidenceEnvelope(bundleId));

    const claimEnvelope: JsonLdEnvelope<ClaimInput> = {
      '@context': 'https://example.org/context',
      payload: {
        bundleId,
        text: 'Claim text',
        evidenceIds: [evidenceOne.id, evidenceOne.id, evidenceTwo.id],
        confidence: 0.9,
        license: 'CC-BY-4.0',
        transforms: [buildTransform('parse'), buildTransform('aggregate', { inputs: ['x'] })],
        metadata: { rating: 'high' }
      }
    };

    const created = await createClaim(pool, claimEnvelope);
    expect(created.canonicalHash).toBe(computeClaimHash(claimEnvelope.payload));
    expect(created.evidenceIds).toEqual(claimEnvelope.payload.evidenceIds);

    const fetched = await getClaim(pool, created.id);
    expect(fetched).not.toBeNull();
    const fetchedIds = [...(fetched?.evidenceIds ?? [])].sort();
    const expectedIds = [evidenceOne.id, evidenceTwo.id].sort();
    expect(fetchedIds).toEqual(expectedIds);
    expect(fetched?.transforms).toHaveLength(2);

    const claims = await getClaimsByBundle(pool, bundleId);
    expect(claims).toHaveLength(1);
    expect(claims[0].id).toBe(created.id);

    const chain = await getClaimChain(pool, created.id);
    expect(chain?.claim.id).toBe(created.id);
    expect(chain?.evidence.map(ev => ev.id)).toEqual(expect.arrayContaining([evidenceOne.id, evidenceTwo.id]));
  });

  it('rejects claims referencing missing or cross-bundle evidence', async () => {
    const bundleId = randomUUID();
    const otherBundle = randomUUID();
    const evidence = await createEvidence(pool, buildEvidenceEnvelope(bundleId));
    await createEvidence(pool, buildEvidenceEnvelope(otherBundle));

    const missingEvidenceClaim: JsonLdEnvelope<ClaimInput> = {
      '@context': 'ctx',
      payload: {
        bundleId,
        text: 'Missing evidence',
        evidenceIds: [randomUUID()],
        confidence: 0.5,
        license: 'MIT',
        transforms: [buildTransform('noop')]
      }
    };

    await expect(createClaim(pool, missingEvidenceClaim)).rejects.toThrow('One or more evidence references were not found');

    const crossBundleClaim: JsonLdEnvelope<ClaimInput> = {
      '@context': 'ctx',
      payload: {
        bundleId,
        text: 'Cross bundle',
        evidenceIds: [evidence.id, randomUUID()],
        confidence: 0.8,
        license: 'MIT',
        transforms: [buildTransform('noop')]
      }
    };

    const extraEvidence = await createEvidence(pool, buildEvidenceEnvelope(otherBundle));

    crossBundleClaim.payload.evidenceIds[1] = extraEvidence.id;

    await expect(createClaim(pool, crossBundleClaim)).rejects.toThrow(`Evidence ${extraEvidence.id} does not belong to bundle ${bundleId}`);
  });

  it('returns null when claim does not exist', async () => {
    const missingClaim = await getClaim(pool, randomUUID());
    expect(missingClaim).toBeNull();
  });

  it('returns null claim chain when claim lookup fails', async () => {
    const chain = await getClaimChain(pool, randomUUID());
    expect(chain).toBeNull();
  });

  it('filters out claims that cannot be loaded individually', async () => {
    const claimRow = {
      id: 'missing-claim',
      bundle_id: 'bundle',
      claim_text: 'text',
      confidence: 0.1,
      license: 'MIT',
      metadata: null,
      context: null,
      canonical_hash: 'hash',
      created_at: new Date().toISOString()
    };
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM claims WHERE bundle_id')) {
        return { rows: [claimRow], rowCount: 1 };
      }
      if (sql.includes('FROM claims WHERE id')) {
        return { rows: [], rowCount: 0 };
      }
      return { rows: [], rowCount: 0 };
    }) as jest.Mock;
    const stubPool = { query } as unknown as DatabasePool;

    const results = await getClaimsByBundle(stubPool, 'bundle');

    expect(results).toEqual([]);
    expect(query).toHaveBeenCalled();
  });
});
