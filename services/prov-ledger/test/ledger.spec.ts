import { createServer } from '../src/index.js';
import { LedgerService } from '../src/services/LedgerService.js';
import { calculateHash } from '../src/utils/hash.js';

describe('prov-ledger service', () => {
  process.env.NODE_ENV = 'test';
  const server = createServer();
  const ledger = LedgerService.getInstance();

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    await ledger.resetAll();
  });

  it('rejects requests without policy headers', async () => {
    const response = await server.inject({ method: 'POST', url: '/claims', payload: {} });
    expect(response.statusCode).toBe(403);
  });

  it('creates claim and evidence then emits manifest', async () => {
    const claimPayload = {
      sourceUri: 'file://report.pdf',
      hash: 'sha256:' + calculateHash('report'),
      type: 'assertion',
      confidence: 0.9,
      licenseId: 'lic-1',
    };

    const claimRes = await server.inject({
      method: 'POST',
      url: '/claims',
      headers: {
        'x-authority-id': 'test',
        'x-reason-for-access': 'unit-test',
      },
      payload: claimPayload,
    });

    expect(claimRes.statusCode).toBe(201);
    const claim = claimRes.json();

    const evidenceRes = await server.inject({
      method: 'POST',
      url: '/evidence',
      headers: {
        'x-authority-id': 'test',
        'x-reason-for-access': 'unit-test',
      },
      payload: {
        claimId: claim.id,
        artifactDigest: 'sha256:' + calculateHash('artifact'),
        transformChain: [
          { transformType: 'ocr', actorId: 'svc', timestamp: new Date().toISOString() },
        ],
      },
    });

    expect(evidenceRes.statusCode).toBe(201);

    const manifestRes = await server.inject({
      method: 'GET',
      url: `/manifest/${claim.id}`,
      headers: {
        'x-authority-id': 'test',
        'x-reason-for-access': 'unit-test',
      },
    });

    expect(manifestRes.statusCode).toBe(200);
    const manifest = manifestRes.json();
    expect(manifest.bundleId).toBe(claim.id);
    expect(manifest.merkleRoot).toBeTruthy();
    expect(manifest.leaves.length).toBeGreaterThanOrEqual(2);
  });

  it('verifies hashes deterministically', async () => {
    const content = { a: 1, b: 2 };
    const expectedHash = calculateHash(content);
    const res = await server.inject({
      method: 'POST',
      url: '/hash/verify',
      headers: {
        'x-authority-id': 'test',
        'x-reason-for-access': 'unit-test',
      },
      payload: { content, expectedHash },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.valid).toBe(true);
    expect(body.actualHash).toBe(expectedHash);
  });
});

