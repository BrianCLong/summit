/**
 * Tests for OpenAPI Validator Middleware
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { Request, Response, NextFunction } from 'express';
import { validateData } from '../openapi-validator.js';

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

      const errors = validateData(schema, validData);
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

      const errors = validateData(schema, invalidData);
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

      expect(validateData(schema, { text: 'hello' })).toBeNull();
      expect(validateData(schema, { text: 123 })).not.toBeNull();
    });

    it('should validate number type', () => {
      const schema = {
        type: 'object',
        properties: {
          count: { type: 'number' },
        },
      };

      expect(validateData(schema, { count: 42 })).toBeNull();
      expect(validateData(schema, { count: '42' })).toBeNull(); // Coerced
    });

    it('should validate integer type', () => {
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'integer' },
        },
      };

      expect(validateData(schema, { id: 1 })).toBeNull();
      expect(validateData(schema, { id: 1.5 })).not.toBeNull();
    });

    it('should validate boolean type', () => {
      const schema = {
        type: 'object',
        properties: {
          active: { type: 'boolean' },
        },
      };

      expect(validateData(schema, { active: true })).toBeNull();
      expect(validateData(schema, { active: false })).toBeNull();
      expect(validateData(schema, { active: 'true' })).toBeNull(); // Coerced
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

      expect(validateData(schema, { tags: ['a', 'b', 'c'] })).toBeNull();
      expect(validateData(schema, { tags: [1, 2, 3] })).not.toBeNull();
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

      expect(
        validateData(schema, {
          address: { street: '123 Main St', city: 'NYC' },
        }),
      ).toBeNull();
      expect(validateData(schema, { address: 'not an object' })).not.toBeNull();
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

      expect(validateData(schema, { email: 'test@example.com' })).toBeNull();
      expect(validateData(schema, { email: 'invalid-email' })).not.toBeNull();
    });

    it('should validate date format', () => {
      const schema = {
        type: 'object',
        properties: {
          birthdate: { type: 'string', format: 'date' },
        },
      };

      expect(validateData(schema, { birthdate: '2025-01-01' })).toBeNull();
      expect(validateData(schema, { birthdate: 'not-a-date' })).not.toBeNull();
    });

    it('should validate date-time format', () => {
      const schema = {
        type: 'object',
        properties: {
          createdAt: { type: 'string', format: 'date-time' },
        },
      };

      expect(
        validateData(schema, { createdAt: '2025-01-01T12:00:00Z' }),
      ).toBeNull();
      expect(
        validateData(schema, { createdAt: 'not-a-datetime' }),
      ).not.toBeNull();
    });

    it('should validate uri format', () => {
      const schema = {
        type: 'object',
        properties: {
          website: { type: 'string', format: 'uri' },
        },
      };

      expect(
        validateData(schema, { website: 'https://example.com' }),
      ).toBeNull();
      expect(validateData(schema, { website: 'not-a-uri' })).not.toBeNull();
    });

    it('should validate uuid format', () => {
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      };

      expect(
        validateData(schema, {
          id: '123e4567-e89b-12d3-a456-426614174000',
        }),
      ).toBeNull();
      expect(validateData(schema, { id: 'not-a-uuid' })).not.toBeNull();
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

      expect(validateData(schema, { age: 25 })).toBeNull();
      expect(validateData(schema, { age: -1 })).not.toBeNull();
      expect(validateData(schema, { age: 200 })).not.toBeNull();
    });

    it('should validate minLength/maxLength for strings', () => {
      const schema = {
        type: 'object',
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 20 },
        },
      };

      expect(validateData(schema, { username: 'john' })).toBeNull();
      expect(validateData(schema, { username: 'ab' })).not.toBeNull();
      expect(
        validateData(schema, { username: 'a'.repeat(21) }),
      ).not.toBeNull();
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

      expect(validateData(schema, { tags: ['a', 'b'] })).toBeNull();
      expect(validateData(schema, { tags: [] })).not.toBeNull();
      expect(validateData(schema, { tags: ['a', 'b', 'c', 'd', 'e', 'f'] })).not.toBeNull();
    });

    it('should validate pattern for strings', () => {
      const schema = {
        type: 'object',
        properties: {
          zipcode: { type: 'string', pattern: '^\\d{5}$' },
        },
      };

      expect(validateData(schema, { zipcode: '12345' })).toBeNull();
      expect(validateData(schema, { zipcode: '1234' })).not.toBeNull();
      expect(validateData(schema, { zipcode: 'abcde' })).not.toBeNull();
    });

    it('should validate enum values', () => {
      const schema = {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'inactive', 'pending'] },
        },
      };

      expect(validateData(schema, { status: 'active' })).toBeNull();
      expect(validateData(schema, { status: 'deleted' })).not.toBeNull();
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

      expect(
        validateData(schema, { name: 'John', email: 'john@example.com' }),
      ).toBeNull();
      expect(validateData(schema, { name: 'John' })).not.toBeNull();
      expect(validateData(schema, { email: 'john@example.com' })).not.toBeNull();
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

      expect(validateData(schema, { name: 'John' })).toBeNull();
      expect(
        validateData(schema, { name: 'John', nickname: 'Johnny' }),
      ).toBeNull();
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

      expect(validateData(schema, validData)).toBeNull();

      const invalidData = {
        user: {
          profile: {
            firstName: 'John',
            // Missing lastName
          },
        },
      };

      expect(validateData(schema, invalidData)).not.toBeNull();
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

      expect(validateData(schema, validData)).toBeNull();

      const invalidData = {
        users: [
          { id: 1, name: 'Alice' },
          { id: 'two', name: 'Bob' }, // Invalid id type
        ],
      };

      expect(validateData(schema, invalidData)).not.toBeNull();
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

      expect(validateData(schema, dataWithExtra)).toBeNull();
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

      expect(validateData(schema, dataWithExtra)).not.toBeNull();
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

      const errors = validateData(schema, invalidData);

      expect(errors).not.toBeNull();
      expect(errors!.length).toBeGreaterThan(0);
      expect(errors![0]).toHaveProperty('path');
      expect(errors![0]).toHaveProperty('message');
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

      const errors = validateData(schema, invalidData);

      expect(errors).not.toBeNull();
      expect(errors!.length).toBeGreaterThanOrEqual(3);
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

      expect(validateData(schema, { value: null })).toBeNull();
      expect(validateData(schema, { value: 'text' })).toBeNull();
    });

    it('should handle empty objects', () => {
      const schema = {
        type: 'object',
        properties: {},
      };

      expect(validateData(schema, {})).toBeNull();
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

      expect(validateData(schema, { items: [] })).toBeNull();
    });
  });
});
