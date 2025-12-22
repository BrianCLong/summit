import request from 'supertest';
import app from '../src/index';
import { v4 as uuidv4 } from 'uuid';

describe('Provenance Ledger Server', () => {
  let evidenceId: string;

  it('should register evidence', async () => {
    const res = await request(app)
      .post('/prov/evidence')
      .send({
        hash: '123',
        sourceMetadata: { foo: 'bar' },
        licenseTag: 'test',
        transforms: [],
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('evidenceId');
    evidenceId = res.body.evidenceId;
  });

  it('should create a claim', async () => {
    const res = await request(app)
      .post('/prov/claim')
      .send({
        evidenceIds: [evidenceId],
        confidence: 0.9,
        statement: 'test claim',
        observedAt: new Date().toISOString(),
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('claimId');
  });

  it('should handle claims with missing evidence', async () => {
    const res = await request(app)
      .post('/prov/claim')
      .send({
        evidenceIds: ['missing-evidence'],
        confidence: 0.9,
        statement: 'test claim',
        observedAt: new Date().toISOString(),
      });
    expect(res.statusCode).toEqual(400);
  });

  it('should support idempotency for evidence creation', async () => {
    const idempotencyKey = uuidv4();
    const evidencePayload = {
      hash: '456',
      sourceMetadata: { bar: 'baz' },
      licenseTag: 'test-idem',
      transforms: [],
    };

    const res1 = await request(app)
      .post('/prov/evidence')
      .set('idempotency-key', idempotencyKey)
      .send(evidencePayload);
    expect(res1.statusCode).toEqual(201);

    const res2 = await request(app)
      .post('/prov/evidence')
      .set('idempotency-key', idempotencyKey)
      .send(evidencePayload);
    expect(res2.statusCode).toEqual(201);
    expect(res2.body).toEqual(res1.body);
  });

  it('should support idempotency for claim creation', async () => {
    const idempotencyKey = uuidv4();
    const claimPayload = {
      evidenceIds: [evidenceId],
      confidence: 0.9,
      statement: 'idempotent test claim',
      observedAt: new Date().toISOString(),
    };

    const res1 = await request(app)
      .post('/prov/claim')
      .set('idempotency-key', idempotencyKey)
      .send(claimPayload);
    expect(res1.statusCode).toEqual(201);

    const res2 = await request(app)
      .post('/prov/claim')
      .set('idempotency-key', idempotencyKey)
      .send(claimPayload);
    expect(res2.statusCode).toEqual(201);
    expect(res2.body).toEqual(res1.body);
  });

  it('should return a manifest', async () => {
    const bundleId = 'test-bundle';
    const res = await request(app).get(`/prov/manifest/${bundleId}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('manifestId');
    expect(res.body.bundleId).toBe(bundleId);
    expect(res.body.evidence.length).toBeGreaterThan(0);
    expect(res.body.claims.length).toBeGreaterThan(0);
  });
});
