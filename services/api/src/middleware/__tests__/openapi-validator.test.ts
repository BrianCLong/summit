/**
 * Tests for OpenAPI validation middleware
 * MIT License - Copyright (c) 2025 IntelGraph
 */

import { describe, it, expect } from '@jest/globals';
import { validateData } from '../openapi-validator.js';

describe('OpenAPI Validator', () => {
  describe('validateData', () => {
    it('should validate valid data against schema', () => {
      const schema = {
        type: 'object',
        required: ['name', 'email'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          age: { type: 'integer', minimum: 0 },
        },
      };

      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      };

      const errors = validateData(schema, validData);
      expect(errors).toBeNull();
    });

    it('should return errors for invalid data', () => {
      const schema = {
        type: 'object',
        required: ['name', 'email'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
        },
      };

      const invalidData = {
        name: 'John Doe',
        // missing email
      };

      const errors = validateData(schema, invalidData);
      expect(errors).not.toBeNull();
      expect(errors!.length).toBeGreaterThan(0);
      expect(errors![0].message).toContain('email');
    });

    it('should validate nested objects', () => {
      const schema = {
        type: 'object',
        required: ['user'],
        properties: {
          user: {
            type: 'object',
            required: ['id'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
      };

      const validData = {
        user: {
          id: 'user123',
          name: 'John',
        },
      };

      const errors = validateData(schema, validData);
      expect(errors).toBeNull();
    });

    it('should validate arrays', () => {
      const schema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id'],
              properties: {
                id: { type: 'string' },
              },
            },
          },
        },
      };

      const validData = {
        items: [{ id: 'item1' }, { id: 'item2' }],
      };

      const errors = validateData(schema, validData);
      expect(errors).toBeNull();
    });

    it('should validate string formats', () => {
      const schema = {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          uri: { type: 'string', format: 'uri' },
          date: { type: 'string', format: 'date' },
        },
      };

      const validData = {
        email: 'test@example.com',
        uri: 'https://example.com',
        date: '2025-01-15',
      };

      const errors = validateData(schema, validData);
      expect(errors).toBeNull();
    });

    it('should return errors for invalid format', () => {
      const schema = {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
        },
      };

      const invalidData = {
        email: 'not-an-email',
      };

      const errors = validateData(schema, invalidData);
      expect(errors).not.toBeNull();
      expect(errors!.length).toBeGreaterThan(0);
    });

    it('should validate numeric constraints', () => {
      const schema = {
        type: 'object',
        properties: {
          age: { type: 'integer', minimum: 0, maximum: 120 },
          score: { type: 'number', minimum: 0, maximum: 100 },
        },
      };

      const validData = { age: 25, score: 85.5 };
      expect(validateData(schema, validData)).toBeNull();

      const invalidData = { age: -1, score: 150 };
      const errors = validateData(schema, invalidData);
      expect(errors).not.toBeNull();
      expect(errors!.length).toBe(2);
    });

    it('should validate enums', () => {
      const schema = {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['draft', 'open', 'closed'] },
        },
      };

      const validData = { status: 'open' };
      expect(validateData(schema, validData)).toBeNull();

      const invalidData = { status: 'invalid' };
      const errors = validateData(schema, invalidData);
      expect(errors).not.toBeNull();
    });
  });
});
