import path from 'path';
import crypto from 'crypto';
import { readFileSync } from 'fs';
import { StepUpManager } from '../src/stepup';

function sign(challenge: string) {
  const privateKey = readFileSync(
    path.join(__dirname, 'fixtures', 'webauthn-private.pem'),
    'utf8',
  );
  const signer = crypto.createSign('SHA256');
  signer.update(Buffer.from(challenge, 'utf8'));
  signer.end();
  return signer.sign(privateKey).toString('base64url');
}

describe('StepUpManager', () => {
  it('verifies challenge and prevents replay', () => {
    const manager = new StepUpManager({ ttlMs: 1000 });
    const challenge = manager.createChallenge('alice', {
      sessionId: 'session-1',
      requestedAction: 'dataset:read',
      resourceId: 'dataset-alpha',
      classification: 'confidential',
      tenantId: 'tenantA',
    });
    const signature = sign(challenge.challenge);
    const elevation = manager.verifyResponse(
      'alice',
      {
        credentialId: challenge.allowCredentials[0].id,
        challenge: challenge.challenge,
        signature,
      },
      'session-1',
    );
    expect(elevation.requestedAction).toBe('dataset:read');
    expect(elevation.sessionId).toBe('session-1');
    expect(Date.parse(elevation.expiresAt)).toBeGreaterThan(Date.now());
    expect(() =>
      manager.verifyResponse(
        'alice',
        {
          credentialId: challenge.allowCredentials[0].id,
          challenge: challenge.challenge,
          signature,
        },
        'session-1',
      ),
    ).toThrow('challenge_already_used');
  });

  it('expires challenges', () => {
    let now = Date.now();
    const manager = new StepUpManager({ ttlMs: 10, now: () => now });
    const challenge = manager.createChallenge('alice', {
      sessionId: 'session-1',
      requestedAction: 'dataset:read',
    });
    now += 20;
    const signature = sign(challenge.challenge);
    expect(() =>
      manager.verifyResponse(
        'alice',
        {
          credentialId: challenge.allowCredentials[0].id,
          challenge: challenge.challenge,
          signature,
        },
        'session-1',
      ),
    ).toThrow('challenge_expired');
  });

  it('rejects session mismatches to preserve provenance', () => {
    const manager = new StepUpManager({ ttlMs: 1000 });
    const challenge = manager.createChallenge('alice', {
      sessionId: 'session-1',
      requestedAction: 'dataset:read',
    });
    const signature = sign(challenge.challenge);
    expect(() =>
      manager.verifyResponse(
        'alice',
        {
          credentialId: challenge.allowCredentials[0].id,
          challenge: challenge.challenge,
          signature,
        },
        'session-2',
      ),
    ).toThrow('session_mismatch');
  });
});
