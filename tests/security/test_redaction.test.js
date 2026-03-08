"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const writer_1 = require("../../src/evidence/writer");
(0, vitest_1.describe)('redaction', () => {
    (0, vitest_1.test)('removes disallowed PII-bearing keys from finding payloads', () => {
        const redacted = (0, writer_1.redactSensitive)({
            raw_media_bytes: 'abc',
            faces: ['face1'],
            phone_numbers: ['+1-555'],
            emails: ['a@example.com'],
            keep_me: 'ok',
        });
        (0, vitest_1.expect)(redacted).toEqual({ keep_me: 'ok' });
    });
});
