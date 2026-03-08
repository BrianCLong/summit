"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
const NOW = new Date('2024-01-01T00:10:00Z');
(0, vitest_1.describe)('key ring rotation', () => {
    (0, vitest_1.beforeEach)(() => {
        process.env.KEY_ROTATION = '1';
        process.env.OLD_SIGNING_KEY = 'old-secret';
        process.env.CURRENT_SIGNING_KEY = 'current-secret';
    });
    (0, vitest_1.afterEach)(() => {
        delete process.env.KEY_ROTATION;
        delete process.env.OLD_SIGNING_KEY;
        delete process.env.CURRENT_SIGNING_KEY;
    });
    (0, vitest_1.it)('selects the newest key when rotation is enabled and preserves overlap', async () => {
        const manager = new index_js_1.ZeroTrustSecretsManager([
            new index_js_1.EnvironmentSecretsProvider(),
        ]);
        const definitions = [
            {
                kid: 'old',
                secret: { env: 'OLD_SIGNING_KEY', key: 'signing-key' },
                notBefore: new Date(NOW.getTime() - 20 * 60 * 1000),
                expiresAt: new Date(NOW.getTime() + 15 * 60 * 1000),
            },
            {
                kid: 'current',
                secret: { env: 'CURRENT_SIGNING_KEY', key: 'signing-key' },
                notBefore: new Date(NOW.getTime() - 30 * 1000),
            },
        ];
        const ring = await (0, index_js_1.buildKeyRing)(definitions, manager, {
            overlapSeconds: 300,
            now: NOW,
        });
        (0, vitest_1.expect)(ring.active.kid).toBe('current');
        const signed = (0, index_js_1.signTokenWithKeyRing)({ sub: '123', scope: ['read'] }, ring, { issuer: 'test' });
        const verified = (0, index_js_1.verifyTokenWithKeyRing)(signed, ring, {
            issuer: 'test',
            now: NOW,
        });
        (0, vitest_1.expect)(verified.sub).toBe('123');
        (0, vitest_1.expect)(verified.scope).toEqual(['read']);
        (0, vitest_1.expect)(verified.iss).toBe('test');
        const oldKey = ring.keys.find((key) => key.kid === 'old');
        const legacyToken = jsonwebtoken_1.default.sign({ sub: '123', iss: 'test' }, oldKey.secret, {
            algorithm: oldKey.algorithm,
            keyid: oldKey.kid,
            expiresIn: '10m',
        });
        const overlapVerification = (0, index_js_1.verifyTokenWithKeyRing)(legacyToken, ring, {
            issuer: 'test',
            now: new Date(NOW.getTime() + 2 * 60 * 1000),
        });
        (0, vitest_1.expect)(overlapVerification.sub).toBe('123');
        (0, vitest_1.expect)(() => (0, index_js_1.verifyTokenWithKeyRing)(legacyToken, ring, {
            issuer: 'test',
            now: new Date(NOW.getTime() + 10 * 60 * 1000),
        })).toThrow(/overlap/i);
    });
});
