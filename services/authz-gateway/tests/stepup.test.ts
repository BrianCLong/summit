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
    const challenge = manager.createChallenge('alice');
    const signature = sign(challenge.challenge);
    expect(
      manager.verifyResponse('alice', {
        credentialId: challenge.allowCredentials[0].id,
        challenge: challenge.challenge,
        signature,
      }),
    ).toBe(true);
    expect(() =>
      manager.verifyResponse('alice', {
        credentialId: challenge.allowCredentials[0].id,
        challenge: challenge.challenge,
        signature,
      }),
    ).toThrow('challenge_already_used');
  });

  it('expires challenges', () => {
    let now = Date.now();
    const manager = new StepUpManager({ ttlMs: 10, now: () => now });
    const challenge = manager.createChallenge('alice');
    now += 20;
    const signature = sign(challenge.challenge);
    expect(() =>
      manager.verifyResponse('alice', {
        credentialId: challenge.allowCredentials[0].id,
        challenge: challenge.challenge,
        signature,
      }),
    ).toThrow('challenge_expired');
  });
});
