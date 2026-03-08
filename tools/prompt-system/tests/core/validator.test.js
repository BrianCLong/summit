"use strict";
/**
 * Tests for TemplateValidator
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const validator_js_1 = require("../../src/core/validator.js");
(0, globals_1.describe)('TemplateValidator', () => {
    let validator;
    (0, globals_1.beforeEach)(() => {
        validator = new validator_js_1.TemplateValidator();
    });
    (0, globals_1.describe)('validate', () => {
        (0, globals_1.it)('should validate a valid template', () => {
            const template = {
                id: 'test-template',
                name: 'Test Template',
                version: '1.0.0',
                category: 'core',
                type: 'custom',
                content: 'Test content with {{variable}}',
                variables: [
                    {
                        name: 'variable',
                        type: 'string',
                        required: true,
                    },
                ],
            };
            const result = validator.validate(template);
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.errors).toBeUndefined();
        });
        (0, globals_1.it)('should reject template with missing required fields', () => {
            const template = {
                id: 'test',
                name: 'Test',
                // missing version, category, type, content
            };
            const result = validator.validate(template);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toBeDefined();
            (0, globals_1.expect)(result.errors.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should reject template with invalid ID pattern', () => {
            const template = {
                id: 'Invalid Template ID!', // contains spaces and special chars
                name: 'Test',
                version: '1.0.0',
                category: 'core',
                type: 'custom',
                content: 'Test',
            };
            const result = validator.validate(template);
            (0, globals_1.expect)(result.valid).toBe(false);
        });
        (0, globals_1.it)('should reject template with invalid version format', () => {
            const template = {
                id: 'test-template',
                name: 'Test',
                version: '1.0', // should be semantic version
                category: 'core',
                type: 'custom',
                content: 'Test',
            };
            const result = validator.validate(template);
            (0, globals_1.expect)(result.valid).toBe(false);
        });
    });
    (0, globals_1.describe)('validateContext', () => {
        const template = {
            id: 'test',
            name: 'Test',
            version: '1.0.0',
            category: 'core',
            type: 'custom',
            content: 'Test',
            variables: [
                {
                    name: 'requiredVar',
                    type: 'string',
                    required: true,
                },
                {
                    name: 'optionalVar',
                    type: 'number',
                    required: false,
                },
            ],
        };
        (0, globals_1.it)('should validate context with all required variables', () => {
            const context = {
                requiredVar: 'value',
            };
            const result = validator.validateContext(template, context);
            (0, globals_1.expect)(result.valid).toBe(true);
        });
        (0, globals_1.it)('should reject context missing required variable', () => {
            const context = {
                optionalVar: 42,
            };
            const result = validator.validateContext(template, context);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toBeDefined();
            (0, globals_1.expect)(result.errors[0].message).toContain('requiredVar');
        });
        (0, globals_1.it)('should validate variable types', () => {
            const context = {
                requiredVar: 123, // should be string
            };
            const result = validator.validateContext(template, context);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors[0].message).toContain('should be string');
        });
    });
    (0, globals_1.describe)('validateContent', () => {
        (0, globals_1.it)('should detect undefined variables in content', () => {
            const template = {
                id: 'test',
                name: 'Test',
                version: '1.0.0',
                category: 'core',
                type: 'custom',
                content: 'Test {{undefinedVar}}',
                variables: [
                    {
                        name: 'definedVar',
                        type: 'string',
                    },
                ],
            };
            const result = validator.validateContent(template);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors[0].message).toContain('undefinedVar');
        });
        (0, globals_1.it)('should validate minimum content length', () => {
            const template = {
                id: 'test',
                name: 'Test',
                version: '1.0.0',
                category: 'core',
                type: 'custom',
                content: 'Short',
                validationRules: {
                    minLength: 100,
                },
            };
            const result = validator.validateContent(template);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors[0].message).toContain('at least 100');
        });
    });
    (0, globals_1.describe)('validateAll', () => {
        (0, globals_1.it)('should run all validation checks', () => {
            const template = {
                id: 'test-template',
                name: 'Test Template',
                version: '1.0.0',
                category: 'core',
                type: 'custom',
                content: 'Test content with {{myVar}}',
                variables: [
                    {
                        name: 'myVar',
                        type: 'string',
                        required: true,
                    },
                ],
            };
            const context = {
                myVar: 'value',
            };
            const result = validator.validateAll(template, context);
            (0, globals_1.expect)(result.valid).toBe(true);
        });
    });
});
