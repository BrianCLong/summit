"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dataRedaction_1 = require("@/utils/dataRedaction");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('redactData', () => {
    const sample = {
        email: 'user@example.com',
        properties: { phone: '1234567890', name: 'Alice' },
    };
    (0, globals_1.it)('redacts PII for viewer role', () => {
        const user = { id: '1', role: 'VIEWER' };
        const redacted = (0, dataRedaction_1.redactData)(sample, user);
        (0, globals_1.expect)(redacted.email).toBe('[REDACTED]');
        (0, globals_1.expect)(redacted.properties.phone).toBe('[REDACTED]');
        (0, globals_1.expect)(redacted.properties.name).toMatch(/^A\*\*\*e$/);
    });
    (0, globals_1.it)('masks PII for analyst role', () => {
        const user = { id: '2', role: 'ANALYST' };
        const redacted = (0, dataRedaction_1.redactData)(sample, user);
        (0, globals_1.expect)(redacted.email).toBe('use***@example.com');
        (0, globals_1.expect)(redacted.properties.phone).toBe('***-***-7890');
    });
});
