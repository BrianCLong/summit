import path from 'path';
import crypto from 'crypto';
import { readFileSync } from 'fs';
import { StepUpManager } from '../src/stepup';
import { registry } from '../src/observability';
import type { Counter, Gauge } from 'prom-client';

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

  it('evicts expired challenges and updates metrics', async () => {
    let now = Date.now();
    const manager = new StepUpManager({ ttlMs: 5, now: () => now });
    const first = manager.createChallenge('alice', {
      sessionId: 'session-1',
      requestedAction: 'dataset:read',
    });
    now += 10;
    manager.createChallenge('bob', {
      sessionId: 'session-2',
      requestedAction: 'dataset:read',
    });

    const signature = sign(first.challenge);
    expect(() =>
      manager.verifyResponse(
        'alice',
        {
          credentialId: first.allowCredentials[0].id,
          challenge: first.challenge,
          signature,
        },
        'session-1',
      ),
    ).toThrow('challenge_not_found');

    const cacheGauge =
      registry.getSingleMetric('authz_gateway_stepup_cache_size') as Gauge;
    const evictionCounter =
      registry.getSingleMetric('authz_gateway_stepup_evictions_total') as Counter<'reason'>;

    const cacheMetric = await cacheGauge.get();
    expect(cacheMetric.values[0].value).toBe(1);

    const evictionMetric = await evictionCounter.get();
    expect(
      evictionMetric.values.find((value) => value.labels.reason === 'expired')?.
        value,
    ).toBeGreaterThanOrEqual(1);
  });

  it('bounds the challenge cache and evicts oldest entries', () => {
    const manager = new StepUpManager({
      ttlMs: 1000,
      maxCachedChallenges: 2,
    });

    const first = manager.createChallenge('alice', {
      sessionId: 'session-1',
      requestedAction: 'dataset:read',
    });
    const second = manager.createChallenge('bob', {
      sessionId: 'session-2',
      requestedAction: 'dataset:read',
    });
    const third = manager.createChallenge('charlie', {
      sessionId: 'session-3',
      requestedAction: 'dataset:read',
    });

    const signature = sign(first.challenge);
    expect(() =>
      manager.verifyResponse(
        'alice',
        {
          credentialId: first.allowCredentials[0].id,
          challenge: first.challenge,
          signature,
        },
        'session-1',
      ),
    ).toThrow('challenge_not_found');

    const secondSignature = sign(second.challenge);
    expect(() =>
      manager.verifyResponse(
        'bob',
        {
          credentialId: second.allowCredentials[0].id,
          challenge: second.challenge,
          signature: secondSignature,
        },
        'session-2',
      ),
    ).not.toThrow();

    const thirdSignature = sign(third.challenge);
    expect(() =>
      manager.verifyResponse(
        'charlie',
        {
          credentialId: third.allowCredentials[0].id,
          challenge: third.challenge,
          signature: thirdSignature,
        },
        'session-3',
      ),
    ).not.toThrow();
  });
});
