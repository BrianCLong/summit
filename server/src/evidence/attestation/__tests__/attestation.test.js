"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const node_crypto_1 = require("node:crypto");
const sign_js_1 = require("../sign.js");
const verify_js_1 = require("../verify.js");
(0, globals_1.describe)('Evidence Attestation', () => {
    const originalEnv = process.env;
    (0, globals_1.beforeAll)(() => {
        process.env = { ...originalEnv };
    });
    (0, globals_1.afterAll)(() => {
        process.env = originalEnv;
    });
    const manifest = {
        id: 'ev-123',
        timestamp: '2023-10-27T10:00:00Z',
        artifacts: ['art-1', 'art-2']
    };
    (0, globals_1.describe)('Signer: none', () => {
        (0, globals_1.it)('should produce predictable output', async () => {
            const signature = await (0, sign_js_1.signManifest)(manifest, { signerType: 'none' });
            (0, globals_1.expect)(signature).toContain('none:');
            const isValid = await (0, verify_js_1.verifyManifest)(manifest, signature, { signerType: 'none' });
            (0, globals_1.expect)(isValid).toBe(true);
        });
        (0, globals_1.it)('should fail verification on tampered manifest', async () => {
            const signature = await (0, sign_js_1.signManifest)(manifest, { signerType: 'none' });
            const tamperedManifest = { ...manifest, id: 'ev-666' };
            const isValid = await (0, verify_js_1.verifyManifest)(tamperedManifest, signature, { signerType: 'none' });
            (0, globals_1.expect)(isValid).toBe(false);
        });
    });
    (0, globals_1.describe)('Signer: ed25519', () => {
        // Deterministic test keys (test-only)
        const privateKeyPem = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIBpc5We8d/qFf9jIP4LcY+I+nthzXCLGZlbQg1SYfU6z
-----END PRIVATE KEY-----`;
        const publicKeyPem = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA/lXmISOjqQVCE9OIWqP8y7oATdN9+FgtonD0XynSjzQ=
-----END PUBLIC KEY-----`;
        (0, globals_1.it)('should throw if EVIDENCE_SIGNING_ENABLED is false (default)', async () => {
            delete process.env.EVIDENCE_SIGNING_ENABLED;
            await (0, globals_1.expect)((0, sign_js_1.signManifest)(manifest, { signerType: 'ed25519', privateKey: privateKeyPem }))
                .rejects.toThrow('EVIDENCE_SIGNING_ENABLED is not enabled');
        });
        (0, globals_1.it)('should sign and verify when enabled', async () => {
            process.env.EVIDENCE_SIGNING_ENABLED = 'true';
            const signature = await (0, sign_js_1.signManifest)(manifest, { signerType: 'ed25519', privateKey: privateKeyPem });
            (0, globals_1.expect)(signature).toContain('ed25519:');
            const isValid = await (0, verify_js_1.verifyManifest)(manifest, signature, { signerType: 'ed25519', publicKey: publicKeyPem });
            (0, globals_1.expect)(isValid).toBe(true);
        });
        (0, globals_1.it)('should fail verification on tampered manifest', async () => {
            process.env.EVIDENCE_SIGNING_ENABLED = 'true';
            const signature = await (0, sign_js_1.signManifest)(manifest, { signerType: 'ed25519', privateKey: privateKeyPem });
            const tamperedManifest = { ...manifest, artifacts: [] };
            const isValid = await (0, verify_js_1.verifyManifest)(tamperedManifest, signature, { signerType: 'ed25519', publicKey: publicKeyPem });
            (0, globals_1.expect)(isValid).toBe(false);
        });
        (0, globals_1.it)('should fail verification with wrong key', async () => {
            process.env.EVIDENCE_SIGNING_ENABLED = 'true';
            const signature = await (0, sign_js_1.signManifest)(manifest, { signerType: 'ed25519', privateKey: privateKeyPem });
            // Use a different key
            const otherKey = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=
-----END PUBLIC KEY-----`;
            // Note: the above might be invalid PEM structure for node crypto,
            // better to use a real generated one or just one that is structurally valid.
            // Let's generate another one.
            const { publicKey: validOtherKey } = (0, node_crypto_1.generateKeyPairSync)('ed25519', {
                publicKeyEncoding: { type: 'spki', format: 'pem' }
            });
            const validOtherKeyPem = typeof validOtherKey === 'string'
                ? validOtherKey
                : validOtherKey.export({ type: 'spki', format: 'pem' }).toString();
            const isValid = await (0, verify_js_1.verifyManifest)(manifest, signature, { signerType: 'ed25519', publicKey: validOtherKeyPem });
            (0, globals_1.expect)(isValid).toBe(false);
        });
    });
});
