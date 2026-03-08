"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const wallet_1 = require("../src/wallet");
const crypto_1 = require("crypto");
test('selective disclosure proofs verify', () => {
    const { privateKey, publicKey } = (0, crypto_1.generateKeyPairSync)('rsa', {
        modulusLength: 2048,
    });
    const steps = Array.from({ length: 5 }, (_, i) => ({
        id: `s${i}`,
        tool: 'graph.query',
        startedAt: new Date().toISOString(),
        endedAt: new Date().toISOString(),
        inputHash: 'i' + i,
        outputHash: 'o' + i,
        policyHash: 'p' + i,
        modelHash: 'm' + i,
    }));
    const { manifest, steps: S, leaves, } = (0, wallet_1.buildWallet)('run1', 'case1', steps, privateKey.export({ type: 'pkcs1', format: 'pem' }).toString());
    const bundle = (0, wallet_1.disclose)(['s1', 's3'], manifest, S, leaves);
    const ok = (0, wallet_1.verifyDisclosure)(bundle, publicKey.export({ type: 'pkcs1', format: 'pem' }).toString());
    expect(ok).toBe(true);
});
