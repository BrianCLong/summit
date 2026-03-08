"use strict";
/**
 * Hybrid Signature Tests
 * Tests for hybrid classical-quantum signature scheme
 */
Object.defineProperty(exports, "__esModule", { value: true });
const hybrid_signature_1 = require("../signatures/hybrid-signature");
const dilithium_1 = require("../algorithms/dilithium");
const types_1 = require("../types");
describe('HybridSignatureScheme', () => {
    describe('ECDSA-P256 + Dilithium3 (Default)', () => {
        let hybridSig;
        beforeEach(() => {
            hybridSig = new hybrid_signature_1.HybridSignatureScheme();
        });
        it('should generate hybrid key pair', async () => {
            const keyPair = await hybridSig.generateKeyPair();
            expect(keyPair).toHaveProperty('publicKey');
            expect(keyPair).toHaveProperty('privateKey');
            expect(keyPair.metadata?.hybrid).toBe(true);
            expect(keyPair.metadata?.classicalAlgorithm).toBe('ecdsa-p256');
        });
        it('should include both classical and quantum keys in hybrid key', async () => {
            const keyPair = await hybridSig.generateKeyPair();
            // Hybrid key starts with 4 bytes for classical key length
            expect(keyPair.publicKey.length).toBeGreaterThan(4);
            expect(keyPair.privateKey.length).toBeGreaterThan(4);
        });
        it('should sign message with hybrid signature', async () => {
            const keyPair = await hybridSig.generateKeyPair();
            const message = new TextEncoder().encode('Test message for hybrid signing');
            const signature = await hybridSig.sign(message, keyPair.privateKey);
            expect(signature).toHaveProperty('signature');
            expect(signature).toHaveProperty('algorithm');
            expect(signature.metadata?.hybrid).toBe(true);
            expect(signature.metadata?.classicalSignatureSize).toBeGreaterThan(0);
            expect(signature.metadata?.quantumSignatureSize).toBeGreaterThan(0);
        });
        it('should verify valid hybrid signature', async () => {
            const keyPair = await hybridSig.generateKeyPair();
            const message = new TextEncoder().encode('Test message');
            const { signature } = await hybridSig.sign(message, keyPair.privateKey);
            const isValid = await hybridSig.verify(message, signature, keyPair.publicKey);
            expect(isValid).toBe(true);
        });
        it('should report algorithm from quantum signer', () => {
            expect(hybridSig.getAlgorithm()).toBeDefined();
        });
        it('should report security level from quantum signer', () => {
            expect(hybridSig.getSecurityLevel()).toBeDefined();
        });
    });
    describe('ECDSA-P384 + Dilithium', () => {
        it('should work with P-384 classical algorithm', async () => {
            const hybridSig = new hybrid_signature_1.HybridSignatureScheme('ecdsa-p384');
            const keyPair = await hybridSig.generateKeyPair();
            expect(keyPair.metadata?.classicalAlgorithm).toBe('ecdsa-p384');
            const message = new TextEncoder().encode('Test');
            const { signature } = await hybridSig.sign(message, keyPair.privateKey);
            const isValid = await hybridSig.verify(message, signature, keyPair.publicKey);
            expect(isValid).toBe(true);
        });
    });
    describe('Custom Quantum Signer', () => {
        it('should work with Dilithium2', async () => {
            const dilithium2 = new dilithium_1.DilithiumSignature('dilithium2');
            const hybridSig = new hybrid_signature_1.HybridSignatureScheme('ecdsa-p256', dilithium2);
            const keyPair = await hybridSig.generateKeyPair();
            expect(keyPair.metadata?.quantumAlgorithm).toBe(dilithium2.getAlgorithm());
            const message = new TextEncoder().encode('Test');
            const { signature } = await hybridSig.sign(message, keyPair.privateKey);
            expect(signature.length).toBeGreaterThan(0);
        });
        it('should work with Dilithium5', async () => {
            const dilithium5 = new dilithium_1.DilithiumSignature('dilithium5');
            const hybridSig = new hybrid_signature_1.HybridSignatureScheme('ecdsa-p256', dilithium5);
            const keyPair = await hybridSig.generateKeyPair();
            expect(keyPair.metadata?.quantumAlgorithm).toBe(dilithium5.getAlgorithm());
        });
    });
    describe('createHybridSignature factory', () => {
        it('should create default hybrid signature', () => {
            const hybridSig = (0, hybrid_signature_1.createHybridSignature)();
            expect(hybridSig).toBeInstanceOf(hybrid_signature_1.HybridSignatureScheme);
        });
        it('should create hybrid signature with p256', () => {
            const hybridSig = (0, hybrid_signature_1.createHybridSignature)('ecdsa-p256');
            expect(hybridSig).toBeInstanceOf(hybrid_signature_1.HybridSignatureScheme);
        });
        it('should create hybrid signature with p384', () => {
            const hybridSig = (0, hybrid_signature_1.createHybridSignature)('ecdsa-p384');
            expect(hybridSig).toBeInstanceOf(hybrid_signature_1.HybridSignatureScheme);
        });
        it('should create with Level 2 security', () => {
            const hybridSig = (0, hybrid_signature_1.createHybridSignature)('ecdsa-p256', types_1.SecurityLevel.LEVEL_2);
            expect(hybridSig.getSecurityLevel()).toBe(types_1.SecurityLevel.LEVEL_2);
        });
        it('should create with Level 5 security', () => {
            const hybridSig = (0, hybrid_signature_1.createHybridSignature)('ecdsa-p256', types_1.SecurityLevel.LEVEL_5);
            expect(hybridSig.getSecurityLevel()).toBe(types_1.SecurityLevel.LEVEL_5);
        });
    });
    describe('Partial Verification', () => {
        it('should verify classical signature only', async () => {
            const hybridSig = new hybrid_signature_1.HybridSignatureScheme();
            const keyPair = await hybridSig.generateKeyPair();
            const message = new TextEncoder().encode('Test');
            const { signature } = await hybridSig.sign(message, keyPair.privateKey);
            const isValid = await hybridSig.verifyClassicalOnly(message, signature, keyPair.publicKey);
            expect(isValid).toBe(true);
        });
        it('should verify quantum signature only', async () => {
            const hybridSig = new hybrid_signature_1.HybridSignatureScheme();
            const keyPair = await hybridSig.generateKeyPair();
            const message = new TextEncoder().encode('Test');
            const { signature } = await hybridSig.sign(message, keyPair.privateKey);
            const isValid = await hybridSig.verifyQuantumOnly(message, signature, keyPair.publicKey);
            expect(isValid).toBe(true);
        });
    });
    describe('Key Uniqueness', () => {
        it('should generate unique hybrid key pairs', async () => {
            const hybridSig = new hybrid_signature_1.HybridSignatureScheme();
            const keyPairs = await Promise.all(Array.from({ length: 5 }, () => hybridSig.generateKeyPair()));
            const publicKeyHexes = keyPairs.map((kp) => Array.from(kp.publicKey)
                .map((b) => b.toString(16).padStart(2, '0'))
                .join(''));
            const uniqueKeys = new Set(publicKeyHexes);
            expect(uniqueKeys.size).toBe(5);
        });
    });
    describe('Defense in Depth', () => {
        it('should combine both classical and quantum signatures', async () => {
            const hybridSig = new hybrid_signature_1.HybridSignatureScheme();
            const keyPair = await hybridSig.generateKeyPair();
            const message = new TextEncoder().encode('Test');
            const signature = await hybridSig.sign(message, keyPair.privateKey);
            // Verify the signature contains both components
            // First 4 bytes are the length of classical signature
            const view = new DataView(signature.signature.buffer, signature.signature.byteOffset);
            const classicalSigLength = view.getUint32(0, false);
            // ECDSA P-256 signature is 64 bytes
            expect(classicalSigLength).toBe(64);
            // The rest should be the Dilithium signature (3293 bytes for dilithium3)
            const quantumSigLength = signature.signature.length - 4 - classicalSigLength;
            expect(quantumSigLength).toBe(3293);
        });
    });
});
