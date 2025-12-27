
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
// We import the real function
import { redactPII } from '../../src/middleware/pii-redaction';

// Mock logger
vi.mock('../../src/utils/logger', () => ({
    default: {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));

describe('PII Redaction Logic', () => {

    it('should redact email addresses', () => {
        const input = { email: 'test@example.com', name: 'John Doe' };
        const redacted = redactPII(input);
        expect(JSON.stringify(redacted)).toContain('[REDACTED_EMAIL]');
        expect(JSON.stringify(redacted)).not.toContain('test@example.com');
    });

    it('should redact SSNs', () => {
        const input = { ssn: '123-45-6789' };
        const redacted = redactPII(input);
        expect(JSON.stringify(redacted)).toContain('[REDACTED_SSN]');
        expect(JSON.stringify(redacted)).not.toContain('123-45-6789');
    });

    it('should redact phone numbers', () => {
         const input = { phone: '555-123-4567' };
         const redacted = redactPII(input);
         expect(JSON.stringify(redacted)).toContain('[REDACTED_PHONE]');
         expect(JSON.stringify(redacted)).not.toContain('555-123-4567');
    });

    it('should handle strings directly', () => {
        const input = "Contact me at test@example.com";
        const redacted = redactPII(input);
        expect(redacted).toBe('Contact me at [REDACTED_EMAIL]');
    });
});
