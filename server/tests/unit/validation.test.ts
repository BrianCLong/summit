
import { describe, it, expect } from '@jest/globals';
import { registerSchema, loginSchema, passwordSchema } from '../../src/graphql/validation/auth.schema.js';
import { z } from 'zod';

describe('Server Hardening: Validation Invariants', () => {
    describe('Auth Schemas', () => {
        it('should validate correct registration input', () => {
            const valid = {
                email: 'test@example.com',
                password: 'Password123!',
                firstName: 'Test',
                lastName: 'User'
            };

            const result = registerSchema.parse(valid);
            expect(result).toBeDefined();
            expect(result.email).toBe('test@example.com');
        });

        it('should reject weak passwords', () => {
            const weak = {
                email: 'test@example.com',
                password: 'weak',
                firstName: 'Test',
                lastName: 'User'
            };

            expect(() => registerSchema.parse(weak)).toThrow();
        });

        it('should reject invalid emails', () => {
            const invalid = {
                email: 'not-an-email',
                password: 'Password123!'
            };

            expect(() => loginSchema.parse(invalid)).toThrow();
        });

        it('should normalize email to lowercase', () => {
            const input = {
                email: 'TEST@EXAMPLE.COM',
                password: 'Password123!',
                firstName: 'Test',
                lastName: 'User'
            };
            const result = registerSchema.parse(input);
            expect(result.email).toBe('test@example.com');
        });
    });
});
