/**
 * Tests for TemplateValidator
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { TemplateValidator } from '../../src/core/validator.js';
import type { PromptTemplate } from '../../src/core/types.js';

describe('TemplateValidator', () => {
  let validator: TemplateValidator;

  beforeEach(() => {
    validator = new TemplateValidator();
  });

  describe('validate', () => {
    it('should validate a valid template', () => {
      const template: PromptTemplate = {
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
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject template with missing required fields', () => {
      const template = {
        id: 'test',
        name: 'Test',
        // missing version, category, type, content
      } as any;

      const result = validator.validate(template);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should reject template with invalid ID pattern', () => {
      const template: any = {
        id: 'Invalid Template ID!', // contains spaces and special chars
        name: 'Test',
        version: '1.0.0',
        category: 'core',
        type: 'custom',
        content: 'Test',
      };

      const result = validator.validate(template);
      expect(result.valid).toBe(false);
    });

    it('should reject template with invalid version format', () => {
      const template: any = {
        id: 'test-template',
        name: 'Test',
        version: '1.0', // should be semantic version
        category: 'core',
        type: 'custom',
        content: 'Test',
      };

      const result = validator.validate(template);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateContext', () => {
    const template: PromptTemplate = {
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

    it('should validate context with all required variables', () => {
      const context = {
        requiredVar: 'value',
      };

      const result = validator.validateContext(template, context);
      expect(result.valid).toBe(true);
    });

    it('should reject context missing required variable', () => {
      const context = {
        optionalVar: 42,
      };

      const result = validator.validateContext(template, context);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('requiredVar');
    });

    it('should validate variable types', () => {
      const context = {
        requiredVar: 123, // should be string
      };

      const result = validator.validateContext(template, context);
      expect(result.valid).toBe(false);
      expect(result.errors![0].message).toContain('should be string');
    });
  });

  describe('validateContent', () => {
    it('should detect undefined variables in content', () => {
      const template: PromptTemplate = {
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
      expect(result.valid).toBe(false);
      expect(result.errors![0].message).toContain('undefinedVar');
    });

    it('should validate minimum content length', () => {
      const template: PromptTemplate = {
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
      expect(result.valid).toBe(false);
      expect(result.errors![0].message).toContain('at least 100');
    });
  });

  describe('validateAll', () => {
    it('should run all validation checks', () => {
      const template: PromptTemplate = {
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
      expect(result.valid).toBe(true);
    });
  });
});
