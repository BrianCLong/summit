"use strict";
/**
 * Environment Normalization Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const env_js_1 = require("../src/utils/env.js");
describe('Environment Normalization', () => {
    const originalEnv = { ...process.env };
    beforeEach(() => {
        // Reset environment before each test
        process.env = { ...originalEnv };
    });
    afterAll(() => {
        // Restore original environment
        process.env = originalEnv;
    });
    describe('normalizeEnvironment', () => {
        it('should set TZ to UTC by default', () => {
            (0, env_js_1.normalizeEnvironment)();
            expect(process.env.TZ).toBe('UTC');
        });
        it('should set locale to C by default', () => {
            (0, env_js_1.normalizeEnvironment)();
            expect(process.env.LC_ALL).toBe('C');
            expect(process.env.LANG).toBe('C');
            expect(process.env.LANGUAGE).toBe('C');
        });
        it('should allow custom timezone', () => {
            (0, env_js_1.normalizeEnvironment)({ tz: 'America/New_York' });
            expect(process.env.TZ).toBe('America/New_York');
        });
        it('should allow custom locale', () => {
            (0, env_js_1.normalizeEnvironment)({ locale: 'en_US.UTF-8' });
            expect(process.env.LC_ALL).toBe('en_US.UTF-8');
        });
    });
    describe('getNormalizedEnv', () => {
        it('should return current environment info', () => {
            (0, env_js_1.normalizeEnvironment)();
            const env = (0, env_js_1.getNormalizedEnv)();
            expect(env.tz).toBe('UTC');
            expect(env.locale).toBe('C');
            expect(env.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
            expect(['darwin', 'linux', 'win32']).toContain(env.platform);
            expect(['x64', 'arm64', 'arm']).toContain(env.arch);
        });
        it('should respect override options', () => {
            const env = (0, env_js_1.getNormalizedEnv)({ tz: 'Asia/Tokyo', locale: 'ja_JP' });
            expect(env.tz).toBe('Asia/Tokyo');
            expect(env.locale).toBe('ja_JP');
        });
    });
    describe('ENV_DEFAULTS', () => {
        it('should have expected default values', () => {
            expect(env_js_1.ENV_DEFAULTS.TZ).toBe('UTC');
            expect(env_js_1.ENV_DEFAULTS.LOCALE).toBe('C');
            expect(env_js_1.ENV_DEFAULTS.LC_ALL).toBe('C');
            expect(env_js_1.ENV_DEFAULTS.LANG).toBe('C');
        });
    });
});
describe('Deterministic Sorting', () => {
    describe('deterministicSort', () => {
        it('should sort strings alphabetically', () => {
            const input = ['zebra', 'apple', 'mango', 'banana'];
            const sorted = (0, env_js_1.deterministicSort)(input);
            expect(sorted).toEqual(['apple', 'banana', 'mango', 'zebra']);
        });
        it('should not mutate original array', () => {
            const input = ['c', 'a', 'b'];
            const original = [...input];
            (0, env_js_1.deterministicSort)(input);
            expect(input).toEqual(original);
        });
        it('should handle empty arrays', () => {
            expect((0, env_js_1.deterministicSort)([])).toEqual([]);
        });
        it('should handle arrays with single element', () => {
            expect((0, env_js_1.deterministicSort)(['only'])).toEqual(['only']);
        });
        it('should support custom key function', () => {
            const input = [{ name: 'zebra' }, { name: 'apple' }, { name: 'mango' }];
            const sorted = (0, env_js_1.deterministicSort)(input, (item) => item.name);
            expect(sorted.map((i) => i.name)).toEqual(['apple', 'mango', 'zebra']);
        });
        it('should produce identical results on repeated calls', () => {
            const input = ['d', 'b', 'a', 'c', 'e'];
            const result1 = (0, env_js_1.deterministicSort)(input);
            const result2 = (0, env_js_1.deterministicSort)(input);
            const result3 = (0, env_js_1.deterministicSort)(input);
            expect(result1).toEqual(result2);
            expect(result2).toEqual(result3);
        });
    });
});
describe('Deterministic JSON Stringify', () => {
    describe('deterministicStringify', () => {
        it('should sort object keys', () => {
            const obj = { zebra: 1, apple: 2, mango: 3 };
            const json = (0, env_js_1.deterministicStringify)(obj);
            expect(json).toBe('{"apple":2,"mango":3,"zebra":1}');
        });
        it('should handle nested objects', () => {
            const obj = {
                outer: { z: 1, a: 2 },
                inner: { y: 3, b: 4 },
            };
            const json = (0, env_js_1.deterministicStringify)(obj);
            // Parse to verify structure (keys should be sorted)
            const parsed = JSON.parse(json);
            expect(Object.keys(parsed)).toEqual(['inner', 'outer']);
            expect(Object.keys(parsed.outer)).toEqual(['a', 'z']);
        });
        it('should preserve arrays as-is (no sorting)', () => {
            const obj = { items: [3, 1, 2] };
            const json = (0, env_js_1.deterministicStringify)(obj);
            expect(json).toBe('{"items":[3,1,2]}');
        });
        it('should support indentation', () => {
            const obj = { b: 1, a: 2 };
            const json = (0, env_js_1.deterministicStringify)(obj, 2);
            expect(json).toContain('\n');
            expect(json).toContain('  ');
        });
        it('should produce identical results on repeated calls', () => {
            const obj = { z: { y: { x: 1 } }, a: { b: { c: 2 } } };
            const result1 = (0, env_js_1.deterministicStringify)(obj);
            const result2 = (0, env_js_1.deterministicStringify)(obj);
            const result3 = (0, env_js_1.deterministicStringify)(obj);
            expect(result1).toBe(result2);
            expect(result2).toBe(result3);
        });
        it('should handle null and undefined', () => {
            expect((0, env_js_1.deterministicStringify)(null)).toBe('null');
            expect((0, env_js_1.deterministicStringify)({ a: null, b: undefined })).toBe('{"a":null}');
        });
        it('should handle primitive values', () => {
            expect((0, env_js_1.deterministicStringify)(42)).toBe('42');
            expect((0, env_js_1.deterministicStringify)('hello')).toBe('"hello"');
            expect((0, env_js_1.deterministicStringify)(true)).toBe('true');
        });
    });
});
