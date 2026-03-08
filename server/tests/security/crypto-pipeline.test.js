"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const globals_1 = require("@jest/globals");
const index_js_1 = require("../../src/security/crypto/index.js");
const fixturesDir = node_path_1.default.resolve(__dirname, '../fixtures/crypto');
const ROOT_CERT = node_fs_1.default.readFileSync(node_path_1.default.join(fixturesDir, 'root.pem'), 'utf-8');
const INTERMEDIATE_CERT = node_fs_1.default.readFileSync(node_path_1.default.join(fixturesDir, 'intermediate.pem'), 'utf-8');
const LEAF_CERT = node_fs_1.default.readFileSync(node_path_1.default.join(fixturesDir, 'leaf.pem'), 'utf-8');
const LEAF_KEY = node_fs_1.default.readFileSync(node_path_1.default.join(fixturesDir, 'leaf.key'), 'utf-8');
class MemoryTimestampingService {
    tokens = new Map();
    async getTimestampToken(payload) {
        const digest = node_crypto_1.default.createHash('sha256').update(payload).digest('base64');
        this.tokens.set(digest, payload.toString('base64'));
        return digest;
    }
    async verify(payload, token) {
        return this.tokens.get(token) === payload.toString('base64');
    }
}
(0, globals_1.describe)('CryptoPipeline', () => {
    const algorithms = [
        {
            algorithm: 'RSA_SHA256',
            generate: () => {
                const { publicKey, privateKey } = node_crypto_1.default.generateKeyPairSync('rsa', {
                    modulusLength: 2048,
                });
                return {
                    publicKeyPem: publicKey
                        .export({ type: 'spki', format: 'pem' })
                        .toString(),
                    privateKeyPem: privateKey
                        .export({ type: 'pkcs1', format: 'pem' })
                        .toString(),
                };
            },
        },
        {
            algorithm: 'ECDSA_P256_SHA256',
            generate: () => {
                const { publicKey, privateKey } = node_crypto_1.default.generateKeyPairSync('ec', {
                    namedCurve: 'P-256',
                });
                return {
                    publicKeyPem: publicKey
                        .export({ type: 'spki', format: 'pem' })
                        .toString(),
                    privateKeyPem: privateKey
                        .export({ type: 'pkcs8', format: 'pem' })
                        .toString(),
                };
            },
        },
        {
            algorithm: 'ECDSA_P384_SHA384',
            generate: () => {
                const { publicKey, privateKey } = node_crypto_1.default.generateKeyPairSync('ec', {
                    namedCurve: 'secp384r1',
                });
                return {
                    publicKeyPem: publicKey
                        .export({ type: 'spki', format: 'pem' })
                        .toString(),
                    privateKeyPem: privateKey
                        .export({ type: 'pkcs8', format: 'pem' })
                        .toString(),
                };
            },
        },
        {
            algorithm: 'EdDSA_ED25519',
            generate: () => {
                const { publicKey, privateKey } = node_crypto_1.default.generateKeyPairSync('ed25519');
                return {
                    publicKeyPem: publicKey
                        .export({ type: 'spki', format: 'pem' })
                        .toString(),
                    privateKeyPem: privateKey
                        .export({ type: 'pkcs8', format: 'pem' })
                        .toString(),
                };
            },
        },
    ];
    globals_1.test.each(algorithms)('signs and verifies payload using %s', async ({ algorithm, generate }) => {
        const pipeline = new index_js_1.CryptoPipeline({ keyStore: new index_js_1.InMemoryKeyStore() });
        const material = generate();
        const key = {
            id: `key-${algorithm}`,
            version: 1,
            algorithm,
            publicKeyPem: material.publicKeyPem,
            privateKeyPem: material.privateKeyPem,
            createdAt: new Date(),
            validFrom: new Date(),
            isActive: true,
        };
        await pipeline.registerKeyVersion(key);
        const bundle = await pipeline.signPayload('hello world', key.id);
        const result = await pipeline.verifySignature('hello world', bundle, {
            expectedAlgorithm: algorithm,
            expectedKeyId: key.id,
        });
        (0, globals_1.expect)(result.valid).toBe(true);
        (0, globals_1.expect)(result.errors).toBeUndefined();
    });
    (0, globals_1.test)('supports key rotation and legacy signature validation', async () => {
        const pipeline = new index_js_1.CryptoPipeline({ keyStore: new index_js_1.InMemoryKeyStore() });
        const { publicKey, privateKey } = node_crypto_1.default.generateKeyPairSync('ed25519');
        const keyId = 'rotate-test';
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
        const bundleV1 = await pipeline.signPayload('payload', keyId);
        const newMaterial = node_crypto_1.default.generateKeyPairSync('ed25519');
        await pipeline.rotateKey(keyId, {
            algorithm: 'EdDSA_ED25519',
            publicKeyPem: newMaterial.publicKey
                .export({ type: 'spki', format: 'pem' })
                .toString(),
            privateKeyPem: newMaterial.privateKey
                .export({ type: 'pkcs8', format: 'pem' })
                .toString(),
            createdAt: new Date(),
            validFrom: new Date(),
            metadata: { rotated: true },
        });
        const bundleV2 = await pipeline.signPayload('payload', keyId);
        (0, globals_1.expect)(bundleV1.keyVersion).toBe(1);
        (0, globals_1.expect)(bundleV2.keyVersion).toBe(2);
        const verifyOld = await pipeline.verifySignature('payload', bundleV1, {
            expectedKeyId: keyId,
        });
        const verifyNew = await pipeline.verifySignature('payload', bundleV2, {
            expectedKeyId: keyId,
        });
        (0, globals_1.expect)(verifyOld.valid).toBe(true);
        (0, globals_1.expect)(verifyNew.valid).toBe(true);
    });
    (0, globals_1.test)('validates certificate chains against trust anchors', async () => {
        const pipeline = new index_js_1.CryptoPipeline({
            keyStore: new index_js_1.InMemoryKeyStore(),
            trustAnchors: [ROOT_CERT],
        });
        await pipeline.registerKeyVersion({
            id: 'cert-chain',
            version: 1,
            algorithm: 'ECDSA_P256_SHA256',
            publicKeyPem: node_crypto_1.default
                .createPublicKey(LEAF_KEY)
                .export({ type: 'spki', format: 'pem' })
                .toString(),
            privateKeyPem: LEAF_KEY,
            certificateChain: [LEAF_CERT, INTERMEDIATE_CERT, ROOT_CERT],
            createdAt: new Date(),
            validFrom: new Date(),
            isActive: true,
        });
        const bundle = await pipeline.signPayload('chain payload', 'cert-chain');
        const result = await pipeline.verifySignature('chain payload', bundle, {
            expectedKeyId: 'cert-chain',
        });
        (0, globals_1.expect)(result.valid).toBe(true);
        (0, globals_1.expect)(result.chainValidated).toBe(true);
    });
    (0, globals_1.test)('emits timestamp tokens and verifies them', async () => {
        const pipeline = new index_js_1.CryptoPipeline({
            keyStore: new index_js_1.InMemoryKeyStore(),
            timestampingService: new MemoryTimestampingService(),
        });
        const { publicKey, privateKey } = node_crypto_1.default.generateKeyPairSync('ed25519');
        await pipeline.registerKeyVersion({
            id: 'ts-key',
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
        const bundle = await pipeline.signPayload('timestamped', 'ts-key', {
            includeTimestamp: true,
        });
        (0, globals_1.expect)(bundle.timestampToken).toBeDefined();
        const result = await pipeline.verifySignature('timestamped', bundle, {
            expectedKeyId: 'ts-key',
        });
        (0, globals_1.expect)(result.valid).toBe(true);
        (0, globals_1.expect)(result.timestampVerified).toBe(true);
    });
});
