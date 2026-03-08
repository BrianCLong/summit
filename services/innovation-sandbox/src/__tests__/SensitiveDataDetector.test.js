"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const SensitiveDataDetector_js_1 = require("../detector/SensitiveDataDetector.js");
const index_js_1 = require("../types/index.js");
(0, vitest_1.describe)('SensitiveDataDetector', () => {
    let detector;
    (0, vitest_1.beforeEach)(() => {
        detector = new SensitiveDataDetector_js_1.SensitiveDataDetector();
    });
    (0, vitest_1.describe)('PII Detection', () => {
        (0, vitest_1.it)('should detect SSN format', async () => {
            const flags = await detector.scanInputs({
                ssn: '123-45-6789',
            });
            (0, vitest_1.expect)(flags.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(flags.some(f => f.type === index_js_1.SensitiveDataType.PII)).toBe(true);
            // First flag may be field name detection (0.8) or SSN pattern (0.95)
            (0, vitest_1.expect)(flags.some(f => f.confidence >= 0.8)).toBe(true);
        });
        (0, vitest_1.it)('should detect email addresses', async () => {
            const flags = await detector.scanInputs({
                email: 'user@example.com',
            });
            (0, vitest_1.expect)(flags.some(f => f.type === index_js_1.SensitiveDataType.PII)).toBe(true);
        });
        (0, vitest_1.it)('should detect phone numbers', async () => {
            const flags = await detector.scanInputs({
                phone: '555-123-4567',
            });
            (0, vitest_1.expect)(flags.some(f => f.type === index_js_1.SensitiveDataType.PII)).toBe(true);
        });
        (0, vitest_1.it)('should detect nested sensitive data', async () => {
            const flags = await detector.scanInputs({
                user: {
                    profile: {
                        ssn: '987-65-4321',
                    },
                },
            });
            (0, vitest_1.expect)(flags.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(flags[0].location).toContain('user.profile');
        });
    });
    (0, vitest_1.describe)('PCI Detection', () => {
        (0, vitest_1.it)('should detect credit card numbers', async () => {
            const flags = await detector.scanInputs({
                card: '4111111111111111', // Visa test number
            });
            (0, vitest_1.expect)(flags.some(f => f.type === index_js_1.SensitiveDataType.PCI)).toBe(true);
            (0, vitest_1.expect)(flags[0].confidence).toBeGreaterThanOrEqual(0.9);
        });
        (0, vitest_1.it)('should detect Mastercard numbers', async () => {
            const flags = await detector.scanInputs({
                payment: '5500000000000004',
            });
            (0, vitest_1.expect)(flags.some(f => f.type === index_js_1.SensitiveDataType.PCI)).toBe(true);
        });
    });
    (0, vitest_1.describe)('Credentials Detection', () => {
        (0, vitest_1.it)('should detect API keys', async () => {
            const flags = await detector.scanCode(`
        const apiKey = "sk_live_1234567890abcdefghij";
      `);
            (0, vitest_1.expect)(flags.some(f => f.type === index_js_1.SensitiveDataType.CREDENTIALS)).toBe(true);
        });
        (0, vitest_1.it)('should detect AWS access keys', async () => {
            const flags = await detector.scanCode(`
        const key = "AKIAIOSFODNN7EXAMPLE";
      `);
            (0, vitest_1.expect)(flags.some(f => f.type === index_js_1.SensitiveDataType.CREDENTIALS)).toBe(true);
            (0, vitest_1.expect)(flags[0].confidence).toBeGreaterThanOrEqual(0.95);
        });
        (0, vitest_1.it)('should detect private keys', async () => {
            const flags = await detector.scanCode(`
        const key = \`-----BEGIN RSA PRIVATE KEY-----
        MIIEpAIBAAKCAQEA0Z3VS
        -----END RSA PRIVATE KEY-----\`;
      `);
            (0, vitest_1.expect)(flags.some(f => f.type === index_js_1.SensitiveDataType.CREDENTIALS)).toBe(true);
        });
    });
    (0, vitest_1.describe)('Code Analysis', () => {
        (0, vitest_1.it)('should flag eval usage', async () => {
            const flags = await detector.scanCode(`
        const result = eval(userInput);
      `);
            (0, vitest_1.expect)(flags.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(flags.some(f => f.recommendation.includes('Dynamic code'))).toBe(true);
        });
        (0, vitest_1.it)('should flag process.env access', async () => {
            const flags = await detector.scanCode(`
        const secret = process.env.SECRET_KEY;
      `);
            (0, vitest_1.expect)(flags.some(f => f.recommendation.includes('Environment variable'))).toBe(true);
        });
        (0, vitest_1.it)('should flag filesystem access', async () => {
            const flags = await detector.scanCode(`
        import fs from 'fs';
        fs.readFileSync('/etc/passwd');
      `);
            (0, vitest_1.expect)(flags.some(f => f.recommendation.includes('Filesystem'))).toBe(true);
        });
    });
    (0, vitest_1.describe)('Sensitive Field Names', () => {
        (0, vitest_1.it)('should flag fields with sensitive names', async () => {
            const flags = await detector.scanInputs({
                password: 'mypassword',
                salary: 75000,
                date_of_birth: '1990-01-01',
            });
            (0, vitest_1.expect)(flags.length).toBeGreaterThanOrEqual(3);
        });
    });
    (0, vitest_1.describe)('Output Scanning', () => {
        (0, vitest_1.it)('should scan output for sensitive data', async () => {
            const flags = await detector.scanOutput({
                result: {
                    ssn: '111-22-3333',
                },
            });
            (0, vitest_1.expect)(flags.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(flags[0].location).toContain('output');
        });
        (0, vitest_1.it)('should handle null output', async () => {
            const flags = await detector.scanOutput(null);
            (0, vitest_1.expect)(flags).toEqual([]);
        });
    });
    (0, vitest_1.describe)('Redaction', () => {
        (0, vitest_1.it)('should properly redact SSN', async () => {
            const flags = await detector.scanInputs({ ssn: '123-45-6789' });
            const ssnFlag = flags.find(f => f.redacted.includes('***-**-'));
            (0, vitest_1.expect)(ssnFlag).toBeDefined();
            (0, vitest_1.expect)(ssnFlag?.redacted).toBe('***-**-6789');
        });
    });
    (0, vitest_1.describe)('Custom Patterns', () => {
        (0, vitest_1.it)('should allow adding custom patterns', async () => {
            detector.addCustomPattern('CUSTOM_ID', /\bCUST-\d{6}\b/g, 0.9);
            const flags = await detector.scanInputs({
                customerId: 'CUST-123456',
            });
            (0, vitest_1.expect)(flags.some(f => f.location.includes('custom:CUSTOM_ID'))).toBe(true);
        });
        (0, vitest_1.it)('should allow removing custom patterns', () => {
            detector.addCustomPattern('TEST', /test/g, 0.5);
            (0, vitest_1.expect)(detector.removeCustomPattern('TEST')).toBe(true);
            (0, vitest_1.expect)(detector.removeCustomPattern('NONEXISTENT')).toBe(false);
        });
    });
    (0, vitest_1.describe)('Pattern Stats', () => {
        (0, vitest_1.it)('should return pattern statistics', () => {
            const stats = detector.getPatternStats();
            (0, vitest_1.expect)(stats.length).toBeGreaterThan(0);
            (0, vitest_1.expect)(stats.some(s => s.type === 'pii')).toBe(true);
            (0, vitest_1.expect)(stats.some(s => s.type === 'credentials')).toBe(true);
        });
    });
});
