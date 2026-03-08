"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ed25519_js_1 = require("../lib/ed25519.js");
(0, vitest_1.describe)('signing', () => {
    (0, vitest_1.it)('generates keys and signs messages', () => {
        const { publicKey, privateKey } = (0, ed25519_js_1.generateEd25519KeyPair)();
        const message = 'hello world';
        const signature = (0, ed25519_js_1.sign)(message, privateKey);
        (0, vitest_1.expect)((0, ed25519_js_1.verify)(message, signature, publicKey)).toBe(true);
        (0, vitest_1.expect)((0, ed25519_js_1.verify)('wrong message', signature, publicKey)).toBe(false);
    });
});
