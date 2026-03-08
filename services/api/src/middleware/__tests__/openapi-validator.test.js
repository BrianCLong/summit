"use strict";
/**
 * Tests for OpenAPI Validator Middleware
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
Object.defineProperty(exports, "__esModule", { value: true });
const openapi_validator_js_1 = require("../openapi-validator.js");
// Mock dependencies
jest.mock('node:fs');
jest.mock('js-yaml');
describe('validateData', () => {
    describe('Basic Validation', () => {
        it('should validate data against a simple schema', () => {
            const schema = {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    age: { type: 'number' },
                },
                required: ['name'],
            };
            const validData = {
                name: 'John Doe',
                age: 30,
            };
            const errors = (0, openapi_validator_js_1.validateData)(schema, validData);
            expect(errors).toBeNull();
        });
        it('should return errors for invalid data', () => {
            const schema = {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    age: { type: 'number' },
                },
                required: ['name'],
            };
            const invalidData = {
                age: 'thirty', // Should be number
            };
            const errors = (0, openapi_validator_js_1.validateData)(schema, invalidData);
            expect(errors).not.toBeNull();
            expect(errors).toHaveLength(2); // Missing name + wrong type for age
        });
    });
    describe('Type Validation', () => {
        it('should validate string type', () => {
            const schema = {
                type: 'object',
                properties: {
                    text: { type: 'string' },
                },
            };
            expect((0, openapi_validator_js_1.validateData)(schema, { text: 'hello' })).toBeNull();
            expect((0, openapi_validator_js_1.validateData)(schema, { text: 123 })).not.toBeNull();
        });
        it('should validate number type', () => {
            const schema = {
                type: 'object',
                properties: {
                    count: { type: 'number' },
                },
            };
            expect((0, openapi_validator_js_1.validateData)(schema, { count: 42 })).toBeNull();
            expect((0, openapi_validator_js_1.validateData)(schema, { count: '42' })).toBeNull(); // Coerced
        });
        it('should validate integer type', () => {
            const schema = {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                },
            };
            expect((0, openapi_validator_js_1.validateData)(schema, { id: 1 })).toBeNull();
            expect((0, openapi_validator_js_1.validateData)(schema, { id: 1.5 })).not.toBeNull();
        });
        it('should validate boolean type', () => {
            const schema = {
                type: 'object',
                properties: {
                    active: { type: 'boolean' },
                },
            };
            expect((0, openapi_validator_js_1.validateData)(schema, { active: true })).toBeNull();
            expect((0, openapi_validator_js_1.validateData)(schema, { active: false })).toBeNull();
            expect((0, openapi_validator_js_1.validateData)(schema, { active: 'true' })).toBeNull(); // Coerced
        });
        it('should validate array type', () => {
            const schema = {
                type: 'object',
                properties: {
                    tags: {
                        type: 'array',
                        items: { type: 'string' },
                    },
                },
            };
            expect((0, openapi_validator_js_1.validateData)(schema, { tags: ['a', 'b', 'c'] })).toBeNull();
            expect((0, openapi_validator_js_1.validateData)(schema, { tags: [1, 2, 3] })).not.toBeNull();
        });
        it('should validate object type', () => {
            const schema = {
                type: 'object',
                properties: {
                    address: {
                        type: 'object',
                        properties: {
                            street: { type: 'string' },
                            city: { type: 'string' },
                        },
                    },
                },
            };
            expect((0, openapi_validator_js_1.validateData)(schema, {
                address: { street: '123 Main St', city: 'NYC' },
            })).toBeNull();
            expect((0, openapi_validator_js_1.validateData)(schema, { address: 'not an object' })).not.toBeNull();
        });
    });
    describe('Format Validation', () => {
        it('should validate email format', () => {
            const schema = {
                type: 'object',
                properties: {
                    email: { type: 'string', format: 'email' },
                },
            };
            expect((0, openapi_validator_js_1.validateData)(schema, { email: 'test@example.com' })).toBeNull();
            expect((0, openapi_validator_js_1.validateData)(schema, { email: 'invalid-email' })).not.toBeNull();
        });
        it('should validate date format', () => {
            const schema = {
                type: 'object',
                properties: {
                    birthdate: { type: 'string', format: 'date' },
                },
            };
            expect((0, openapi_validator_js_1.validateData)(schema, { birthdate: '2025-01-01' })).toBeNull();
            expect((0, openapi_validator_js_1.validateData)(schema, { birthdate: 'not-a-date' })).not.toBeNull();
        });
        it('should validate date-time format', () => {
            const schema = {
                type: 'object',
                properties: {
                    createdAt: { type: 'string', format: 'date-time' },
                },
            };
            expect((0, openapi_validator_js_1.validateData)(schema, { createdAt: '2025-01-01T12:00:00Z' })).toBeNull();
            expect((0, openapi_validator_js_1.validateData)(schema, { createdAt: 'not-a-datetime' })).not.toBeNull();
        });
        it('should validate uri format', () => {
            const schema = {
                type: 'object',
                properties: {
                    website: { type: 'string', format: 'uri' },
                },
            };
            expect((0, openapi_validator_js_1.validateData)(schema, { website: 'https://example.com' })).toBeNull();
            expect((0, openapi_validator_js_1.validateData)(schema, { website: 'not-a-uri' })).not.toBeNull();
        });
        it('should validate uuid format', () => {
            const schema = {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                },
            };
            expect((0, openapi_validator_js_1.validateData)(schema, {
                id: '123e4567-e89b-12d3-a456-426614174000',
            })).toBeNull();
            expect((0, openapi_validator_js_1.validateData)(schema, { id: 'not-a-uuid' })).not.toBeNull();
        });
    });
    describe('Constraint Validation', () => {
        it('should validate minimum/maximum for numbers', () => {
            const schema = {
                type: 'object',
                properties: {
                    age: { type: 'number', minimum: 0, maximum: 150 },
                },
            };
            expect((0, openapi_validator_js_1.validateData)(schema, { age: 25 })).toBeNull();
            expect((0, openapi_validator_js_1.validateData)(schema, { age: -1 })).not.toBeNull();
            expect((0, openapi_validator_js_1.validateData)(schema, { age: 200 })).not.toBeNull();
        });
        it('should validate minLength/maxLength for strings', () => {
            const schema = {
                type: 'object',
                properties: {
                    username: { type: 'string', minLength: 3, maxLength: 20 },
                },
            };
            expect((0, openapi_validator_js_1.validateData)(schema, { username: 'john' })).toBeNull();
            expect((0, openapi_validator_js_1.validateData)(schema, { username: 'ab' })).not.toBeNull();
            expect((0, openapi_validator_js_1.validateData)(schema, { username: 'a'.repeat(21) })).not.toBeNull();
        });
        it('should validate minItems/maxItems for arrays', () => {
            const schema = {
                type: 'object',
                properties: {
                    tags: {
                        type: 'array',
                        items: { type: 'string' },
                        minItems: 1,
                        maxItems: 5,
                    },
                },
            };
            expect((0, openapi_validator_js_1.validateData)(schema, { tags: ['a', 'b'] })).toBeNull();
            expect((0, openapi_validator_js_1.validateData)(schema, { tags: [] })).not.toBeNull();
            expect((0, openapi_validator_js_1.validateData)(schema, { tags: ['a', 'b', 'c', 'd', 'e', 'f'] })).not.toBeNull();
        });
        it('should validate pattern for strings', () => {
            const schema = {
                type: 'object',
                properties: {
                    zipcode: { type: 'string', pattern: '^\\d{5}$' },
                },
            };
            expect((0, openapi_validator_js_1.validateData)(schema, { zipcode: '12345' })).toBeNull();
            expect((0, openapi_validator_js_1.validateData)(schema, { zipcode: '1234' })).not.toBeNull();
            expect((0, openapi_validator_js_1.validateData)(schema, { zipcode: 'abcde' })).not.toBeNull();
        });
        it('should validate enum values', () => {
            const schema = {
                type: 'object',
                properties: {
                    status: { type: 'string', enum: ['active', 'inactive', 'pending'] },
                },
            };
            expect((0, openapi_validator_js_1.validateData)(schema, { status: 'active' })).toBeNull();
            expect((0, openapi_validator_js_1.validateData)(schema, { status: 'deleted' })).not.toBeNull();
        });
    });
    describe('Required Fields', () => {
        it('should validate required fields', () => {
            const schema = {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    email: { type: 'string' },
                },
                required: ['name', 'email'],
            };
            expect((0, openapi_validator_js_1.validateData)(schema, { name: 'John', email: 'john@example.com' })).toBeNull();
            expect((0, openapi_validator_js_1.validateData)(schema, { name: 'John' })).not.toBeNull();
            expect((0, openapi_validator_js_1.validateData)(schema, { email: 'john@example.com' })).not.toBeNull();
        });
        it('should allow optional fields to be missing', () => {
            const schema = {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    nickname: { type: 'string' },
                },
                required: ['name'],
            };
            expect((0, openapi_validator_js_1.validateData)(schema, { name: 'John' })).toBeNull();
            expect((0, openapi_validator_js_1.validateData)(schema, { name: 'John', nickname: 'Johnny' })).toBeNull();
        });
    });
    describe('Nested Objects', () => {
        it('should validate nested object structures', () => {
            const schema = {
                type: 'object',
                properties: {
                    user: {
                        type: 'object',
                        properties: {
                            profile: {
                                type: 'object',
                                properties: {
                                    firstName: { type: 'string' },
                                    lastName: { type: 'string' },
                                },
                                required: ['firstName', 'lastName'],
                            },
                        },
                        required: ['profile'],
                    },
                },
                required: ['user'],
            };
            const validData = {
                user: {
                    profile: {
                        firstName: 'John',
                        lastName: 'Doe',
                    },
                },
            };
            expect((0, openapi_validator_js_1.validateData)(schema, validData)).toBeNull();
            const invalidData = {
                user: {
                    profile: {
                        firstName: 'John',
                        // Missing lastName
                    },
                },
            };
            expect((0, openapi_validator_js_1.validateData)(schema, invalidData)).not.toBeNull();
        });
    });
    describe('Arrays of Objects', () => {
        it('should validate arrays of objects', () => {
            const schema = {
                type: 'object',
                properties: {
                    users: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id: { type: 'integer' },
                                name: { type: 'string' },
                            },
                            required: ['id', 'name'],
                        },
                    },
                },
            };
            const validData = {
                users: [
                    { id: 1, name: 'Alice' },
                    { id: 2, name: 'Bob' },
                ],
            };
            expect((0, openapi_validator_js_1.validateData)(schema, validData)).toBeNull();
            const invalidData = {
                users: [
                    { id: 1, name: 'Alice' },
                    { id: 'two', name: 'Bob' }, // Invalid id type
                ],
            };
            expect((0, openapi_validator_js_1.validateData)(schema, invalidData)).not.toBeNull();
        });
    });
    describe('Additional Properties', () => {
        it('should allow additional properties by default', () => {
            const schema = {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                },
            };
            const dataWithExtra = {
                name: 'John',
                extraField: 'extra',
            };
            expect((0, openapi_validator_js_1.validateData)(schema, dataWithExtra)).toBeNull();
        });
        it('should reject additional properties when disabled', () => {
            const schema = {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                },
                additionalProperties: false,
            };
            const dataWithExtra = {
                name: 'John',
                extraField: 'extra',
            };
            expect((0, openapi_validator_js_1.validateData)(schema, dataWithExtra)).not.toBeNull();
        });
    });
    describe('Error Reporting', () => {
        it('should return detailed error information', () => {
            const schema = {
                type: 'object',
                properties: {
                    email: { type: 'string', format: 'email' },
                    age: { type: 'integer', minimum: 0 },
                },
                required: ['email'],
            };
            const invalidData = {
                email: 'not-an-email',
                age: -5,
            };
            const errors = (0, openapi_validator_js_1.validateData)(schema, invalidData);
            expect(errors).not.toBeNull();
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0]).toHaveProperty('path');
            expect(errors[0]).toHaveProperty('message');
        });
        it('should report all errors when allErrors is enabled', () => {
            const schema = {
                type: 'object',
                properties: {
                    name: { type: 'string', minLength: 3 },
                    email: { type: 'string', format: 'email' },
                    age: { type: 'integer', minimum: 0 },
                },
                required: ['name', 'email', 'age'],
            };
            const invalidData = {
                name: 'ab',
                email: 'invalid',
                age: -1,
            };
            const errors = (0, openapi_validator_js_1.validateData)(schema, invalidData);
            expect(errors).not.toBeNull();
            expect(errors.length).toBeGreaterThanOrEqual(3);
        });
    });
    describe('Edge Cases', () => {
        it('should handle null values', () => {
            const schema = {
                type: 'object',
                properties: {
                    value: { type: ['string', 'null'] },
                },
            };
            expect((0, openapi_validator_js_1.validateData)(schema, { value: null })).toBeNull();
            expect((0, openapi_validator_js_1.validateData)(schema, { value: 'text' })).toBeNull();
        });
        it('should handle empty objects', () => {
            const schema = {
                type: 'object',
                properties: {},
            };
            expect((0, openapi_validator_js_1.validateData)(schema, {})).toBeNull();
        });
        it('should handle empty arrays', () => {
            const schema = {
                type: 'object',
                properties: {
                    items: {
                        type: 'array',
                        items: { type: 'string' },
                    },
                },
            };
            expect((0, openapi_validator_js_1.validateData)(schema, { items: [] })).toBeNull();
        });
    });
});
