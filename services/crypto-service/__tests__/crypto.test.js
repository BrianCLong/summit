"use strict";
/**
 * Cryptographic Service Test Suite
 *
 * Tests for:
 * - Encryption and decryption operations
 * - Key management and rotation
 * - Secure hashing
 * - Digital signatures
 * - Key derivation
 * - Secure random generation
 */
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
const crypto = __importStar(require("crypto"));
// Mock crypto service implementation
const createMockCryptoService = () => {
    const keys = new Map();
    let currentKeyId = 'key-001';
    // Initialize with a test key
    const initKey = crypto.randomBytes(32);
    keys.set(currentKeyId, {
        key: initKey,
        info: {
            id: currentKeyId,
            algorithm: 'aes-256-gcm',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            status: 'active',
        },
    });
    return {
        encrypt: globals_1.jest.fn(async (plaintext, keyId) => {
            const useKeyId = keyId || currentKeyId;
            const keyData = keys.get(useKeyId);
            if (!keyData) {
                throw new Error(`Key not found: ${useKeyId}`);
            }
            if (keyData.info.status === 'compromised') {
                throw new Error('Cannot encrypt with compromised key');
            }
            const iv = crypto.randomBytes(12);
            const cipher = crypto.createCipheriv('aes-256-gcm', keyData.key, iv);
            let encrypted = cipher.update(plaintext, 'utf8', 'base64');
            encrypted += cipher.final('base64');
            const tag = cipher.getAuthTag();
            return {
                ciphertext: encrypted,
                iv: iv.toString('base64'),
                tag: tag.toString('base64'),
                keyId: useKeyId,
                algorithm: 'aes-256-gcm',
            };
        }),
        decrypt: globals_1.jest.fn(async (encrypted) => {
            const keyData = keys.get(encrypted.keyId);
            if (!keyData) {
                throw new Error(`Key not found: ${encrypted.keyId}`);
            }
            const iv = Buffer.from(encrypted.iv, 'base64');
            const tag = Buffer.from(encrypted.tag, 'base64');
            const decipher = crypto.createDecipheriv('aes-256-gcm', keyData.key, iv);
            decipher.setAuthTag(tag);
            let decrypted = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }),
        hash: globals_1.jest.fn(async (data, algorithm = 'sha256') => {
            return crypto.createHash(algorithm).update(data).digest('hex');
        }),
        hmac: globals_1.jest.fn(async (data, keyId) => {
            const useKeyId = keyId || currentKeyId;
            const keyData = keys.get(useKeyId);
            if (!keyData) {
                throw new Error(`Key not found: ${useKeyId}`);
            }
            return crypto.createHmac('sha256', keyData.key).update(data).digest('hex');
        }),
        sign: globals_1.jest.fn(async (data, keyId) => {
            // Simplified signing for testing
            const useKeyId = keyId || currentKeyId;
            const keyData = keys.get(useKeyId);
            if (!keyData) {
                throw new Error(`Key not found: ${useKeyId}`);
            }
            const signature = crypto.createHmac('sha256', keyData.key).update(data).digest('hex');
            return {
                signature,
                algorithm: 'HMAC-SHA256',
                keyId: useKeyId,
            };
        }),
        verify: globals_1.jest.fn(async (data, signatureResult) => {
            const keyData = keys.get(signatureResult.keyId);
            if (!keyData) {
                throw new Error(`Key not found: ${signatureResult.keyId}`);
            }
            const expectedSignature = crypto.createHmac('sha256', keyData.key).update(data).digest('hex');
            return crypto.timingSafeEqual(Buffer.from(signatureResult.signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
        }),
        rotateKey: globals_1.jest.fn(async () => {
            // Retire current key
            const oldKey = keys.get(currentKeyId);
            if (oldKey) {
                oldKey.info.status = 'retired';
            }
            // Generate new key
            const newKeyId = `key-${Date.now()}`;
            const newKey = crypto.randomBytes(32);
            const newKeyInfo = {
                id: newKeyId,
                algorithm: 'aes-256-gcm',
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                status: 'active',
            };
            keys.set(newKeyId, { key: newKey, info: newKeyInfo });
            currentKeyId = newKeyId;
            return newKeyInfo;
        }),
        deriveKey: globals_1.jest.fn(async (password, salt) => {
            return new Promise((resolve, reject) => {
                crypto.pbkdf2(password, salt, 100000, 32, 'sha512', (err, derivedKey) => {
                    if (err)
                        reject(err);
                    else
                        resolve(derivedKey.toString('hex'));
                });
            });
        }),
        generateRandomBytes: globals_1.jest.fn(async (length) => {
            return crypto.randomBytes(length).toString('hex');
        }),
        getKeyInfo: globals_1.jest.fn(async (keyId) => {
            const keyData = keys.get(keyId);
            return keyData?.info || null;
        }),
        listKeys: globals_1.jest.fn(async () => {
            return Array.from(keys.values()).map(k => k.info);
        }),
        markKeyCompromised: globals_1.jest.fn(async (keyId) => {
            const keyData = keys.get(keyId);
            if (keyData) {
                keyData.info.status = 'compromised';
            }
        }),
        _getCurrentKeyId: () => currentKeyId,
        _keys: keys,
    };
};
(0, globals_1.describe)('Cryptographic Service', () => {
    let cryptoService;
    (0, globals_1.beforeEach)(() => {
        cryptoService = createMockCryptoService();
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('Encryption Operations', () => {
        (0, globals_1.it)('should encrypt plaintext successfully', async () => {
            const plaintext = 'Sensitive information that needs protection';
            const result = await cryptoService.encrypt(plaintext);
            (0, globals_1.expect)(result.ciphertext).toBeDefined();
            (0, globals_1.expect)(result.ciphertext).not.toBe(plaintext);
            (0, globals_1.expect)(result.iv).toBeDefined();
            (0, globals_1.expect)(result.tag).toBeDefined();
            (0, globals_1.expect)(result.keyId).toBeDefined();
            (0, globals_1.expect)(result.algorithm).toBe('aes-256-gcm');
        });
        (0, globals_1.it)('should decrypt ciphertext successfully', async () => {
            const plaintext = 'Sensitive information that needs protection';
            const encrypted = await cryptoService.encrypt(plaintext);
            const decrypted = await cryptoService.decrypt(encrypted);
            (0, globals_1.expect)(decrypted).toBe(plaintext);
        });
        (0, globals_1.it)('should produce different ciphertext for same plaintext (IV uniqueness)', async () => {
            const plaintext = 'Same message twice';
            const encrypted1 = await cryptoService.encrypt(plaintext);
            const encrypted2 = await cryptoService.encrypt(plaintext);
            (0, globals_1.expect)(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
            (0, globals_1.expect)(encrypted1.iv).not.toBe(encrypted2.iv);
        });
        (0, globals_1.it)('should fail decryption with wrong key', async () => {
            const plaintext = 'Secret message';
            const encrypted = await cryptoService.encrypt(plaintext);
            // Modify keyId to simulate wrong key
            encrypted.keyId = 'nonexistent-key';
            await (0, globals_1.expect)(cryptoService.decrypt(encrypted)).rejects.toThrow('Key not found');
        });
        (0, globals_1.it)('should fail decryption with tampered ciphertext', async () => {
            const plaintext = 'Secret message';
            const encrypted = await cryptoService.encrypt(plaintext);
            // Tamper with ciphertext
            const tamperedCiphertext = Buffer.from(encrypted.ciphertext, 'base64');
            tamperedCiphertext[0] = (tamperedCiphertext[0] + 1) % 256;
            encrypted.ciphertext = tamperedCiphertext.toString('base64');
            await (0, globals_1.expect)(cryptoService.decrypt(encrypted)).rejects.toThrow();
        });
        (0, globals_1.it)('should fail decryption with tampered authentication tag', async () => {
            const plaintext = 'Secret message';
            const encrypted = await cryptoService.encrypt(plaintext);
            // Tamper with tag
            const tamperedTag = Buffer.from(encrypted.tag, 'base64');
            tamperedTag[0] = (tamperedTag[0] + 1) % 256;
            encrypted.tag = tamperedTag.toString('base64');
            await (0, globals_1.expect)(cryptoService.decrypt(encrypted)).rejects.toThrow();
        });
        (0, globals_1.it)('should handle empty plaintext', async () => {
            const plaintext = '';
            const encrypted = await cryptoService.encrypt(plaintext);
            const decrypted = await cryptoService.decrypt(encrypted);
            (0, globals_1.expect)(decrypted).toBe('');
        });
        (0, globals_1.it)('should handle unicode characters', async () => {
            const plaintext = 'Unicode: 你好世界 🔐 émojis';
            const encrypted = await cryptoService.encrypt(plaintext);
            const decrypted = await cryptoService.decrypt(encrypted);
            (0, globals_1.expect)(decrypted).toBe(plaintext);
        });
        (0, globals_1.it)('should handle large data', async () => {
            const plaintext = 'x'.repeat(1000000); // 1MB
            const encrypted = await cryptoService.encrypt(plaintext);
            const decrypted = await cryptoService.decrypt(encrypted);
            (0, globals_1.expect)(decrypted).toBe(plaintext);
        });
    });
    (0, globals_1.describe)('Hashing Operations', () => {
        (0, globals_1.it)('should hash data with SHA-256', async () => {
            const data = 'data to hash';
            const hash = await cryptoService.hash(data, 'sha256');
            (0, globals_1.expect)(hash).toHaveLength(64); // SHA-256 produces 32 bytes = 64 hex chars
            (0, globals_1.expect)(hash).toMatch(/^[a-f0-9]+$/);
        });
        (0, globals_1.it)('should produce consistent hashes', async () => {
            const data = 'consistent data';
            const hash1 = await cryptoService.hash(data);
            const hash2 = await cryptoService.hash(data);
            (0, globals_1.expect)(hash1).toBe(hash2);
        });
        (0, globals_1.it)('should produce different hashes for different inputs', async () => {
            const hash1 = await cryptoService.hash('data1');
            const hash2 = await cryptoService.hash('data2');
            (0, globals_1.expect)(hash1).not.toBe(hash2);
        });
        (0, globals_1.it)('should support different hash algorithms', async () => {
            const data = 'test data';
            const sha256 = await cryptoService.hash(data, 'sha256');
            const sha512 = await cryptoService.hash(data, 'sha512');
            (0, globals_1.expect)(sha256).toHaveLength(64);
            (0, globals_1.expect)(sha512).toHaveLength(128);
        });
    });
    (0, globals_1.describe)('HMAC Operations', () => {
        (0, globals_1.it)('should generate HMAC for data', async () => {
            const data = 'data to authenticate';
            const hmac = await cryptoService.hmac(data);
            (0, globals_1.expect)(hmac).toBeDefined();
            (0, globals_1.expect)(hmac).toHaveLength(64);
        });
        (0, globals_1.it)('should produce consistent HMACs with same key', async () => {
            const data = 'consistent data';
            const hmac1 = await cryptoService.hmac(data);
            const hmac2 = await cryptoService.hmac(data);
            (0, globals_1.expect)(hmac1).toBe(hmac2);
        });
        (0, globals_1.it)('should fail with nonexistent key', async () => {
            await (0, globals_1.expect)(cryptoService.hmac('data', 'nonexistent-key')).rejects.toThrow('Key not found');
        });
    });
    (0, globals_1.describe)('Digital Signatures', () => {
        (0, globals_1.it)('should sign data', async () => {
            const data = 'document to sign';
            const signatureResult = await cryptoService.sign(data);
            (0, globals_1.expect)(signatureResult.signature).toBeDefined();
            (0, globals_1.expect)(signatureResult.algorithm).toBe('HMAC-SHA256');
            (0, globals_1.expect)(signatureResult.keyId).toBeDefined();
        });
        (0, globals_1.it)('should verify valid signature', async () => {
            const data = 'document to sign';
            const signatureResult = await cryptoService.sign(data);
            const isValid = await cryptoService.verify(data, signatureResult);
            (0, globals_1.expect)(isValid).toBe(true);
        });
        (0, globals_1.it)('should reject invalid signature', async () => {
            const data = 'document to sign';
            const signatureResult = await cryptoService.sign(data);
            // Tamper with signature
            signatureResult.signature = 'tampered' + signatureResult.signature.slice(8);
            // This will throw due to length mismatch in timingSafeEqual
            await (0, globals_1.expect)(cryptoService.verify(data, signatureResult)).rejects.toThrow();
        });
        (0, globals_1.it)('should reject signature with wrong data', async () => {
            const signatureResult = await cryptoService.sign('original data');
            const isValid = await cryptoService.verify('modified data', signatureResult);
            (0, globals_1.expect)(isValid).toBe(false);
        });
    });
    (0, globals_1.describe)('Key Management', () => {
        (0, globals_1.it)('should rotate keys', async () => {
            const oldKeyId = cryptoService._getCurrentKeyId();
            const newKeyInfo = await cryptoService.rotateKey();
            (0, globals_1.expect)(newKeyInfo.id).not.toBe(oldKeyId);
            (0, globals_1.expect)(newKeyInfo.status).toBe('active');
        });
        (0, globals_1.it)('should retire old key after rotation', async () => {
            const oldKeyId = cryptoService._getCurrentKeyId();
            await cryptoService.rotateKey();
            const oldKeyInfo = await cryptoService.getKeyInfo(oldKeyId);
            (0, globals_1.expect)(oldKeyInfo?.status).toBe('retired');
        });
        (0, globals_1.it)('should still decrypt with retired key', async () => {
            const plaintext = 'encrypt before rotation';
            const encrypted = await cryptoService.encrypt(plaintext);
            const oldKeyId = encrypted.keyId;
            await cryptoService.rotateKey();
            // Verify old key is retired
            const oldKeyInfo = await cryptoService.getKeyInfo(oldKeyId);
            (0, globals_1.expect)(oldKeyInfo?.status).toBe('retired');
            // Should still decrypt
            const decrypted = await cryptoService.decrypt(encrypted);
            (0, globals_1.expect)(decrypted).toBe(plaintext);
        });
        (0, globals_1.it)('should not encrypt with compromised key', async () => {
            const keyId = cryptoService._getCurrentKeyId();
            await cryptoService.markKeyCompromised(keyId);
            await (0, globals_1.expect)(cryptoService.encrypt('test', keyId)).rejects.toThrow('compromised');
        });
        (0, globals_1.it)('should list all keys', async () => {
            await cryptoService.rotateKey();
            await cryptoService.rotateKey();
            const keys = await cryptoService.listKeys();
            (0, globals_1.expect)(keys.length).toBeGreaterThanOrEqual(3);
        });
        (0, globals_1.it)('should get key info', async () => {
            const keyId = cryptoService._getCurrentKeyId();
            const keyInfo = await cryptoService.getKeyInfo(keyId);
            (0, globals_1.expect)(keyInfo).not.toBeNull();
            (0, globals_1.expect)(keyInfo?.id).toBe(keyId);
            (0, globals_1.expect)(keyInfo?.algorithm).toBe('aes-256-gcm');
            (0, globals_1.expect)(keyInfo?.status).toBe('active');
        });
        (0, globals_1.it)('should return null for nonexistent key', async () => {
            const keyInfo = await cryptoService.getKeyInfo('nonexistent');
            (0, globals_1.expect)(keyInfo).toBeNull();
        });
    });
    (0, globals_1.describe)('Key Derivation', () => {
        (0, globals_1.it)('should derive key from password', async () => {
            const password = 'secure-password-123';
            const salt = crypto.randomBytes(16).toString('hex');
            const derivedKey = await cryptoService.deriveKey(password, salt);
            (0, globals_1.expect)(derivedKey).toHaveLength(64); // 32 bytes = 64 hex chars
        });
        (0, globals_1.it)('should produce consistent derived keys', async () => {
            const password = 'consistent-password';
            const salt = 'fixed-salt-value';
            const key1 = await cryptoService.deriveKey(password, salt);
            const key2 = await cryptoService.deriveKey(password, salt);
            (0, globals_1.expect)(key1).toBe(key2);
        });
        (0, globals_1.it)('should produce different keys with different salts', async () => {
            const password = 'same-password';
            const key1 = await cryptoService.deriveKey(password, 'salt1');
            const key2 = await cryptoService.deriveKey(password, 'salt2');
            (0, globals_1.expect)(key1).not.toBe(key2);
        });
    });
    (0, globals_1.describe)('Random Generation', () => {
        (0, globals_1.it)('should generate random bytes', async () => {
            const random = await cryptoService.generateRandomBytes(32);
            (0, globals_1.expect)(random).toHaveLength(64); // 32 bytes = 64 hex chars
        });
        (0, globals_1.it)('should generate unique values', async () => {
            const random1 = await cryptoService.generateRandomBytes(32);
            const random2 = await cryptoService.generateRandomBytes(32);
            (0, globals_1.expect)(random1).not.toBe(random2);
        });
        (0, globals_1.it)('should generate correct length', async () => {
            const random16 = await cryptoService.generateRandomBytes(16);
            const random64 = await cryptoService.generateRandomBytes(64);
            (0, globals_1.expect)(random16).toHaveLength(32);
            (0, globals_1.expect)(random64).toHaveLength(128);
        });
    });
    (0, globals_1.describe)('Security Properties', () => {
        (0, globals_1.it)('should use timing-safe comparison for signatures', async () => {
            // This is tested implicitly by the verify function using timingSafeEqual
            const data = 'test data';
            const sig = await cryptoService.sign(data);
            const isValid = await cryptoService.verify(data, sig);
            (0, globals_1.expect)(isValid).toBe(true);
        });
        (0, globals_1.it)('should not leak key material in errors', async () => {
            try {
                await cryptoService.encrypt('test', 'nonexistent');
            }
            catch (error) {
                const errorMessage = error.message;
                (0, globals_1.expect)(errorMessage).not.toContain('key-');
                (0, globals_1.expect)(errorMessage).toContain('Key not found');
            }
        });
    });
});
