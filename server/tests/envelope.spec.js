"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const envelope_js_1 = require("../src/conductor/crypto/envelope.js");
test('stores encrypted artifact with AAD (mocked vault likely fails)', async () => {
    // This test exercises function shape; in CI, VAULT env may be absent.
    // Expect rejection without Vault config.
    await expect((0, envelope_js_1.putEncryptedArtifact)('bucket', 'key', 'acme', Buffer.from('abc'), {
        tenant: 'acme',
        runId: 'r1',
    })).rejects.toBeTruthy();
});
