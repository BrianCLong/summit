"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = __importDefault(require("node:crypto"));
const globals_1 = require("@jest/globals");
const ledger_js_1 = require("../../src/provenance/ledger.js");
const index_js_1 = require("../../src/security/crypto/index.js");
(0, globals_1.describe)('ProvenanceLedgerV2 crypto integration', () => {
    (0, globals_1.beforeAll)(() => {
        globals_1.jest.useFakeTimers();
    });
    (0, globals_1.afterAll)(() => {
        globals_1.jest.clearAllTimers();
        globals_1.jest.useRealTimers();
        delete process.env.LEDGER_SIGNING_KEY_ID;
    });
    (0, globals_1.test)('delegates signing and verification to crypto pipeline when configured', async () => {
        const ledger = new ledger_js_1.ProvenanceLedgerV2();
        const pipeline = new index_js_1.CryptoPipeline({ keyStore: new index_js_1.InMemoryKeyStore() });
        const { publicKey, privateKey } = node_crypto_1.default.generateKeyPairSync('ed25519');
        const keyId = 'ledger-root';
        await pipeline.registerKeyVersion({
            id: keyId,
            version: 1,
            algorithm: 'EdDSA_ED25519',
            publicKeyPem: publicKey
                .export({ type: 'spki', format: 'pem' })
                .toString(),
            privateKeyPem: privateKey
                .export({ type: 'pkcs8', format: 'pem' })
                .toString(),
            createdAt: new Date(),
            validFrom: new Date(),
            isActive: true,
        });
        process.env.LEDGER_SIGNING_KEY_ID = keyId;
        ledger.setCryptoPipeline(pipeline);
        const rawSignature = await ledger.signWithCosign('root-data');
        (0, globals_1.expect)(rawSignature.trim().startsWith('{')).toBe(true);
        const isValid = await ledger.verifySignature('root-data', rawSignature);
        (0, globals_1.expect)(isValid).toBe(true);
    });
});
