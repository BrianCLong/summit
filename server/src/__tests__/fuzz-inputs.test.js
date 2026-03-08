"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
globals_1.jest.mock('validator', () => ({
    normalizeEmail: (value) => value?.toLowerCase?.() ?? '',
    isURL: () => true,
}), { virtual: true });
globals_1.jest.mock('html-escaper', () => ({
    escape: (value) => value.replace(/[<>]/g, ''),
}), { virtual: true });
globals_1.jest.mock('isomorphic-dompurify', () => ({
    sanitize: (value) => value,
    addHook: () => undefined,
    removeAllHooks: () => undefined,
}), { virtual: true });
const input_sanitization_js_1 = require("../utils/input-sanitization.js");
function createDeterministicRng(seed) {
    let value = seed;
    return () => {
        value = (value * 1664525 + 1013904223) % 4294967296;
        return value / 4294967296;
    };
}
function buildFuzzCases(seed, count) {
    const rng = createDeterministicRng(seed);
    const corpus = [];
    const alphabet = ['../', './', '~/', '<script>alert(1)</script>', '\0', 'header-value', '"', "'", ' ', '%'];
    for (let i = 0; i < count; i += 1) {
        const noiseLength = 3 + Math.floor(rng() * 5);
        let sample = '';
        for (let j = 0; j < noiseLength; j += 1) {
            const token = alphabet[Math.floor(rng() * alphabet.length)];
            sample += token;
        }
        corpus.push(sample);
    }
    return corpus;
}
(0, globals_1.describe)('Deterministic fuzzing of boundary inputs', () => {
    const graphqlCorpus = buildFuzzCases(20250202, 40);
    const restCorpus = buildFuzzCases(20250203, 50);
    (0, globals_1.it)('sanitizes GraphQL-style payloads without crashes or policy bypass', () => {
        graphqlCorpus.forEach((payload) => {
            const sanitized = (0, input_sanitization_js_1.sanitizeString)(payload);
            (0, globals_1.expect)(sanitized.includes('<')).toBe(false);
            (0, globals_1.expect)(sanitized.length).toBeLessThanOrEqual(payload.length + 10);
            (0, globals_1.expect)(sanitized).not.toContain('\0');
            (0, globals_1.expect)(() => sanitized).not.toThrow();
        });
    });
    (0, globals_1.it)('guards REST paths against traversal while keeping logs reproducible', () => {
        const basePath = '/tmp/uploads';
        restCorpus.forEach((pathCandidate) => {
            try {
                const result = (0, input_sanitization_js_1.sanitizeFilePath)(pathCandidate, basePath);
                (0, globals_1.expect)(result.startsWith(basePath)).toBe(true);
                (0, globals_1.expect)(result.includes('..')).toBe(false);
                (0, globals_1.expect)(result.includes('~')).toBe(false);
            }
            catch (error) {
                (0, globals_1.expect)(error.message.toLowerCase()).toMatch(/path/);
            }
        });
    });
});
