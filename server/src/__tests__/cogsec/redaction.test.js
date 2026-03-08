"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// A mock policy/redaction scrubber
function redactPayload(payload, neverLogFields) {
    const redacted = JSON.parse(JSON.stringify(payload));
    // Simple recursive scrubber
    function scrub(obj) {
        if (!obj || typeof obj !== 'object')
            return;
        for (const key of Object.keys(obj)) {
            if (neverLogFields.includes(key)) {
                obj[key] = '[REDACTED]';
            }
            else if (typeof obj[key] === 'object') {
                scrub(obj[key]);
            }
        }
    }
    scrub(redacted);
    return redacted;
}
(0, globals_1.describe)('Cognitive Security IO Redaction Policy', () => {
    (0, globals_1.it)('should redact protected characteristics and PII in synthetic abuse payload', () => {
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
        (0, globals_1.expect)(scrubbed.targetSegment.raw_handles).toBe('[REDACTED]');
        (0, globals_1.expect)(scrubbed.targetSegment.pii).toBe('[REDACTED]');
        (0, globals_1.expect)(scrubbed.cognitiveObjective).toBe('POLARIZE'); // Unaffected
    });
});
