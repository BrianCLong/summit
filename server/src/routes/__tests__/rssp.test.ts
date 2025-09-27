import express from 'express';
import request from 'supertest';
import { rsspRouter } from '../rssp.js';
import { RSSP_ATTESTATIONS, RSSP_PUBLIC_KEY } from '../../transparency/rssp/attestations.js';
import { materializeExport } from '../../transparency/rssp/verification.js';

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/rssp', rsspRouter);
  return app;
};

const regulatorHeaders = {
  'x-rssp-role': 'regulator',
};

describe('RSSP router', () => {
  it('enforces regulator-only access', async () => {
    const app = buildApp();
    const response = await request(app).get('/api/rssp/attestations');
    expect(response.status).toBe(403);
    expect(response.body.error).toBe('forbidden');
  });

  it('lists attestation summaries', async () => {
    const app = buildApp();
    const response = await request(app).get('/api/rssp/attestations').set(regulatorHeaders);
    expect(response.status).toBe(200);
    expect(response.body.attestations).toHaveLength(RSSP_ATTESTATIONS.length);
    const first = response.body.attestations[0];
    expect(first).toMatchObject({
      id: RSSP_ATTESTATIONS[0].id,
      payloadHash: RSSP_ATTESTATIONS[0].payloadHash,
      exportHash: RSSP_ATTESTATIONS[0].exportHash,
    });
  });

  it('retrieves the dataset public key', async () => {
    const app = buildApp();
    const response = await request(app).get('/api/rssp/public-key').set(regulatorHeaders);
    expect(response.status).toBe(200);
    expect(response.body.publicKey).toBe(RSSP_PUBLIC_KEY);
  });

  it('returns attestation detail without leaking bytes directly', async () => {
    const app = buildApp();
    const attestation = RSSP_ATTESTATIONS[0];
    const response = await request(app)
      .get(`/api/rssp/attestations/${attestation.id}`)
      .set(regulatorHeaders);
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(attestation.id);
    expect(response.body.exportPackBytes).toBe(materializeExport(attestation).byteLength);
    expect(response.body).not.toHaveProperty('exportPack');
  });

  it('provides byte-identical exports', async () => {
    const app = buildApp();
    const attestation = RSSP_ATTESTATIONS[0];
    const response = await request(app)
      .get(`/api/rssp/attestations/${attestation.id}/export`)
      .set(regulatorHeaders)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    expect(response.status).toBe(200);
    const downloaded = response.body as Buffer;
    const expected = materializeExport(attestation);
    expect(Buffer.compare(Buffer.from(downloaded), expected)).toBe(0);
    expect(response.headers['x-artifact-sha256']).toBe(attestation.exportHash);
  });

  it('verifies attestations inline', async () => {
    const app = buildApp();
    const attestation = RSSP_ATTESTATIONS[0];
    const response = await request(app)
      .post(`/api/rssp/attestations/${attestation.id}/verify`)
      .set(regulatorHeaders);
    expect(response.status).toBe(200);
    expect(response.body.attestationId).toBe(attestation.id);
    expect(response.body.result.ok).toBe(true);
  });

  it('blocks mutating methods', async () => {
    const app = buildApp();
    const response = await request(app)
      .delete(`/api/rssp/attestations/${RSSP_ATTESTATIONS[0].id}`)
      .set(regulatorHeaders);
    expect(response.status).toBe(405);
    expect(response.body.error).toBe('method_not_allowed');
  });
});
