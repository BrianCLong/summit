"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const additive_1 = require("../../src/secret_sharing/additive");
describe('Additive Secret Sharing', () => {
    const MODULUS = 1000;
    beforeAll(() => {
        process.env.PP_ALERTS_HMAC_KEY = 'test-key';
    });
    afterAll(() => {
        delete process.env.PP_ALERTS_HMAC_KEY;
    });
    it('should split and reconstruct correctly', () => {
        const value = 123;
        const nShares = 3;
        const bundle = (0, additive_1.split)(value, nShares, MODULUS);
        expect(bundle.shares.length).toBe(nShares);
        const result = (0, additive_1.reconstruct)(bundle);
        expect(result).toBe(value);
    });
    it('should fail if a share is tampered', () => {
        const value = 123;
        const bundle = (0, additive_1.split)(value, 3, MODULUS);
        // Tamper value
        bundle.shares[0].value = (bundle.shares[0].value + 1) % MODULUS;
        expect(() => (0, additive_1.reconstruct)(bundle)).toThrow(/Integrity check failed/);
    });
    it('should fail if nShares < 2', () => {
        expect(() => (0, additive_1.split)(10, 1, MODULUS)).toThrow();
    });
    it('should fail if value >= modulus', () => {
        expect(() => (0, additive_1.split)(MODULUS + 1, 3, MODULUS)).toThrow();
    });
});
