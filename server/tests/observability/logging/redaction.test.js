"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const redaction_js_1 = require("../../../src/observability/logging/redaction.js");
(0, globals_1.describe)('Logging Redaction', () => {
    (0, globals_1.it)('should redact sensitive keys in object', () => {
        const input = {
            username: 'jdoe',
            password: 'supersecret',
            email: 'jdoe@example.com',
            metadata: {
                api_key: '12345'
            }
        };
        const output = (0, redaction_js_1.redact)(input);
        (0, globals_1.expect)(output.username).toBe('jdoe');
        (0, globals_1.expect)(output.password).toBe(redaction_js_1.MASK);
        (0, globals_1.expect)(output.metadata.api_key).toBe(redaction_js_1.MASK);
    });
    (0, globals_1.it)('should redact sensitive keys in nested arrays', () => {
        const input = {
            users: [
                { name: 'A', token: 'abc' },
                { name: 'B', secret: 'xyz' }
            ]
        };
        const output = (0, redaction_js_1.redact)(input);
        (0, globals_1.expect)(output.users[0].token).toBe(redaction_js_1.MASK);
        (0, globals_1.expect)(output.users[1].secret).toBe(redaction_js_1.MASK);
    });
    (0, globals_1.it)('should handle null/undefined', () => {
        (0, globals_1.expect)((0, redaction_js_1.redact)(null)).toBeNull();
        (0, globals_1.expect)((0, redaction_js_1.redact)(undefined)).toBeUndefined();
    });
});
