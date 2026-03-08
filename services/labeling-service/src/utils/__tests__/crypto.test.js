"use strict";
/**
 * Unit tests for cryptographic utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_js_1 = require("../crypto.js");
describe('crypto utilities', () => {
    describe('Key Generation', () => {
        it('should generate a valid key pair', async () => {
            const keyPair = await (0, crypto_js_1.generateKeyPair)();
            expect(keyPair.privateKey).toBeDefined();
            expect(keyPair.publicKey).toBeDefined();
            expect(keyPair.privateKey.length).toBeGreaterThan(0);
            expect(keyPair.publicKey.length).toBeGreaterThan(0);
        });
        it('should generate unique key pairs', async () => {
            const keyPair1 = await (0, crypto_js_1.generateKeyPair)();
            const keyPair2 = await (0, crypto_js_1.generateKeyPair)();
            expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey);
            expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
        });
    });
    describe('Signing and Verification', () => {
        it('should sign and verify data correctly', async () => {
            const keyPair = await (0, crypto_js_1.generateKeyPair)();
            const data = { foo: 'bar', num: 123 };
            const signature = await (0, crypto_js_1.signData)(data, keyPair.privateKey);
            const isValid = await (0, crypto_js_1.verifySignature)(data, signature, keyPair.publicKey);
            expect(signature).toBeDefined();
            expect(signature.length).toBeGreaterThan(0);
            expect(isValid).toBe(true);
        });
        it('should fail verification with tampered data', async () => {
            const keyPair = await (0, crypto_js_1.generateKeyPair)();
            const data = { foo: 'bar' };
            const tamperedData = { foo: 'baz' };
            const signature = await (0, crypto_js_1.signData)(data, keyPair.privateKey);
            const isValid = await (0, crypto_js_1.verifySignature)(tamperedData, signature, keyPair.publicKey);
            expect(isValid).toBe(false);
        });
        it('should fail verification with wrong public key', async () => {
            const keyPair1 = await (0, crypto_js_1.generateKeyPair)();
            const keyPair2 = await (0, crypto_js_1.generateKeyPair)();
            const data = { foo: 'bar' };
            const signature = await (0, crypto_js_1.signData)(data, keyPair1.privateKey);
            const isValid = await (0, crypto_js_1.verifySignature)(data, signature, keyPair2.publicKey);
            expect(isValid).toBe(false);
        });
        it('should produce deterministic signatures for same data', async () => {
            const keyPair = await (0, crypto_js_1.generateKeyPair)();
            const data = { b: 2, a: 1 }; // Different order
            const signature1 = await (0, crypto_js_1.signData)(data, keyPair.privateKey);
            const signature2 = await (0, crypto_js_1.signData)({ a: 1, b: 2 }, keyPair.privateKey);
            // Signatures should be the same because data is sorted before signing
            expect(signature1).toBe(signature2);
        });
    });
    describe('Hashing', () => {
        it('should generate consistent hashes', () => {
            const data = { foo: 'bar', num: 123 };
            const hash1 = (0, crypto_js_1.generateHash)(data);
            const hash2 = (0, crypto_js_1.generateHash)(data);
            expect(hash1).toBe(hash2);
            expect(hash1.length).toBe(64); // SHA-256 produces 64 hex characters
        });
        it('should generate deterministic hashes regardless of key order', () => {
            const data1 = { b: 2, a: 1 };
            const data2 = { a: 1, b: 2 };
            const hash1 = (0, crypto_js_1.generateHash)(data1);
            const hash2 = (0, crypto_js_1.generateHash)(data2);
            expect(hash1).toBe(hash2);
        });
        it('should generate different hashes for different data', () => {
            const data1 = { foo: 'bar' };
            const data2 = { foo: 'baz' };
            const hash1 = (0, crypto_js_1.generateHash)(data1);
            const hash2 = (0, crypto_js_1.generateHash)(data2);
            expect(hash1).not.toBe(hash2);
        });
    });
    describe('Checksums', () => {
        it('should generate checksums for different content types', () => {
            const stringContent = 'Hello, world!';
            const bufferContent = Buffer.from('Hello, world!');
            const objectContent = { message: 'Hello, world!' };
            const stringChecksum = (0, crypto_js_1.generateChecksum)(stringContent);
            const bufferChecksum = (0, crypto_js_1.generateChecksum)(bufferContent);
            const objectChecksum = (0, crypto_js_1.generateChecksum)(objectContent);
            expect(stringChecksum).toBeDefined();
            expect(bufferChecksum).toBeDefined();
            expect(objectChecksum).toBeDefined();
            expect(stringChecksum.length).toBe(64);
        });
        it('should use different algorithms', () => {
            const content = 'test';
            const sha256 = (0, crypto_js_1.generateChecksum)(content, 'sha256');
            const sha512 = (0, crypto_js_1.generateChecksum)(content, 'sha512');
            expect(sha256.length).toBe(64);
            expect(sha512.length).toBe(128);
        });
    });
    describe('Merkle Tree', () => {
        it('should compute correct merkle root for single hash', () => {
            const hashes = ['abc123'];
            const root = (0, crypto_js_1.computeMerkleRoot)(hashes);
            expect(root).toBe('abc123');
        });
        it('should compute merkle root for multiple hashes', () => {
            const hashes = ['hash1', 'hash2', 'hash3', 'hash4'];
            const root = (0, crypto_js_1.computeMerkleRoot)(hashes);
            expect(root).toBeDefined();
            expect(root.length).toBeGreaterThan(0);
        });
        it('should return empty string for empty array', () => {
            const root = (0, crypto_js_1.computeMerkleRoot)([]);
            expect(root).toBe('');
        });
        it('should build complete merkle tree', () => {
            const hashes = ['h1', 'h2', 'h3', 'h4'];
            const tree = (0, crypto_js_1.buildMerkleTree)(hashes);
            expect(tree.length).toBeGreaterThan(1);
            expect(tree[0]).toEqual(hashes);
            expect(tree[tree.length - 1].length).toBe(1); // Root
        });
        it('should produce same root for same input', () => {
            const hashes = ['a', 'b', 'c'];
            const root1 = (0, crypto_js_1.computeMerkleRoot)(hashes);
            const root2 = (0, crypto_js_1.computeMerkleRoot)(hashes);
            expect(root1).toBe(root2);
        });
    });
});
