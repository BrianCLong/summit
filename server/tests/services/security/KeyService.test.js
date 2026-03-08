"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
let KeyService;
(0, globals_1.beforeAll)(async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    process.env.NEO4J_PASSWORD = 'password';
    process.env.JWT_SECRET = 'x'.repeat(32);
    process.env.JWT_REFRESH_SECRET = 'y'.repeat(32);
    process.env.SESSION_SECRET = 'z'.repeat(32);
    process.env.ENCRYPTION_KEY =
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    ({ KeyService } = await Promise.resolve().then(() => __importStar(require('../../../src/services/security/KeyService.js'))));
});
describe('KeyService', () => {
    describe('generateApiKey', () => {
        it('should generate a key with correct prefix and hash', async () => {
            const { key, hash } = await KeyService.generateApiKey('test_sk');
            expect(key).toMatch(/^test_sk_/);
            expect(hash).toContain(':');
        });
    });
    describe('verifyKey', () => {
        it('should verify a valid key', async () => {
            const { key, hash } = await KeyService.generateApiKey();
            const isValid = await KeyService.verifyKey(key, hash);
            expect(isValid).toBe(true);
        });
        it('should reject an invalid key', async () => {
            const { hash } = await KeyService.generateApiKey();
            const isValid = await KeyService.verifyKey('wrong_key', hash);
            expect(isValid).toBe(false);
        });
    });
    describe('encrypt/decrypt', () => {
        it('should encrypt and decrypt a string', () => {
            const original = 'super-secret-api-key';
            const encrypted = KeyService.encrypt(original);
            expect(encrypted).not.toBe(original);
            expect(encrypted).toContain(':'); // IV:AuthTag:Ciphertext
            const decrypted = KeyService.decrypt(encrypted);
            expect(decrypted).toBe(original);
        });
    });
});
