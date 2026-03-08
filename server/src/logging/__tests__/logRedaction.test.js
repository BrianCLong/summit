"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const logRedaction_js_1 = require("../logRedaction.js");
(0, globals_1.describe)('redactLogLine', () => {
    (0, globals_1.it)('redacts common token formats', () => {
        const line = 'Authorization: Bearer abcdef1234567890 api_key=abcdEFGH12345678 ghp_abcdefghijklmnopqrstuvwxyz123456 slack xoxb-1234567890-secret';
        const redacted = (0, logRedaction_js_1.redactLogLine)(line);
        (0, globals_1.expect)(redacted).toContain('Bearer [REDACTED]');
        (0, globals_1.expect)(redacted).not.toMatch(/ghp_[A-Za-z0-9]{20,}/);
        (0, globals_1.expect)(redacted).toContain('[REDACTED_GITHUB_TOKEN]');
        (0, globals_1.expect)(redacted).toContain('api_key=[REDACTED]');
        (0, globals_1.expect)(redacted).toContain('[REDACTED_SLACK_TOKEN]');
    });
    (0, globals_1.it)('does not over-redact benign strings', () => {
        const benign = 'tokenization strategy keeps api key rotation documented.';
        (0, globals_1.expect)((0, logRedaction_js_1.redactLogLine)(benign)).toBe(benign);
    });
});
(0, globals_1.describe)('sanitizeLogArguments', () => {
    (0, globals_1.it)('recursively redacts strings inside structured arguments', () => {
        const args = (0, logRedaction_js_1.sanitizeLogArguments)([
            { details: 'password=SuperSecretValue123', nested: { header: 'Bearer qwerty0987654321' } },
            ['AKIAABCD1234567890EF ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcd'],
        ]);
        (0, globals_1.expect)(args[0]).toEqual({
            details: 'password=[REDACTED]',
            nested: { header: 'Bearer [REDACTED]' },
        });
        (0, globals_1.expect)(args[1]).toEqual(['[REDACTED_AWS_KEY] [REDACTED_AWS_SECRET]']);
    });
});
