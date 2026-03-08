"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const crypto_1 = require("crypto");
const crypto_js_1 = __importDefault(require("crypto-js"));
/**
 * Tests for verifier CLI
 */
(0, globals_1.describe)('Verifier Tests', () => {
    (0, globals_1.describe)('Hash verification', () => {
        (0, globals_1.it)('should compute SHA-256 hash correctly', () => {
            const content = { name: 'Test', value: 123 };
            const hash = (0, crypto_1.createHash)('sha256')
                .update(JSON.stringify(content, Object.keys(content).sort()))
                .digest('hex');
            (0, globals_1.expect)(hash).toBeTruthy();
            (0, globals_1.expect)(hash).toHaveLength(64);
        });
        (0, globals_1.it)('should detect tampered content', () => {
            const originalContent = { name: 'Test', value: 123 };
            const tamperedContent = { name: 'Test', value: 456 };
            const originalHash = (0, crypto_1.createHash)('sha256')
                .update(JSON.stringify(originalContent, Object.keys(originalContent).sort()))
                .digest('hex');
            const tamperedHash = (0, crypto_1.createHash)('sha256')
                .update(JSON.stringify(tamperedContent, Object.keys(tamperedContent).sort()))
                .digest('hex');
            (0, globals_1.expect)(originalHash).not.toBe(tamperedHash);
        });
    });
    (0, globals_1.describe)('Merkle tree verification', () => {
        function computeMerkleRoot(hashes) {
            if (hashes.length === 0)
                return '';
            if (hashes.length === 1)
                return hashes[0];
            const newLevel = [];
            for (let i = 0; i < hashes.length; i += 2) {
                if (i + 1 < hashes.length) {
                    const combined = hashes[i] + hashes[i + 1];
                    newLevel.push(crypto_js_1.default.SHA256(combined).toString());
                }
                else {
                    newLevel.push(hashes[i]);
                }
            }
            return computeMerkleRoot(newLevel);
        }
        (0, globals_1.it)('should compute Merkle root for single hash', () => {
            const hashes = ['abc123'];
            const root = computeMerkleRoot(hashes);
            (0, globals_1.expect)(root).toBe('abc123');
        });
        (0, globals_1.it)('should compute Merkle root for two hashes', () => {
            const hashes = ['hash1', 'hash2'];
            const root = computeMerkleRoot(hashes);
            const expected = crypto_js_1.default.SHA256('hash1hash2').toString();
            (0, globals_1.expect)(root).toBe(expected);
        });
        (0, globals_1.it)('should compute Merkle root for four hashes', () => {
            const hashes = ['hash1', 'hash2', 'hash3', 'hash4'];
            const root = computeMerkleRoot(hashes);
            // Level 1
            const h12 = crypto_js_1.default.SHA256('hash1hash2').toString();
            const h34 = crypto_js_1.default.SHA256('hash3hash4').toString();
            // Level 2 (root)
            const expected = crypto_js_1.default.SHA256(h12 + h34).toString();
            (0, globals_1.expect)(root).toBe(expected);
        });
        (0, globals_1.it)('should detect tampered Merkle tree', () => {
            const originalHashes = ['hash1', 'hash2', 'hash3', 'hash4'];
            const tamperedHashes = ['hash1', 'TAMPERED', 'hash3', 'hash4'];
            const originalRoot = computeMerkleRoot(originalHashes);
            const tamperedRoot = computeMerkleRoot(tamperedHashes);
            (0, globals_1.expect)(originalRoot).not.toBe(tamperedRoot);
        });
        (0, globals_1.it)('should handle odd number of hashes', () => {
            const hashes = ['hash1', 'hash2', 'hash3'];
            const root = computeMerkleRoot(hashes);
            // Level 1
            const h12 = crypto_js_1.default.SHA256('hash1hash2').toString();
            const h3 = 'hash3'; // Odd one out
            // Level 2 (root)
            const expected = crypto_js_1.default.SHA256(h12 + h3).toString();
            (0, globals_1.expect)(root).toBe(expected);
        });
    });
    (0, globals_1.describe)('Evidence verification', () => {
        (0, globals_1.it)('should verify evidence checksum', () => {
            const content = 'This is evidence content';
            const checksum = (0, crypto_1.createHash)('sha256').update(content).digest('hex');
            // Verification
            const verifyChecksum = (0, crypto_1.createHash)('sha256').update(content).digest('hex');
            (0, globals_1.expect)(checksum).toBe(verifyChecksum);
        });
        (0, globals_1.it)('should detect tampered evidence', () => {
            const originalContent = 'Original evidence';
            const tamperedContent = 'Tampered evidence';
            const originalChecksum = (0, crypto_1.createHash)('sha256').update(originalContent).digest('hex');
            const tamperedChecksum = (0, crypto_1.createHash)('sha256').update(tamperedContent).digest('hex');
            (0, globals_1.expect)(originalChecksum).not.toBe(tamperedChecksum);
        });
    });
    (0, globals_1.describe)('Transform chain integrity', () => {
        (0, globals_1.it)('should verify transform chain order', () => {
            const transforms = [
                { timestamp: '2024-01-01T00:00:00Z', type: 'encrypt' },
                { timestamp: '2024-01-02T00:00:00Z', type: 'sign' },
                { timestamp: '2024-01-03T00:00:00Z', type: 'compress' },
            ];
            // Verify timestamps are in order
            for (let i = 0; i < transforms.length - 1; i++) {
                const current = new Date(transforms[i].timestamp);
                const next = new Date(transforms[i + 1].timestamp);
                (0, globals_1.expect)(current.getTime()).toBeLessThan(next.getTime());
            }
        });
        (0, globals_1.it)('should detect out-of-order transforms', () => {
            const transforms = [
                { timestamp: '2024-01-03T00:00:00Z', type: 'compress' },
                { timestamp: '2024-01-01T00:00:00Z', type: 'encrypt' },
                { timestamp: '2024-01-02T00:00:00Z', type: 'sign' },
            ];
            // Check if out of order
            let outOfOrder = false;
            for (let i = 0; i < transforms.length - 1; i++) {
                const current = new Date(transforms[i].timestamp);
                const next = new Date(transforms[i + 1].timestamp);
                if (current.getTime() > next.getTime()) {
                    outOfOrder = true;
                    break;
                }
            }
            (0, globals_1.expect)(outOfOrder).toBe(true);
        });
    });
});
