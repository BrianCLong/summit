"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stable_json_1 = require("./stable_json");
const ed25519_1 = require("./ed25519");
describe('FactCert Libs', () => {
    test('stableStringify is deterministic', () => {
        const obj1 = { b: 2, a: 1, c: [3, 2, 1] };
        const obj2 = { a: 1, c: [3, 2, 1], b: 2 };
        expect((0, stable_json_1.stableStringify)(obj1)).toBe((0, stable_json_1.stableStringify)(obj2));
        expect((0, stable_json_1.stableStringify)(obj1)).toBe('{"a":1,"b":2,"c":[3,2,1]}');
    });
    test('Ed25519 signing and verification', () => {
        const keys = (0, ed25519_1.generateEd25519KeyPair)();
        const message = new TextEncoder().encode('Hello FactCert');
        const signature = (0, ed25519_1.signDetached)(message, keys.secretKey);
        const isValid = (0, ed25519_1.verifyDetached)(signature, message, keys.publicKey);
        expect(isValid).toBe(true);
        const badMessage = new TextEncoder().encode('Bad Message');
        expect((0, ed25519_1.verifyDetached)(signature, badMessage, keys.publicKey)).toBe(false);
    });
});
