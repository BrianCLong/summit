import express from 'express';
import request from 'supertest';
import path from 'path';
import { readFileSync } from 'fs';
import crypto from 'crypto';
import { createApp } from '../src/index';
import { stopObservability } from '../src/observability';
import type { AddressInfo } from 'net';

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

describe('token lifecycle', () => {
  afterAll(async () => {
    await stopObservability();
  });

  it('logs in and introspects', async () => {
    process.env.OPA_URL = 'http://localhost:8181/v1/data/summit/abac/decision';
    const app = await createApp();
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'password123' });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;
    const introspectRes = await request(app)
      .post('/auth/introspect')
      .send({ token });
    expect(introspectRes.status).toBe(200);
    expect(introspectRes.body.sub).toBe('alice');
  });

  it('serves JWKS', async () => {
    const app = await createApp();
    const res = await request(app).get('/.well-known/jwks.json');
    expect(res.status).toBe(200);
    expect(res.body.keys[0].kty).toBe('RSA');
  });

  it('rejects invalid introspection token', async () => {
    const app = await createApp();
    const res = await request(app)
      .post('/auth/introspect')
      .send({ token: 'bad' });
    expect(res.status).toBe(401);
  });

  it('performs WebAuthn step-up authentication', async () => {
    const opa = express();
    opa.use(express.json());
    opa.post('/v1/data/summit/abac/decision', (_req, res) =>
      res.json({ result: { allow: true, reason: 'allow', obligations: [] } }),
    );
    const opaServer = opa.listen(0);
    const opaPort = (opaServer.address() as AddressInfo).port;
    process.env.OPA_URL = `http://localhost:${opaPort}/v1/data/summit/abac/decision`;
    const app = await createApp();
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ username: 'alice', password: 'password123' });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;

    const challengeRes = await request(app)
      .post('/auth/webauthn/challenge')
      .set('Authorization', `Bearer ${token}`)
      .send({
        action: 'dataset:read',
        resourceId: 'dataset-alpha',
        classification: 'confidential',
      });
    expect(challengeRes.status).toBe(200);
    expect(challengeRes.body.challenge).toBeDefined();
    const signature = signChallenge(challengeRes.body.challenge);

    const step = await request(app)
      .post('/auth/step-up')
      .set('Authorization', `Bearer ${token}`)
      .send({
        credentialId: challengeRes.body.allowCredentials[0].id,
        challenge: challengeRes.body.challenge,
        signature,
      });
    expect(step.status).toBe(200);
    const introspectRes = await request(app)
      .post('/auth/introspect')
      .send({ token: step.body.token });
    expect(introspectRes.status).toBe(200);
    expect(introspectRes.body.acr).toBe('loa2');
    expect(introspectRes.body.elevation.requestedAction).toBe('dataset:read');
    opaServer.close();
  });
});
