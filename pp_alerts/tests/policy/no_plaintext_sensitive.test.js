"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const no_plaintext_sensitive_1 = require("../../src/policy/no_plaintext_sensitive");
describe('No Plaintext Sensitive Gate', () => {
    it('should accept clean payload', () => {
        const payload = {
            id: 'abc',
            data: {
                score: 10,
                tags: ['a', 'b']
            }
        };
        expect(() => (0, no_plaintext_sensitive_1.validate)(payload)).not.toThrow();
    });
    it('should reject top-level sensitive key', () => {
        const payload = {
            src_ip: '1.2.3.4',
            other: 'value'
        };
        expect(() => (0, no_plaintext_sensitive_1.validate)(payload)).toThrow(/matched src_ip/);
    });
    it('should reject nested sensitive key', () => {
        const payload = {
            meta: {
                user: {
                    email: 'test@example.com'
                }
            }
        };
        expect(() => (0, no_plaintext_sensitive_1.validate)(payload)).toThrow(/meta\.user\.email.*matched email/);
    });
    it('should reject mixed content', () => {
        const payload = {
            safe: 'val',
            payload: 'secret'
        };
        expect(() => (0, no_plaintext_sensitive_1.validate)(payload)).toThrow(/matched payload/);
    });
});
