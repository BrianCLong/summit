// Tests for conductor events engine HMAC verification
import { createHmac } from 'crypto';
import { verifyHmac } from '../events/engine';

describe('verifyHmac', () => {
  const secret = 'test-webhook-secret';
  const payload = Buffer.from('{"event":"push","repository":"test"}');

  // Helper to generate valid signature
  function generateSignature(body: Buffer, secret: string, algorithm: 'sha256' | 'sha1' = 'sha256'): string {
    const hmac = createHmac(algorithm, secret);
    hmac.update(body);
    return `${algorithm}=${hmac.digest('hex')}`;
  }

  describe('valid signatures', () => {
    test('accepts valid sha256 signature', () => {
      const sig = generateSignature(payload, secret, 'sha256');
      expect(verifyHmac(sig, payload, secret)).toBe(true);
    });

    test('accepts valid sha1 signature', () => {
      const sig = generateSignature(payload, secret, 'sha1');
      expect(verifyHmac(sig, payload, secret)).toBe(true);
    });

    test('works with empty payload', () => {
      const emptyPayload = Buffer.from('');
      const sig = generateSignature(emptyPayload, secret, 'sha256');
      expect(verifyHmac(sig, emptyPayload, secret)).toBe(true);
    });

    test('works with unicode payload', () => {
      const unicodePayload = Buffer.from('{"message":"Hello 世界 🌍"}');
      const sig = generateSignature(unicodePayload, secret, 'sha256');
      expect(verifyHmac(sig, unicodePayload, secret)).toBe(true);
    });
  });

  describe('invalid signatures', () => {
    test('rejects wrong signature', () => {
      const sig = 'sha256=0000000000000000000000000000000000000000000000000000000000000000';
      expect(verifyHmac(sig, payload, secret)).toBe(false);
    });

    test('rejects wrong secret', () => {
      const sig = generateSignature(payload, secret, 'sha256');
      expect(verifyHmac(sig, payload, 'wrong-secret')).toBe(false);
    });

    test('rejects tampered payload', () => {
      const sig = generateSignature(payload, secret, 'sha256');
      const tamperedPayload = Buffer.from('{"event":"hack"}');
      expect(verifyHmac(sig, tamperedPayload, secret)).toBe(false);
    });
  });

  describe('malformed inputs', () => {
    test('rejects missing signature', () => {
      expect(verifyHmac(undefined, payload, secret)).toBe(false);
      expect(verifyHmac('', payload, secret)).toBe(false);
    });

    test('rejects missing body', () => {
      const sig = generateSignature(payload, secret, 'sha256');
      expect(verifyHmac(sig, undefined, secret)).toBe(false);
    });

    test('rejects missing secret', () => {
      const sig = generateSignature(payload, secret, 'sha256');
      expect(verifyHmac(sig, payload, '')).toBe(false);
    });

    test('rejects signature without algorithm prefix', () => {
      const hmac = createHmac('sha256', secret);
      hmac.update(payload);
      const hash = hmac.digest('hex');
      expect(verifyHmac(hash, payload, secret)).toBe(false);
    });

    test('rejects unsupported algorithms', () => {
      expect(verifyHmac('md5=abc123', payload, secret)).toBe(false);
      expect(verifyHmac('sha512=abc123', payload, secret)).toBe(false);
    });

    test('rejects non-hex hash values', () => {
      expect(verifyHmac('sha256=not-valid-hex!', payload, secret)).toBe(false);
      expect(verifyHmac('sha256=GHIJKL', payload, secret)).toBe(false);
    });

    test('rejects truncated signatures', () => {
      const sig = generateSignature(payload, secret, 'sha256');
      const truncated = sig.slice(0, 20);
      expect(verifyHmac(truncated, payload, secret)).toBe(false);
    });

    test('rejects malformed signature format', () => {
      expect(verifyHmac('sha256', payload, secret)).toBe(false);
      expect(verifyHmac('sha256=a=b', payload, secret)).toBe(false);
      expect(verifyHmac('=hash', payload, secret)).toBe(false);
    });
  });

  describe('security properties', () => {
    test('signature verification is case-insensitive for hex', () => {
      const sig = generateSignature(payload, secret, 'sha256');
      const upperSig = sig.replace(/[a-f]/g, (c) => c.toUpperCase());
      // Both should work since hex is case-insensitive
      expect(verifyHmac(sig, payload, secret)).toBe(true);
      expect(verifyHmac(upperSig, payload, secret)).toBe(true);
    });

    test('handles large payloads', () => {
      const largePayload = Buffer.alloc(1024 * 1024, 'x'); // 1MB
      const sig = generateSignature(largePayload, secret, 'sha256');
      expect(verifyHmac(sig, largePayload, secret)).toBe(true);
    });
  });
});
