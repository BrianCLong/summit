"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// We import the real function
const pii_redaction_1 = require("../../src/middleware/pii-redaction");
// Mock logger
globals_1.jest.mock('../../src/utils/logger', () => ({
    default: {
        warn: globals_1.jest.fn(),
        error: globals_1.jest.fn(),
        info: globals_1.jest.fn(),
    },
}));
(0, globals_1.describe)('PII Redaction Logic', () => {
    (0, globals_1.it)('should redact email addresses', () => {
        const input = { email: 'test@example.com', name: 'John Doe' };
        const redacted = (0, pii_redaction_1.redactPII)(input);
        (0, globals_1.expect)(JSON.stringify(redacted)).toContain('[REDACTED_EMAIL]');
        (0, globals_1.expect)(JSON.stringify(redacted)).not.toContain('test@example.com');
    });
    (0, globals_1.it)('should redact SSNs', () => {
        const input = { ssn: '123-45-6789' };
        const redacted = (0, pii_redaction_1.redactPII)(input);
        (0, globals_1.expect)(JSON.stringify(redacted)).toContain('[REDACTED_SSN]');
        (0, globals_1.expect)(JSON.stringify(redacted)).not.toContain('123-45-6789');
    });
    (0, globals_1.it)('should redact phone numbers', () => {
        const input = { phone: '555-123-4567' };
        const redacted = (0, pii_redaction_1.redactPII)(input);
        (0, globals_1.expect)(JSON.stringify(redacted)).toContain('[REDACTED_PHONE]');
        (0, globals_1.expect)(JSON.stringify(redacted)).not.toContain('555-123-4567');
    });
    (0, globals_1.it)('should handle strings directly', () => {
        const input = "Contact me at test@example.com";
        const redacted = (0, pii_redaction_1.redactPII)(input);
        (0, globals_1.expect)(redacted).toBe('Contact me at [REDACTED_EMAIL]');
    });
});
