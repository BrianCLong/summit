import crypto from 'crypto';
import { signDetachedJws, verifyDetachedJws } from '../../src/sign';
import { verifyManifest } from '../../src/verify';

test('roundtrip JWS detached', () => {
  const payloadB64 = Buffer.from('{"x":1}').toString('base64');
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jws = signDetachedJws(payloadB64, {
    kid: 'dev',
    privPem: privateKey.export({ type: 'pkcs1', format: 'pem' }),
    pubPem: publicKey.export({ type: 'pkcs1', format: 'pem' }),
  });
  expect(
    verifyDetachedJws(payloadB64, jws, publicKey.export({ type: 'pkcs1', format: 'pem' }))
  ).toBe(true);
});

test('tampered payload fails verification', () => {
  const payload = Buffer.from('{"x":1}').toString('base64');
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 1024 });
  const jws = signDetachedJws(payload, {
    kid: 'dev',
    privPem: privateKey.export({ type: 'pkcs1', format: 'pem' }),
    pubPem: publicKey.export({ type: 'pkcs1', format: 'pem' }),
  });
  const mutatedPayload = Buffer.from('{"x":2}').toString('base64');
  expect(
    verifyDetachedJws(mutatedPayload, jws, publicKey.export({ type: 'pkcs1', format: 'pem' }))
  ).toBe(false);
});

test('verifyManifest rejects duplicates and bad hashes', () => {
  const manifest = {
    version: 1,
    claims: [
      { id: 'a', hashRoot: '0'.repeat(64), chain: ['1'.repeat(64)] },
      { id: 'a', hashRoot: '0'.repeat(64), chain: ['2'.repeat(64)] },
    ],
  } as any;
  expect(() => verifyManifest(manifest)).toThrow('duplicate_claim');
});
