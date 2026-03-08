"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = require("../src");
const crypto_1 = require("crypto");
describe('FZTRRelay', () => {
    let relay;
    beforeAll(() => {
        relay = new src_1.FZTRRelay();
        relay.registerIssuer('test-issuer');
        // To test with supertest, we need the underlying express app
        // This requires FZTRRelay to expose its app or for us to mock more deeply
        // For now, we'll assume a way to get the app instance or test the methods directly
    });
    test('should verify a valid credential', () => {
        const payload = JSON.stringify({ data: 'test-data' });
        const payloadHash = (0, crypto_1.createHash)('sha256').update(payload).digest('hex');
        const credential = {
            id: 'test-id',
            issuer: 'test-issuer',
            signature: `mock-sig-${payloadHash}`,
            payload: payload,
        };
        expect(relay.verifyCredential(credential)).toBe(true);
    });
    test('should reject an invalid credential', () => {
        const payload = JSON.stringify({ data: 'test-data' });
        const payloadHash = (0, crypto_1.createHash)('sha256').update(payload).digest('hex');
        const credential = {
            id: 'test-id',
            issuer: 'unknown-issuer',
            signature: `mock-sig-${payloadHash}`,
            payload: payload,
        };
        expect(relay.verifyCredential(credential)).toBe(false);
    });
    // More comprehensive tests would involve supertest against the express app
});
