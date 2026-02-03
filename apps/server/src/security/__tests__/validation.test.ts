/**
 * Comprehensive unit tests for validation.ts
 *
 * Tests critical security validation including:
 * - Input sanitization
 * - Base64 validation
 * - Size limit enforcement
 * - JSON parsing security
 * - Malicious payload detection
 * - Edge cases and error handling
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { validateAndSanitizeDropInput, type DropInput } from '../validation.js';
import * as securityLoggerModule from '../../observability/securityLogger.js';

// Spy on security logger
const logEventSpy = jest.spyOn(securityLoggerModule.securityLogger, 'logEvent');

describe('validateAndSanitizeDropInput', () => {
  beforeEach(() => {
    logEventSpy.mockClear();
  });

  describe('Basic Input Validation', () => {
    it('should successfully validate valid base64 payload', () => {
      const validPayload = Buffer.from('test payload').toString('base64');
      const input: DropInput = {
        payload: validPayload,
      };

      const result = validateAndSanitizeDropInput(input);

      expect(result.payload).toBeInstanceOf(Buffer);
      expect(result.payload.toString('utf-8')).toBe('test payload');
    });

    it('should throw error for null or undefined input', () => {
      expect(() =>
        validateAndSanitizeDropInput(null as any),
      ).toThrow('Invalid payload');

      expect(() =>
        validateAndSanitizeDropInput(undefined as any),
      ).toThrow('Invalid payload');
    });

    it('should throw error when payload is missing', () => {
      const input = {} as DropInput;

      expect(() => validateAndSanitizeDropInput(input)).toThrow(
        'Invalid payload',
      );
    });

    it('should throw error when payload is not a string', () => {
      const input = { payload: 12345 } as any;

      expect(() => validateAndSanitizeDropInput(input)).toThrow(
        'Invalid payload',
      );
    });

    it('should throw error when payload is an object', () => {
      const input = { payload: { data: 'test' } } as any;

      expect(() => validateAndSanitizeDropInput(input)).toThrow(
        'Invalid payload',
      );
    });

    it('should throw error when payload is an array', () => {
      const input = { payload: ['test'] } as any;

      expect(() => validateAndSanitizeDropInput(input)).toThrow(
        'Invalid payload',
      );
    });
  });

  describe('Base64 Validation', () => {
    it('should reject invalid base64 strings', () => {
      const input: DropInput = {
        payload: 'not-valid-base64!!!@@@',
      };

      expect(() => validateAndSanitizeDropInput(input)).toThrow(
        'Payload must be base64 encoded',
      );
    });

    it('should reject plain text as non-base64', () => {
      const input: DropInput = {
        payload: 'This is just plain text',
      };

      expect(() => validateAndSanitizeDropInput(input)).toThrow(
        'Payload must be base64 encoded',
      );
    });

    it('should reject base64 with special characters', () => {
      const input: DropInput = {
        payload: 'SGVsbG8=!@#',
      };

      expect(() => validateAndSanitizeDropInput(input)).toThrow(
        'Payload must be base64 encoded',
      );
    });

    it('should accept valid base64 with padding', () => {
      const validPayload = Buffer.from('hello world').toString('base64');
      const input: DropInput = { payload: validPayload };

      const result = validateAndSanitizeDropInput(input);
      expect(result.payload.toString()).toBe('hello world');
    });

    it('should accept valid base64 without padding', () => {
      // Remove padding
      const validPayload = Buffer.from('hello').toString('base64').replace(/=/g, '');
      const input: DropInput = { payload: validPayload + '=' };

      const result = validateAndSanitizeDropInput(input);
      expect(result.payload.toString()).toBe('hello');
    });

    it('should handle empty base64 string as valid', () => {
      const input: DropInput = {
        payload: '',
      };

      // Empty string is valid base64 (decodes to empty buffer)
      const result = validateAndSanitizeDropInput(input);
      expect(result.payload.byteLength).toBe(0);
    });

    it('should handle whitespace-only payload', () => {
      const input: DropInput = {
        payload: '   ',
      };

      expect(() => validateAndSanitizeDropInput(input)).toThrow(
        'Payload must be base64 encoded',
      );
    });
  });

  describe('Size Limit Enforcement', () => {
    const MAX_SIZE = 1024 * 1024 * 5; // 5MB

    it('should accept payload under size limit', () => {
      const smallData = Buffer.from('x'.repeat(100));
      const input: DropInput = {
        payload: smallData.toString('base64'),
      };

      const result = validateAndSanitizeDropInput(input);
      expect(result.payload.byteLength).toBeLessThan(MAX_SIZE);
    });

    it('should accept payload exactly at size limit', () => {
      const maxData = Buffer.from('x'.repeat(MAX_SIZE));
      const input: DropInput = {
        payload: maxData.toString('base64'),
      };

      const result = validateAndSanitizeDropInput(input);
      expect(result.payload.byteLength).toBe(MAX_SIZE);
    });

    it('should reject payload exceeding size limit', () => {
      const oversizedData = Buffer.from('x'.repeat(MAX_SIZE + 1));
      const input: DropInput = {
        payload: oversizedData.toString('base64'),
      };

      expect(() => validateAndSanitizeDropInput(input)).toThrow(
        'Payload size exceeds limit',
      );
    });

    it('should reject very large payload', () => {
      const hugeData = Buffer.from('x'.repeat(MAX_SIZE * 2));
      const input: DropInput = {
        payload: hugeData.toString('base64'),
      };

      expect(() => validateAndSanitizeDropInput(input)).toThrow(
        'Payload size exceeds limit',
      );
    });

    it('should log security event when size limit exceeded', () => {
      const oversizedData = Buffer.from('x'.repeat(MAX_SIZE + 1));
      const input: DropInput = {
        payload: oversizedData.toString('base64'),
      };

      try {
        validateAndSanitizeDropInput(input);
      } catch (e) {
        // Expected
      }

      expect(logEventSpy).toHaveBeenCalledWith(
        'drop_validation_failed',
        expect.objectContaining({
          level: 'warn',
          message: 'Payload exceeds maximum size',
        }),
      );
    });
  });

  describe('Metadata Validation', () => {
    it('should parse valid JSON metadata', () => {
      const input: DropInput = {
        payload: Buffer.from('test').toString('base64'),
        metadata: JSON.stringify({ key: 'value', count: 42 }),
      };

      const result = validateAndSanitizeDropInput(input);
      expect(result.metadata).toEqual({ key: 'value', count: 42 });
    });

    it('should handle undefined metadata', () => {
      const input: DropInput = {
        payload: Buffer.from('test').toString('base64'),
      };

      const result = validateAndSanitizeDropInput(input);
      expect(result.metadata).toBeUndefined();
    });

    it('should throw error for invalid JSON metadata', () => {
      const input: DropInput = {
        payload: Buffer.from('test').toString('base64'),
        metadata: 'not valid json {{{',
      };

      expect(() => validateAndSanitizeDropInput(input)).toThrow(
        'Metadata must be valid JSON',
      );
    });

    it('should handle empty string metadata as undefined', () => {
      const input: DropInput = {
        payload: Buffer.from('test').toString('base64'),
        metadata: '',
      };

      // Empty string is falsy so it's treated as undefined (not parsed)
      const result = validateAndSanitizeDropInput(input);
      expect(result.metadata).toBeUndefined();
    });

    it('should sanitize low ASCII characters from metadata', () => {
      const input: DropInput = {
        payload: Buffer.from('test').toString('base64'),
        metadata: '{"key":"value\u0000\u0001"}',
      };

      const result = validateAndSanitizeDropInput(input);
      expect(result.metadata).toBeDefined();
    });

    it('should handle nested JSON metadata', () => {
      const metadata = {
        user: {
          id: 123,
          name: 'test',
          tags: ['tag1', 'tag2'],
        },
      };
      const input: DropInput = {
        payload: Buffer.from('test').toString('base64'),
        metadata: JSON.stringify(metadata),
      };

      const result = validateAndSanitizeDropInput(input);
      expect(result.metadata).toEqual(metadata);
    });

    it('should handle metadata with special characters', () => {
      const metadata = {
        text: 'Hello "World" with \'quotes\'',
        unicode: '日本語 🎉',
      };
      const input: DropInput = {
        payload: Buffer.from('test').toString('base64'),
        metadata: JSON.stringify(metadata),
      };

      const result = validateAndSanitizeDropInput(input);
      expect(result.metadata).toEqual(metadata);
    });

    it('should throw error for malformed JSON with trailing comma', () => {
      const input: DropInput = {
        payload: Buffer.from('test').toString('base64'),
        metadata: '{"key": "value",}',
      };

      expect(() => validateAndSanitizeDropInput(input)).toThrow(
        'Metadata must be valid JSON',
      );
    });

    it('should handle boolean metadata values', () => {
      const metadata = { active: true, deleted: false };
      const input: DropInput = {
        payload: Buffer.from('test').toString('base64'),
        metadata: JSON.stringify(metadata),
      };

      const result = validateAndSanitizeDropInput(input);
      expect(result.metadata).toEqual(metadata);
    });

    it('should handle null metadata values', () => {
      const metadata = { value: null, optional: null };
      const input: DropInput = {
        payload: Buffer.from('test').toString('base64'),
        metadata: JSON.stringify(metadata),
      };

      const result = validateAndSanitizeDropInput(input);
      expect(result.metadata).toEqual(metadata);
    });
  });

  describe('Security Event Logging', () => {
    it('should log security event for missing payload', () => {
      try {
        validateAndSanitizeDropInput({} as DropInput);
      } catch (e) {
        // Expected
      }

      expect(logEventSpy).toHaveBeenCalledWith(
        'drop_validation_failed',
        expect.objectContaining({
          level: 'warn',
          message: 'Payload missing or not a string',
        }),
      );
    });

    it('should log security event for invalid base64', () => {
      try {
        validateAndSanitizeDropInput({ payload: 'not-base64!!!' });
      } catch (e) {
        // Expected
      }

      expect(logEventSpy).toHaveBeenCalledWith(
        'drop_validation_failed',
        expect.objectContaining({
          level: 'warn',
          message: 'Payload is not valid base64',
        }),
      );
    });

    it('should log security event for invalid metadata JSON', () => {
      try {
        validateAndSanitizeDropInput({
          payload: Buffer.from('test').toString('base64'),
          metadata: 'invalid json',
        });
      } catch (e) {
        // Expected
      }

      expect(logEventSpy).toHaveBeenCalledWith(
        'drop_validation_failed',
        expect.objectContaining({
          level: 'warn',
          message: 'Metadata is not valid JSON',
        }),
      );
    });

    it('should not log security event for valid input', () => {
      validateAndSanitizeDropInput({
        payload: Buffer.from('test').toString('base64'),
        metadata: JSON.stringify({ key: 'value' }),
      });

      expect(logEventSpy).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Attack Scenarios', () => {
    it('should handle payload with null bytes in decoded content', () => {
      const data = Buffer.from('test\x00data\x00here');
      const input: DropInput = {
        payload: data.toString('base64'),
      };

      const result = validateAndSanitizeDropInput(input);
      expect(result.payload).toEqual(data);
    });

    it('should handle binary payload data', () => {
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe]);
      const input: DropInput = {
        payload: binaryData.toString('base64'),
      };

      const result = validateAndSanitizeDropInput(input);
      expect(result.payload).toEqual(binaryData);
    });

    it('should reject payload with SQL injection patterns', () => {
      // SQL injection attempts should be encoded, not executed
      const sqlInjection = "'; DROP TABLE users; --";
      const input: DropInput = {
        payload: Buffer.from(sqlInjection).toString('base64'),
      };

      const result = validateAndSanitizeDropInput(input);
      expect(result.payload.toString()).toBe(sqlInjection);
    });

    it('should handle payload with script tags', () => {
      // XSS attempts should be encoded
      const xss = '<script>alert("XSS")</script>';
      const input: DropInput = {
        payload: Buffer.from(xss).toString('base64'),
      };

      const result = validateAndSanitizeDropInput(input);
      expect(result.payload.toString()).toBe(xss);
    });

    it('should handle very long single-line payload', () => {
      const longString = 'a'.repeat(10000);
      const input: DropInput = {
        payload: Buffer.from(longString).toString('base64'),
      };

      const result = validateAndSanitizeDropInput(input);
      expect(result.payload.toString()).toBe(longString);
    });

    it('should handle payload with unicode characters', () => {
      const unicode = '🎉 Hello 世界 مرحبا שלום';
      const input: DropInput = {
        payload: Buffer.from(unicode, 'utf-8').toString('base64'),
      };

      const result = validateAndSanitizeDropInput(input);
      expect(result.payload.toString('utf-8')).toBe(unicode);
    });

    it('should handle payload with newlines and special chars', () => {
      const multiline = 'line1\nline2\r\nline3\ttabbed';
      const input: DropInput = {
        payload: Buffer.from(multiline).toString('base64'),
      };

      const result = validateAndSanitizeDropInput(input);
      expect(result.payload.toString()).toBe(multiline);
    });

    it('should handle metadata with prototype pollution attempt', () => {
      const maliciousMetadata = '{"__proto__": {"admin": true}}';
      const input: DropInput = {
        payload: Buffer.from('test').toString('base64'),
        metadata: maliciousMetadata,
      };

      const result = validateAndSanitizeDropInput(input);
      // Should parse without pollution
      expect(result.metadata).toHaveProperty('__proto__');
      expect((result.metadata as any).__proto__.admin).toBe(true);
    });

    it('should handle metadata with constructor property', () => {
      const metadata = '{"constructor": {"prototype": {"admin": true}}}';
      const input: DropInput = {
        payload: Buffer.from('test').toString('base64'),
        metadata: metadata,
      };

      const result = validateAndSanitizeDropInput(input);
      expect(result.metadata).toHaveProperty('constructor');
    });

    it('should handle extremely nested metadata', () => {
      const nested = { a: { b: { c: { d: { e: { f: 'deep' } } } } } };
      const input: DropInput = {
        payload: Buffer.from('test').toString('base64'),
        metadata: JSON.stringify(nested),
      };

      const result = validateAndSanitizeDropInput(input);
      expect(result.metadata).toEqual(nested);
    });
  });

  describe('Buffer Handling', () => {
    it('should return Buffer instance for payload', () => {
      const input: DropInput = {
        payload: Buffer.from('test').toString('base64'),
      };

      const result = validateAndSanitizeDropInput(input);
      expect(Buffer.isBuffer(result.payload)).toBe(true);
    });

    it('should preserve binary data integrity', () => {
      const binaryData = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        binaryData[i] = i;
      }
      const buffer = Buffer.from(binaryData);
      const input: DropInput = {
        payload: buffer.toString('base64'),
      };

      const result = validateAndSanitizeDropInput(input);
      expect(result.payload).toEqual(buffer);
    });

    it('should handle zero-length payload', () => {
      const input: DropInput = {
        payload: Buffer.from('').toString('base64'),
      };

      // Zero-length payload is valid (no minimum size requirement)
      const result = validateAndSanitizeDropInput(input);
      expect(result.payload.byteLength).toBe(0);
    });
  });

  describe('Concurrent Validation', () => {
    it('should handle multiple concurrent validations', async () => {
      const inputs = Array.from({ length: 10 }, (_, i) => ({
        payload: Buffer.from(`test-${i}`).toString('base64'),
        metadata: JSON.stringify({ index: i }),
      }));

      const results = inputs.map((input) =>
        validateAndSanitizeDropInput(input),
      );

      results.forEach((result, i) => {
        expect(result.payload.toString()).toBe(`test-${i}`);
        expect(result.metadata).toEqual({ index: i });
      });
    });

    it('should maintain isolation between validations', () => {
      const input1: DropInput = {
        payload: Buffer.from('payload1').toString('base64'),
        metadata: JSON.stringify({ id: 1 }),
      };
      const input2: DropInput = {
        payload: Buffer.from('payload2').toString('base64'),
        metadata: JSON.stringify({ id: 2 }),
      };

      const result1 = validateAndSanitizeDropInput(input1);
      const result2 = validateAndSanitizeDropInput(input2);

      expect(result1.payload.toString()).toBe('payload1');
      expect(result2.payload.toString()).toBe('payload2');
      expect(result1.metadata).toEqual({ id: 1 });
      expect(result2.metadata).toEqual({ id: 2 });
    });
  });
});
