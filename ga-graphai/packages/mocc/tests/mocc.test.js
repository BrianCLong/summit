"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
(0, vitest_1.describe)('validateOutput', () => {
    (0, vitest_1.it)('flags seeded regex violations with descriptive messages', () => {
        const contract = {
            regex: { pattern: '^\\d+$', description: 'numeric identifier' }
        };
        const result = (0, index_js_1.validateOutput)('abc123', contract);
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.errors[0]?.message).toContain('pattern');
        (0, vitest_1.expect)(result.errors[0]?.meta).toMatchObject({ pattern: '^\\d+$' });
    });
    (0, vitest_1.it)('collects schema violations with precise paths', () => {
        const contract = {
            schema: {
                type: 'object',
                properties: {
                    status: { type: 'string', enum: ['ok'] }
                },
                required: ['status'],
                additionalProperties: false
            }
        };
        const result = (0, index_js_1.validateOutput)({ status: 'error', extra: true }, contract);
        (0, vitest_1.expect)(result.valid).toBe(false);
        const messages = result.errors.map((error) => error.message).join(' ');
        (0, vitest_1.expect)(messages).toContain('allowed');
        const paths = result.errors.map((error) => error.path);
        (0, vitest_1.expect)(paths).toContain('status');
    });
    (0, vitest_1.it)('detects PII when sanitization is disabled', () => {
        const contract = { forbidsPII: true };
        const result = (0, index_js_1.validateOutput)('Reach me at jane.doe@example.com', contract);
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.errors[0]?.code).toBe('constraint.pii');
        (0, vitest_1.expect)(result.errors[0]?.message).toContain('email');
    });
    (0, vitest_1.it)('sanitizes seeded PII without semantic drift when enabled', () => {
        const text = 'Reach me at jane.doe@example.com for the final report. It is confidential.';
        const contract = {
            forbidsPII: { replacement: '[redacted:%type%]' },
            length: { max: 80 }
        };
        const sanitized = (0, index_js_1.sanitizeOutput)(text, contract);
        (0, vitest_1.expect)(sanitized.value).toContain('[redacted:email]');
        (0, vitest_1.expect)(sanitized.actions.some((action) => action.code === 'sanitize.pii')).toBe(true);
        const result = (0, index_js_1.validateOutput)(text, contract, { sanitize: true });
        (0, vitest_1.expect)(result.valid).toBe(true);
        (0, vitest_1.expect)(result.sanitized).toBe(true);
        (0, vitest_1.expect)(result.value).toContain('final report');
    });
    (0, vitest_1.it)('clamps numeric ranges during sanitization', () => {
        const contract = { range: { min: 0, max: 100 } };
        const result = (0, index_js_1.validateOutput)(150, contract, { sanitize: true });
        (0, vitest_1.expect)(result.valid).toBe(true);
        (0, vitest_1.expect)(result.value).toBe(100);
        (0, vitest_1.expect)(result.sanitizationActions.some((action) => action.code === 'sanitize.range')).toBe(true);
    });
    (0, vitest_1.it)('canonicalizes locale metadata and validates allowed locales', () => {
        const contract = {
            locale: { allowed: ['en-US', 'fr-FR'], canonicalize: true, path: 'metadata.locale' }
        };
        const output = { text: 'Hello', metadata: { locale: 'en-us' } };
        const result = (0, index_js_1.validateOutput)(output, contract, { sanitize: true });
        (0, vitest_1.expect)(result.valid).toBe(true);
        (0, vitest_1.expect)(result.value.metadata.locale).toBe('en-US');
        (0, vitest_1.expect)(result.sanitizationActions.some((action) => action.code === 'sanitize.locale')).toBe(true);
        const failing = (0, index_js_1.validateOutput)({ text: 'Bonjour', metadata: { locale: 'es-ES' } }, contract);
        (0, vitest_1.expect)(failing.valid).toBe(false);
        (0, vitest_1.expect)(failing.errors[0]?.code).toBe('constraint.locale');
    });
});
(0, vitest_1.describe)('runCIGate', () => {
    (0, vitest_1.it)('throws an aggregate error when any validation fails', () => {
        const contract = {
            regex: { pattern: '^success$' }
        };
        (0, vitest_1.expect)(() => (0, index_js_1.runCIGate)([
            { name: 'ok', output: 'success', contract },
            { name: 'bad', output: 'failure', contract }
        ])).toThrow(/MOCC CI gate failed/);
    });
    (0, vitest_1.it)('returns reports when all validations pass', () => {
        const reports = (0, index_js_1.runCIGate)([
            {
                name: 'sanitized-range',
                output: 120,
                contract: { range: { max: 120 } },
                sanitize: true
            }
        ]);
        (0, vitest_1.expect)(reports[0]?.result.valid).toBe(true);
    });
});
(0, vitest_1.describe)('explainFailures', () => {
    (0, vitest_1.it)('formats validation failures into an explainable string', () => {
        const explanation = (0, index_js_1.explainFailures)([
            { code: 'constraint.regex', message: 'Value did not match pattern', path: 'output' }
        ]);
        (0, vitest_1.expect)(explanation).toContain('constraint.regex');
        (0, vitest_1.expect)(explanation).toContain('output');
    });
});
