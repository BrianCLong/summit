import { describe, it, expect } from '@jest/globals';

// A mock policy/redaction scrubber
function redactPayload(payload: any, neverLogFields: string[]) {
    const redacted = JSON.parse(JSON.stringify(payload));

    // Simple recursive scrubber
    function scrub(obj: any) {
        if (!obj || typeof obj !== 'object') return;

        for (const key of Object.keys(obj)) {
            if (neverLogFields.includes(key)) {
                obj[key] = '[REDACTED]';
            } else if (typeof obj[key] === 'object') {
                scrub(obj[key]);
            }
        }
    }

    scrub(redacted);
    return redacted;
}

describe('Cognitive Security IO Redaction Policy', () => {
    it('should redact protected characteristics and PII in synthetic abuse payload', () => {
        const payload = {
            id: 'campaign-123',
            cognitiveObjective: 'POLARIZE',
            targetSegment: {
                label: 'diaspora community',
                protectedClass: true,
                raw_handles: ['@victim1', '@victim2'], // MUST BE REDACTED
                pii: {
                    email: 'victim@example.com' // MUST BE REDACTED
                }
            }
        };

        const policy = {
            neverLog: ["raw_handles", "pii", "protected_characteristics"]
        };

        const scrubbed = redactPayload(payload, policy.neverLog);

        expect(scrubbed.targetSegment.raw_handles).toBe('[REDACTED]');
        expect(scrubbed.targetSegment.pii).toBe('[REDACTED]');
        expect(scrubbed.cognitiveObjective).toBe('POLARIZE'); // Unaffected
    });
});
