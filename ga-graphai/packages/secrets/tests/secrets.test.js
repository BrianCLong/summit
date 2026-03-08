"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
const DAY_MS = 24 * 60 * 60 * 1000;
(0, vitest_1.describe)('ZeroTrustSecretsManager', () => {
    (0, vitest_1.it)('resolves secrets through the Vault JWT adapter', async () => {
        const calls = [];
        const provider = new index_js_1.VaultJwtSecretsProvider({
            baseUrl: 'https://vault.example',
            role: 'graphai',
            jwt: 'jwt-token',
            httpClient: async (url, init) => {
                calls.push(url);
                if (url.includes('/auth/jwt/login')) {
                    return {
                        status: 200,
                        json: async () => ({
                            auth: { client_token: 'vault-token', lease_duration: 60 },
                        }),
                    };
                }
                return {
                    status: 200,
                    json: async () => ({
                        data: {
                            data: { password: 's3cr3t' },
                            metadata: { version: 2 },
                        },
                    }),
                };
            },
        });
        const manager = new index_js_1.ZeroTrustSecretsManager([provider]);
        const secret = await manager.resolve({ vault: 'vault://kv/db', key: 'password' });
        (0, vitest_1.expect)(secret.value).toBe('s3cr3t');
        (0, vitest_1.expect)(secret.version).toBe('2');
        (0, vitest_1.expect)(calls.some((call) => call.includes('/auth/jwt/login'))).toBe(true);
    });
    (0, vitest_1.it)('rotates an AWS KMS envelope secret and updates rotation metadata', async () => {
        const dataKey = (0, node_crypto_1.randomBytes)(32);
        const ciphertext = (0, index_js_1.buildEnvelopeCiphertext)(Buffer.from('encrypted-key'), dataKey, 'very-secret');
        const kmsProvider = new index_js_1.AwsKmsEnvelopeProvider({
            decrypt: async () => ({ Plaintext: dataKey }),
            generateDataKey: async () => ({
                CiphertextBlob: Buffer.from('new-key'),
                Plaintext: (0, node_crypto_1.randomBytes)(32),
            }),
        });
        const manager = new index_js_1.ZeroTrustSecretsManager([kmsProvider]);
        const ref = {
            provider: 'kms',
            key: 'db/password',
            keyId: 'alias/db',
            ciphertext,
            rotation: {
                intervalDays: 30,
                lastRotated: new Date(Date.now() - 45 * DAY_MS).toISOString(),
            },
        };
        const rotated = await manager.rotate(ref);
        (0, vitest_1.expect)(rotated.value).toBe('very-secret');
        (0, vitest_1.expect)(rotated.updatedRef?.ciphertext).not.toBe(ciphertext);
        (0, vitest_1.expect)(rotated.rotation?.needsRotation).toBe(false);
        (0, vitest_1.expect)(rotated.updatedRef?.rotation?.lastRotated).toBeDefined();
    });
});
(0, vitest_1.describe)('computeRotationStatus', () => {
    (0, vitest_1.it)('marks secrets without policy as needing rotation', () => {
        const status = (0, index_js_1.computeRotationStatus)(undefined);
        (0, vitest_1.expect)(status.needsRotation).toBe(true);
        (0, vitest_1.expect)(status.reason).toBe('rotation policy missing');
    });
    (0, vitest_1.it)('detects overdue rotation based on interval', () => {
        const now = new Date();
        const status = (0, index_js_1.computeRotationStatus)({
            intervalDays: 15,
            lastRotated: new Date(now.getTime() - 20 * DAY_MS).toISOString(),
        }, now);
        (0, vitest_1.expect)(status.needsRotation).toBe(true);
    });
});
