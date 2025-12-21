import { buildServer } from '../src/index.js';
import { LedgerService } from '../src/services/LedgerService.js';
import { buildMerkleRoot } from '../src/utils/merkle.js';

describe('prov-ledger v1 API', () => {
  const server = buildServer();
  const ledger = LedgerService.getInstance();

  beforeEach(async () => {
    await ledger.initDB();
    await ledger.reset();
  });

  afterAll(async () => {
    await server.close();
  });

  it('creates evidence with idempotency', async () => {
    const payload = { source: 'sensor', hash: 'sha256:abc123456789' };
    const first = await server.inject({
      method: 'POST',
      url: '/v1/evidence',
      headers: { 'idempotency-key': 'abc' },
      payload,
    });
    const second = await server.inject({
      method: 'POST',
      url: '/v1/evidence',
      headers: { 'idempotency-key': 'abc' },
      payload,
    });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect(JSON.parse(first.body).evidenceId).toEqual(JSON.parse(second.body).evidenceId);
  });

  it('registers claims and returns manifest with matching merkle root', async () => {
    const evidenceResp = await server.inject({
      method: 'POST',
      url: '/v1/evidence',
      payload: { source: 'camera', hash: 'sha256:def4567890123', license: 'CC-BY' },
    });
    const { evidenceId } = JSON.parse(evidenceResp.body);

    const claimResp = await server.inject({
      method: 'POST',
      url: '/v1/claims',
      payload: { evidenceIds: [evidenceId], assertion: 'object present', confidence: 0.9 },
    });
    const { claimId, merkleRoot } = JSON.parse(claimResp.body);
    expect(claimId).toBeDefined();

    const manifestResp = await server.inject({ method: 'GET', url: `/v1/manifest/${claimId}` });
    expect(manifestResp.statusCode).toBe(200);
    const manifest = JSON.parse(manifestResp.body);
    const recomputedRoot = buildMerkleRoot(manifest.entries.map((e: any) => e.hash));
    expect(merkleRoot).toEqual(manifest.merkleRoot);
    expect(manifest.merkleRoot).toEqual(recomputedRoot);
  });
});
