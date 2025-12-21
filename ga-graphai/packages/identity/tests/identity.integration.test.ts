import { createSign, generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  AuditBus,
  ScimProvisioner,
  SessionService,
  StepUpManager,
  validateOidcToken,
} from '../src/index.js';

const OIDC_SECRET = 'super-secret';

function buildIdToken(sub: string, email: string, tenant = 't1') {
  return jwt.sign(
    {
      sub,
      email,
      tenant,
      groups: ['admin'],
      jti: 'trace-123',
      name: 'Test User',
    },
    OIDC_SECRET,
    { algorithm: 'HS256' },
  );
}

describe('Identity end-to-end', () => {
  it('provisions SCIM user, logs in via OIDC, and enforces WebAuthn step-up', () => {
    const audit = new AuditBus();
    const scim = new ScimProvisioner(audit);
    const { publicKey, privateKey } = generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
    });

    const user = scim.upsertUser({
      id: 'user-1',
      tenantId: 't1',
      email: 'user1@example.com',
      displayName: 'User One',
      groups: ['admins'],
      webAuthnPublicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    });

    const token = buildIdToken(user.id, user.email, user.tenantId);
    const validated = validateOidcToken(token, OIDC_SECRET);
    const sessionService = new SessionService(audit, { ttlSeconds: 60 });
    const session = sessionService.createFromOidc(validated);

    expect(session.tenantId).toBe('t1');
    expect(session.scopes).toContain('admin');

    const stepUp = new StepUpManager(audit);
    const challenge = stepUp.issueChallenge(user, 'export');

    const signer = createSign('SHA256');
    signer.update(challenge.challenge);
    signer.end();
    const signature = signer.sign(privateKey, 'base64');

    const verified = stepUp.verifyAssertion(user, 'export', {
      challenge: challenge.challenge,
      signature,
    });
    expect(verified).toBe(true);
    expect(audit.integrityOk()).toBe(true);
  });

  it('blocks login for deprovisioned users', () => {
    const audit = new AuditBus();
    const scim = new ScimProvisioner(audit);

    const user = scim.upsertUser({
      id: 'user-2',
      tenantId: 't2',
      email: 'user2@example.com',
      displayName: 'User Two',
      groups: [],
    });

    scim.deprovisionUser(user.id);
    expect(() => scim.assertActiveUser('user2@example.com')).toThrow(/deprovisioned/);
  });
});
