import express from 'express';
import request from 'supertest';
import path from 'path';
import crypto from 'crypto';
import { readFileSync } from 'fs';
import { createApp } from '../src/index';
import { stopObservability } from '../src/observability';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

let upstreamServer: Server;
let opaServer: Server;

function signChallenge(challenge: string) {
  const privateKeyPath = path.join(
    __dirname,
    'fixtures',
    'webauthn-private.pem',
  );
  const privateKey = readFileSync(privateKeyPath, 'utf8');
  const signer = crypto.createSign('SHA256');
  signer.update(Buffer.from(challenge, 'utf8'));
  signer.end();
  return signer.sign(privateKey).toString('base64url');
}

async function stepUp(app: express.Express, token: string) {
  const challengeRes = await request(app)
    .post('/auth/webauthn/challenge')
    .set('Authorization', `Bearer ${token}`)
    .send({
      action: 'dataset:read',
      resourceId: 'dataset-alpha',
      classification: 'confidential',
    });
  const signature = signChallenge(challengeRes.body.challenge);
  const step = await request(app)
    .post('/auth/step-up')
    .set('Authorization', `Bearer ${token}`)
    .send({
      credentialId: challengeRes.body.allowCredentials[0].id,
      challenge: challengeRes.body.challenge,
      signature,
    });
  return step.body.token;
}

beforeAll((done) => {
  const upstream = express();
  upstream.get('/resource', (_req, res) => res.json({ data: 'ok' }));
  upstreamServer = upstream.listen(0, () => {
    const port = (upstreamServer.address() as AddressInfo).port;
    process.env.UPSTREAM = `http://localhost:${port}`;
    const opa = express();
    opa.use(express.json());
    opa.post('/v1/data/summit/abac/decision', (req, res) => {
      const { subject, resource, context } = req.body.input;
      if (subject.tenantId !== resource.tenantId) {
        return res.json({
          result: { allow: false, reason: 'tenant_mismatch', obligations: [] },
        });
      }
      if (subject.residency !== resource.residency) {
        return res.json({
          result: {
            allow: false,
            reason: 'residency_mismatch',
            obligations: [],
          },
        });
      }
      const requiresStepUp = resource.classification !== 'public';
      if (requiresStepUp && context.currentAcr !== 'loa2') {
        return res.json({
          result: {
            allow: false,
            reason: 'step_up_required',
            obligations: [
              { type: 'step_up', mechanism: 'webauthn', required_acr: 'loa2' },
            ],
          },
        });
      }
      return res.json({
        result: { allow: true, reason: 'allow', obligations: [] },
      });
    });
    opaServer = opa.listen(0, () => {
      const opaPort = (opaServer.address() as AddressInfo).port;
      process.env.OPA_URL = `http://localhost:${opaPort}/v1/data/summit/abac/decision`;
      done();
    });
  });
});

afterAll(async () => {
  upstreamServer.close();
  opaServer.close();
  await stopObservability();
});

describe('proxy', () => {
  it('requires step-up before granting access and succeeds after upgrade', async () => {
    const app = await createApp();
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'password123' });
    const token = loginRes.body.token;
    const first = await request(app)
      .get('/protected/resource')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'tenantA')
      .set('x-resource-id', 'dataset-alpha');
    expect(first.status).toBe(401);
    expect(first.body.error).toBe('step_up_required');
    expect(first.body.obligations[0].required_acr).toBe('loa2');

    const elevatedToken = await stepUp(app, token);
    const second = await request(app)
      .get('/protected/resource')
      .set('Authorization', `Bearer ${elevatedToken}`)
      .set('x-tenant-id', 'tenantA')
      .set('x-resource-id', 'dataset-alpha');
    expect(second.status).toBe(200);
    expect(second.body.data).toBe('ok');
  });

  it('blocks cross-tenant access even after step-up', async () => {
    const app = await createApp();
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'password123' });
    const token = loginRes.body.token;
    const elevatedToken = await stepUp(app, token);
    const res = await request(app)
      .get('/protected/resource')
      .set('Authorization', `Bearer ${elevatedToken}`)
      .set('x-tenant-id', 'tenantB')
      .set('x-resource-id', 'dataset-beta');
    expect(res.status).toBe(403);
  });
});
