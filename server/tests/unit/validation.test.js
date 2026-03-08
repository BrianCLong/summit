"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const auth_schema_js_1 = require("../../src/graphql/validation/auth.schema.js");
(0, globals_1.describe)('Server Hardening: Validation Invariants', () => {
    (0, globals_1.describe)('Auth Schemas', () => {
        (0, globals_1.it)('should validate correct registration input', () => {
            const valid = {
                email: 'test@example.com',
                password: 'Password123!',
                firstName: 'Test',
                lastName: 'User'
            };
            const result = auth_schema_js_1.registerSchema.parse(valid);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.email).toBe('test@example.com');
        });
        (0, globals_1.it)('should reject weak passwords', () => {
            const weak = {
                email: 'test@example.com',
                password: 'weak',
                firstName: 'Test',
                lastName: 'User'
            };
            (0, globals_1.expect)(() => auth_schema_js_1.registerSchema.parse(weak)).toThrow();
        });
        (0, globals_1.it)('should reject invalid emails', () => {
            const invalid = {
                email: 'not-an-email',
                password: 'Password123!'
            };
            (0, globals_1.expect)(() => auth_schema_js_1.loginSchema.parse(invalid)).toThrow();
        });
        (0, globals_1.it)('should normalize email to lowercase', () => {
            const input = {
                email: 'TEST@EXAMPLE.COM',
                password: 'Password123!',
                firstName: 'Test',
                lastName: 'User'
            };
            const result = auth_schema_js_1.registerSchema.parse(input);
            (0, globals_1.expect)(result.email).toBe('test@example.com');
        });
    });
});
