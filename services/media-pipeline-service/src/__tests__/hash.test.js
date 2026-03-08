"use strict";
/**
 * Hash Utility Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const hash_js_1 = require("../utils/hash.js");
(0, globals_1.describe)('Hash Utilities', () => {
    (0, globals_1.describe)('hashString', () => {
        (0, globals_1.it)('should return consistent hash for same input', () => {
            const input = 'test string';
            const hash1 = (0, hash_js_1.hashString)(input);
            const hash2 = (0, hash_js_1.hashString)(input);
            (0, globals_1.expect)(hash1).toBe(hash2);
        });
        (0, globals_1.it)('should return different hashes for different inputs', () => {
            const hash1 = (0, hash_js_1.hashString)('string1');
            const hash2 = (0, hash_js_1.hashString)('string2');
            (0, globals_1.expect)(hash1).not.toBe(hash2);
        });
        (0, globals_1.it)('should return 64 character hex string (SHA256)', () => {
            const hash = (0, hash_js_1.hashString)('test');
            (0, globals_1.expect)(hash.length).toBe(64);
            (0, globals_1.expect)(/^[a-f0-9]+$/.test(hash)).toBe(true);
        });
    });
    (0, globals_1.describe)('hashBuffer', () => {
        (0, globals_1.it)('should hash buffer correctly', () => {
            const buffer = Buffer.from('test buffer');
            const hash = (0, hash_js_1.hashBuffer)(buffer);
            (0, globals_1.expect)(hash.length).toBe(64);
        });
        (0, globals_1.it)('should return consistent hash for same buffer', () => {
            const buffer = Buffer.from('test');
            const hash1 = (0, hash_js_1.hashBuffer)(buffer);
            const hash2 = (0, hash_js_1.hashBuffer)(buffer);
            (0, globals_1.expect)(hash1).toBe(hash2);
        });
    });
    (0, globals_1.describe)('hashObject', () => {
        (0, globals_1.it)('should hash object deterministically', () => {
            const obj = { b: 2, a: 1 };
            const hash1 = (0, hash_js_1.hashObject)(obj);
            const hash2 = (0, hash_js_1.hashObject)({ a: 1, b: 2 });
            (0, globals_1.expect)(hash1).toBe(hash2);
        });
        (0, globals_1.it)('should return different hashes for different objects', () => {
            const hash1 = (0, hash_js_1.hashObject)({ a: 1 });
            const hash2 = (0, hash_js_1.hashObject)({ a: 2 });
            (0, globals_1.expect)(hash1).not.toBe(hash2);
        });
    });
    (0, globals_1.describe)('generateId', () => {
        (0, globals_1.it)('should generate valid UUID', () => {
            const id = (0, hash_js_1.generateId)();
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            (0, globals_1.expect)(uuidRegex.test(id)).toBe(true);
        });
        (0, globals_1.it)('should generate unique IDs', () => {
            const ids = new Set();
            for (let i = 0; i < 1000; i++) {
                ids.add((0, hash_js_1.generateId)());
            }
            (0, globals_1.expect)(ids.size).toBe(1000);
        });
    });
    (0, globals_1.describe)('verifyChecksum', () => {
        (0, globals_1.it)('should return true for matching checksum', () => {
            const data = 'test data';
            const checksum = (0, hash_js_1.hashString)(data);
            (0, globals_1.expect)((0, hash_js_1.verifyChecksum)(data, checksum)).toBe(true);
        });
        (0, globals_1.it)('should return false for non-matching checksum', () => {
            const data = 'test data';
            const wrongChecksum = (0, hash_js_1.hashString)('different data');
            (0, globals_1.expect)((0, hash_js_1.verifyChecksum)(data, wrongChecksum)).toBe(false);
        });
        (0, globals_1.it)('should work with Buffer', () => {
            const buffer = Buffer.from('test');
            const checksum = (0, hash_js_1.hashBuffer)(buffer);
            (0, globals_1.expect)((0, hash_js_1.verifyChecksum)(buffer, checksum)).toBe(true);
        });
    });
});
