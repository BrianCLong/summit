import { FZTRRelay, VerifiableCredential } from '../src';
import request from 'supertest';
import { createHash } from 'crypto';

describe('FZTRRelay', () => {
  let relay: FZTRRelay;
  let app: express.Application; // Assuming express is imported in FZTRRelay

  beforeAll(() => {
    relay = new FZTRRelay();
    relay.registerIssuer('test-issuer');
    // To test with supertest, we need the underlying express app
    // This requires FZTRRelay to expose its app or for us to mock more deeply
    // For now, we'll assume a way to get the app instance or test the methods directly
  });

  test('should verify a valid credential', () => {
    const payload = JSON.stringify({ data: 'test-data' });
    const payloadHash = createHash('sha256').update(payload).digest('hex');
    const credential: VerifiableCredential = {
      id: 'test-id',
      issuer: 'test-issuer',
      signature: `mock-sig-${payloadHash}`,
      payload: payload,
    };
    expect(relay.verifyCredential(credential)).toBe(true);
  });

  test('should reject an invalid credential', () => {
    const payload = JSON.stringify({ data: 'test-data' });
    const payloadHash = createHash('sha256').update(payload).digest('hex');
    const credential: VerifiableCredential = {
      id: 'test-id',
      issuer: 'unknown-issuer',
      signature: `mock-sig-${payloadHash}`,
      payload: payload,
    };
    expect(relay.verifyCredential(credential)).toBe(false);
  });

  // More comprehensive tests would involve supertest against the express app
});