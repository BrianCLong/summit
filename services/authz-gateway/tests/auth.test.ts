import express from 'express';
import request from 'supertest';
import path from 'path';
import { readFileSync } from 'fs';
import crypto from 'crypto';
import { createApp } from '../src/index';
import { stopObservability } from '../src/observability';
import type { AddressInfo } from 'net';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { resetOidcCache } from '../src/oidc';

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

async function buildOidcToken(
  claims: Record<string, unknown> = {},
  { requireMfa = true } = {},
) {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey);
  jwk.kid = 'test-oidc-kid';
  jwk.use = 'sig';
  jwk.alg = 'RS256';
  const issuer = 'https://oidc.example.test';
  const audience = 'authz-gateway';
  const oidc = express();
  oidc.get('/.well-known/jwks.json', (_req, res) => res.json({ keys: [jwk] }));
  const server = oidc.listen(0);
  const jwksPort = (server.address() as AddressInfo).port;
  process.env.OIDC_JWKS_URI = `http://localhost:${jwksPort}/.well-known/jwks.json`;
  process.env.OIDC_ISSUER = issuer;
  process.env.OIDC_AUDIENCE = audience;
  process.env.STAGING_REQUIRE_MFA = requireMfa ? 'true' : 'false';
  const idToken = await new SignJWT({
    sub: 'alice',
    acr: 'loa2',
    amr: ['pwd', 'mfa'],
    ...claims,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-oidc-kid' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);
  return { server, idToken };
}

describe('token lifecycle', () => {
  afterAll(async () => {
    await stopObservability();
  });

  afterEach(() => {
    delete process.env.OIDC_JWKS_URI;
    delete process.env.OIDC_ISSUER;
    delete process.env.OIDC_AUDIENCE;
    delete process.env.STAGING_REQUIRE_MFA;
    resetOidcCache();
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

  it('exchanges an OIDC id_token with JWKS validation', async () => {
    const { server, idToken } = await buildOidcToken();
    const app = await createApp();
    const res = await request(app)
      .post('/auth/oidc/callback')
      .send({ idToken });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();

    const introspectRes = await request(app)
      .post('/auth/introspect')
      .send({ token: res.body.token });
    expect(introspectRes.status).toBe(200);
    expect(introspectRes.body.amr).toContain('mfa');
    server.close();
  });

  it('rejects OIDC tokens that do not meet MFA in staging', async () => {
    const { server, idToken } = await buildOidcToken(
      { acr: 'loa1', amr: ['pwd'] },
      { requireMfa: true },
    );
    const app = await createApp();
    const res = await request(app)
      .post('/auth/oidc/callback')
      .send({ idToken });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('mfa_required');
    server.close();
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
      .set('Authorization', `Bearer ${token}`);
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
    opaServer.close();
  });
});
