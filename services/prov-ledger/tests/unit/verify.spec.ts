import { signDetachedJws, verifyDetachedJws } from '../../src/sign';
import { verifyManifest } from '../../src/verify';

const { generateKeyPairSync } = require('crypto');

function createKeys() {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  return {
    privPem: privateKey.export({ type: 'pkcs1', format: 'pem' }) as string,
    pubPem: publicKey.export({ type: 'pkcs1', format: 'pem' }) as string,
  };
}

describe('detached JWS', () => {
  test('roundtrip JWS detached', () => {
    const payloadB64 = Buffer.from('{"x":1}').toString('base64');
    const { privPem, pubPem } = createKeys();
    const jws = signDetachedJws(payloadB64, { kid: 'dev', privPem, pubPem });
    expect(verifyDetachedJws(payloadB64, jws, pubPem)).toBe(true);
  });

  test('rejects tampered header', () => {
    const payloadB64 = Buffer.from('{"x":1}').toString('base64');
    const { privPem, pubPem } = createKeys();
    const jws = signDetachedJws(payloadB64, { kid: 'dev', privPem, pubPem });
    const [headerB64, , sig] = jws.split('.');
    const tamperedHeader = Buffer.from(
      JSON.stringify({ alg: 'PS256', kid: 'dev', b64: false, crit: ['b64'] }),
    ).toString('base64url');
    expect(() => verifyDetachedJws(payloadB64, `${tamperedHeader}..${sig}`, pubPem)).toThrow(
      'unsupported_alg',
    );
  });
});

describe('manifest validation', () => {
  test('valid manifest accepted', () => {
    expect(
      verifyManifest({
        version: 1,
        claims: [
          {
            id: 'claim-1',
            hashRoot: 'a'.repeat(64),
            chain: ['b'.repeat(64)],
          },
        ],
      }),
    ).toBe(true);
  });

  test('rejects duplicate ids and bad hashes', () => {
    expect(() =>
      verifyManifest({
        version: 1,
        claims: [
          { id: 'dup', hashRoot: 'z', chain: ['c'.repeat(64)] },
          { id: 'dup', hashRoot: 'c'.repeat(64), chain: ['c'.repeat(64)] },
        ],
      }),
    ).toThrow();
  });
});
