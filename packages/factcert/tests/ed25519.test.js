"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ed25519_js_1 = require("../src/lib/ed25519.js");
(0, vitest_1.describe)('Ed25519', () => {
    (0, vitest_1.it)('should sign and verify', () => {
        const keys = (0, ed25519_js_1.generateKeypair)();
        const msg = "hello world";
        const sig = (0, ed25519_js_1.sign)(msg, keys);
        (0, vitest_1.expect)(keys.publicKeyHex.length).toBe(64);
        (0, vitest_1.expect)(keys.privateKeyHex.length).toBe(64);
        (0, vitest_1.expect)(sig.length).toBe(128); // 64 bytes hex
        (0, vitest_1.expect)((0, ed25519_js_1.verify)(msg, sig, keys.publicKeyHex)).toBe(true);
        (0, vitest_1.expect)((0, ed25519_js_1.verify)("wrong message", sig, keys.publicKeyHex)).toBe(false);
    });
    (0, vitest_1.it)('should fail with wrong key', () => {
        const keys1 = (0, ed25519_js_1.generateKeypair)();
        const keys2 = (0, ed25519_js_1.generateKeypair)();
        const msg = "hello world";
        const sig = (0, ed25519_js_1.sign)(msg, keys1);
        (0, vitest_1.expect)((0, ed25519_js_1.verify)(msg, sig, keys2.publicKeyHex)).toBe(false);
    });
});
