"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("./index.js");
(0, vitest_1.describe)('scrubLogArgs', () => {
    (0, vitest_1.it)('redacts sensitive object fields', () => {
        const [payload] = (0, index_js_1.scrubLogArgs)([
            {
                token: 'abc123',
                nested: { apiKey: 'xyz789', keep: 'ok' },
                message: 'Bearer top-secret-token',
            },
        ]);
        const result = payload;
        (0, vitest_1.expect)(result.token).toBe('[REDACTED]');
        (0, vitest_1.expect)(result.nested.apiKey).toBe('[REDACTED]');
        (0, vitest_1.expect)(result.nested.keep).toBe('ok');
        (0, vitest_1.expect)(result.message).not.toContain('top-secret-token');
        (0, vitest_1.expect)(result.message).toContain('[REDACTED]');
    });
    (0, vitest_1.it)('redacts inline tokens and query parameters', () => {
        const [payload] = (0, index_js_1.scrubLogArgs)([
            'call?access_token=abc.def&next=home Bearer another-secret',
        ]);
        (0, vitest_1.expect)(payload).toBe('call?access_token=[REDACTED]&next=home Bearer [REDACTED]');
    });
});
