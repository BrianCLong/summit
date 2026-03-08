"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const dataRedaction_js_1 = require("../dataRedaction.js");
(0, globals_1.describe)('redactData', () => {
    const mockUser = (role) => ({
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    });
    // Data structure that matches PII_DEFINITIONS exact paths
    const sampleData = {
        id: '123',
        email: 'sensitive@example.com',
        phone: '123-456-7890',
        properties: {
            email: 'nested@example.com',
            ssn: '123-45-6789',
            creditCard: '1111-2222-3333-4444',
            name: 'John Doe',
            address: '123 Main St'
        },
        // Unknown path - currently NOT redacted
        profile: {
            name: 'Jane Doe'
        }
    };
    (0, globals_1.it)('should redact sensitive data for VIEWER role', () => {
        const user = mockUser('VIEWER');
        const result = (0, dataRedaction_js_1.redactData)(sampleData, user);
        // Root fields
        (0, globals_1.expect)(result.email).toBe('[REDACTED]');
        (0, globals_1.expect)(result.phone).toBe('[REDACTED]');
        // Nested fields matching "properties.*"
        (0, globals_1.expect)(result.properties.email).toBe('[REDACTED]');
        (0, globals_1.expect)(result.properties.name).toBe('J***e'); // MASK_PARTIAL
        (0, globals_1.expect)(result.properties.address).toBe('[REDACTED]');
        (0, globals_1.expect)(result.properties.ssn).toBe('[REDACTED]');
        (0, globals_1.expect)(result.properties.creditCard).toBe('[REDACTED]');
        // Unknown path remains untouched
        (0, globals_1.expect)(result.profile.name).toBe('Jane Doe');
    });
    (0, globals_1.it)('should redact sensitive data for ANALYST role', () => {
        const user = mockUser('ANALYST');
        const result = (0, dataRedaction_js_1.redactData)(sampleData, user);
        (0, globals_1.expect)(result.email).toBe('sen***@example.com'); // MASK_PARTIAL
        (0, globals_1.expect)(result.phone).toBe('***-***-7890'); // MASK_PARTIAL
        (0, globals_1.expect)(result.properties.ssn).toBe('[REDACTED]');
        (0, globals_1.expect)(result.properties.creditCard).toBe('[REDACTED]');
        // NAME and ADDRESS are not in ANALYST policy
        (0, globals_1.expect)(result.properties.name).toBe('John Doe');
        (0, globals_1.expect)(result.properties.address).toBe('123 Main St');
    });
    (0, globals_1.it)('should not redact data for ADMIN role', () => {
        const user = mockUser('ADMIN');
        const result = (0, dataRedaction_js_1.redactData)(sampleData, user);
        (0, globals_1.expect)(result).toEqual(sampleData);
    });
    (0, globals_1.it)('should handle null and undefined data', () => {
        const user = mockUser('VIEWER');
        (0, globals_1.expect)((0, dataRedaction_js_1.redactData)(null, user)).toBeNull();
        (0, globals_1.expect)((0, dataRedaction_js_1.redactData)(undefined, user)).toBeUndefined();
    });
    (0, globals_1.it)('should not modify the original object', () => {
        const user = mockUser('VIEWER');
        const original = JSON.parse(JSON.stringify(sampleData));
        const result = (0, dataRedaction_js_1.redactData)(sampleData, user);
        (0, globals_1.expect)(sampleData).toEqual(original);
        (0, globals_1.expect)(result).not.toBe(sampleData);
    });
});
