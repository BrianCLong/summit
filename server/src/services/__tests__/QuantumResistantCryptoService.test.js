"use strict";
// @ts-nocheck
/**
 * Quantum-Resistant Crypto Service Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const QuantumResistantCryptoService_js_1 = require("../QuantumResistantCryptoService.js");
(0, globals_1.describe)('QuantumResistantCryptoService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = new QuantumResistantCryptoService_js_1.QuantumResistantCryptoService();
    });
    (0, globals_1.describe)('Key Generation', () => {
        (0, globals_1.it)('should generate a Kyber-768 key pair', async () => {
            const key = await service.generateKeyPair('kyber-768');
            (0, globals_1.expect)(key).toHaveProperty('keyId');
            (0, globals_1.expect)(key).toHaveProperty('publicKey');
            (0, globals_1.expect)(key).toHaveProperty('privateKey');
            (0, globals_1.expect)(key).toHaveProperty('createdAt');
        });
        (0, globals_1.it)('should generate key with custom keyId', async () => {
            const customKeyId = 'my-custom-key-id';
            const key = await service.generateKeyPair('kyber-768', {
                keyId: customKeyId,
            });
            (0, globals_1.expect)(key.keyId).toBe(customKeyId);
        });
        (0, globals_1.it)('should generate key with expiration', async () => {
            const key = await service.generateKeyPair('kyber-768', {
                expiresInDays: 30,
            });
            (0, globals_1.expect)(key.expiresAt).toBeDefined();
            (0, globals_1.expect)(key.expiresAt.getTime()).toBeGreaterThan(Date.now());
        });
        (0, globals_1.it)('should generate hybrid key pair', async () => {
            const key = await service.generateHybridKeyPair();
            (0, globals_1.expect)(key).toHaveProperty('keyId');
            (0, globals_1.expect)(key.metadata?.hybrid).toBe(true);
        });
    });
    (0, globals_1.describe)('Key Store', () => {
        (0, globals_1.it)('should retrieve a key by ID', async () => {
            const generated = await service.generateKeyPair('kyber-768');
            const retrieved = service.getKey(generated.keyId);
            (0, globals_1.expect)(retrieved).toBeDefined();
            (0, globals_1.expect)(retrieved?.keyId).toBe(generated.keyId);
        });
        (0, globals_1.it)('should return undefined for non-existent key', () => {
            const key = service.getKey('non-existent-key');
            (0, globals_1.expect)(key).toBeUndefined();
        });
        (0, globals_1.it)('should list all keys', async () => {
            await service.generateKeyPair('kyber-768');
            await service.generateKeyPair('kyber-768');
            const keys = service.listKeys();
            (0, globals_1.expect)(keys.length).toBeGreaterThanOrEqual(2);
        });
        (0, globals_1.it)('should delete a key', async () => {
            const key = await service.generateKeyPair('kyber-768');
            const deleted = service.deleteKey(key.keyId);
            (0, globals_1.expect)(deleted).toBe(true);
            (0, globals_1.expect)(service.getKey(key.keyId)).toBeUndefined();
        });
        (0, globals_1.it)('should get public key only', async () => {
            const key = await service.generateKeyPair('kyber-768');
            const publicKey = service.getPublicKey(key.keyId);
            (0, globals_1.expect)(publicKey).toBeDefined();
            (0, globals_1.expect)(publicKey).toBeInstanceOf(Uint8Array);
        });
    });
    (0, globals_1.describe)('KEM Operations', () => {
        (0, globals_1.it)('should encapsulate with valid key', async () => {
            const key = await service.generateKeyPair('kyber-768');
            const result = await service.encapsulate(key.keyId);
            (0, globals_1.expect)(result).toHaveProperty('ciphertext');
            (0, globals_1.expect)(result).toHaveProperty('sharedSecret');
        });
        (0, globals_1.it)('should decapsulate with valid inputs', async () => {
            const key = await service.generateKeyPair('kyber-768');
            const { ciphertext } = await service.encapsulate(key.keyId);
            const sharedSecret = await service.decapsulate(key.keyId, ciphertext);
            (0, globals_1.expect)(sharedSecret).toBeInstanceOf(Uint8Array);
        });
        (0, globals_1.it)('should throw error for non-existent key', async () => {
            await (0, globals_1.expect)(service.encapsulate('non-existent')).rejects.toThrow(/Key not found/);
        });
    });
    (0, globals_1.describe)('Signature Operations', () => {
        (0, globals_1.it)('should sign message', async () => {
            const key = await service.generateKeyPair('dilithium-3');
            const message = new TextEncoder().encode('Test message');
            const signature = await service.sign(key.keyId, message);
            (0, globals_1.expect)(signature).toHaveProperty('signature');
            (0, globals_1.expect)(signature).toHaveProperty('algorithm');
        });
        (0, globals_1.it)('should verify signature', async () => {
            const key = await service.generateKeyPair('dilithium-3');
            const message = new TextEncoder().encode('Test message');
            const { signature } = await service.sign(key.keyId, message);
            const isValid = await service.verify(key.keyId, message, signature);
            (0, globals_1.expect)(isValid).toBe(true);
        });
    });
    (0, globals_1.describe)('Key Rotation', () => {
        (0, globals_1.it)('should rotate a key', async () => {
            const oldKey = await service.generateKeyPair('kyber-768');
            const newKey = await service.rotateKey(oldKey.keyId);
            (0, globals_1.expect)(newKey.keyId).not.toBe(oldKey.keyId);
            (0, globals_1.expect)(newKey.metadata?.rotatedFrom).toBe(oldKey.keyId);
        });
        (0, globals_1.it)('should throw error when rotating non-existent key', async () => {
            await (0, globals_1.expect)(service.rotateKey('non-existent')).rejects.toThrow(/Key not found/);
        });
    });
    (0, globals_1.describe)('Validation and Benchmarking', () => {
        (0, globals_1.it)('should validate algorithm', async () => {
            const isValid = await service.validateAlgorithm('kyber-768');
            (0, globals_1.expect)(isValid).toBe(true);
        });
        (0, globals_1.it)('should benchmark algorithm', async () => {
            const results = await service.benchmarkAlgorithm('kyber-768');
            (0, globals_1.expect)(typeof results).toBe('string');
        });
    });
    (0, globals_1.describe)('Risk Assessment', () => {
        (0, globals_1.it)('should generate quantum risk report', async () => {
            const report = await service.getQuantumRiskReport();
            (0, globals_1.expect)(report).toHaveProperty('timestamp');
            (0, globals_1.expect)(report).toHaveProperty('vulnerableAssets');
            (0, globals_1.expect)(report).toHaveProperty('migratedAssets');
            (0, globals_1.expect)(report).toHaveProperty('recommendations');
            (0, globals_1.expect)(report).toHaveProperty('overallRiskLevel');
        });
    });
    (0, globals_1.describe)('Statistics', () => {
        (0, globals_1.it)('should return service statistics', async () => {
            await service.generateKeyPair('kyber-768');
            const stats = service.getStatistics();
            (0, globals_1.expect)(stats).toHaveProperty('totalKeys');
            (0, globals_1.expect)(stats).toHaveProperty('keysByAlgorithm');
            (0, globals_1.expect)(stats).toHaveProperty('operations');
            (0, globals_1.expect)(stats).toHaveProperty('recentOperations');
        });
    });
    (0, globals_1.describe)('Supported Algorithms', () => {
        (0, globals_1.it)('should return supported algorithms', () => {
            const algorithms = service.getSupportedAlgorithms();
            (0, globals_1.expect)(algorithms).toHaveProperty('kem');
            (0, globals_1.expect)(algorithms).toHaveProperty('signature');
            (0, globals_1.expect)(algorithms.kem.length).toBeGreaterThan(0);
            (0, globals_1.expect)(algorithms.signature.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Event Emission', () => {
        (0, globals_1.it)('should emit keyGenerated event', async () => {
            const listener = globals_1.jest.fn();
            service.on('keyGenerated', listener);
            await service.generateKeyPair('kyber-768');
            (0, globals_1.expect)(listener).toHaveBeenCalled();
        });
        (0, globals_1.it)('should emit keyDeleted event', async () => {
            const listener = globals_1.jest.fn();
            service.on('keyDeleted', listener);
            const key = await service.generateKeyPair('kyber-768');
            service.deleteKey(key.keyId);
            (0, globals_1.expect)(listener).toHaveBeenCalled();
        });
        (0, globals_1.it)('should emit keyRotated event', async () => {
            const listener = globals_1.jest.fn();
            service.on('keyRotated', listener);
            const key = await service.generateKeyPair('kyber-768');
            await service.rotateKey(key.keyId);
            (0, globals_1.expect)(listener).toHaveBeenCalled();
        });
    });
});
