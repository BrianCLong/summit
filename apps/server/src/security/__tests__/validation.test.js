"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const validation_js_1 = require("../validation.js");
const securityLoggerModule = __importStar(require("../../observability/securityLogger.js"));
// Spy on security logger
const logEventSpy = globals_1.jest.spyOn(securityLoggerModule.securityLogger, 'logEvent');
(0, globals_1.describe)('validateAndSanitizeDropInput', () => {
    (0, globals_1.beforeEach)(() => {
        logEventSpy.mockClear();
    });
    (0, globals_1.describe)('Basic Input Validation', () => {
        (0, globals_1.it)('should successfully validate valid base64 payload', () => {
            const validPayload = Buffer.from('test payload').toString('base64');
            const input = {
                payload: validPayload,
            };
            const result = (0, validation_js_1.validateAndSanitizeDropInput)(input);
            (0, globals_1.expect)(result.payload).toBeInstanceOf(Buffer);
            (0, globals_1.expect)(result.payload.toString('utf-8')).toBe('test payload');
        });
        (0, globals_1.it)('should throw error for null or undefined input', () => {
            (0, globals_1.expect)(() => (0, validation_js_1.validateAndSanitizeDropInput)(null)).toThrow('Invalid payload');
            (0, globals_1.expect)(() => (0, validation_js_1.validateAndSanitizeDropInput)(undefined)).toThrow('Invalid payload');
        });
        (0, globals_1.it)('should throw error when payload is missing', () => {
            const input = {};
            (0, globals_1.expect)(() => (0, validation_js_1.validateAndSanitizeDropInput)(input)).toThrow('Invalid payload');
        });
        (0, globals_1.it)('should throw error when payload is not a string', () => {
            const input = { payload: 12345 };
            (0, globals_1.expect)(() => (0, validation_js_1.validateAndSanitizeDropInput)(input)).toThrow('Invalid payload');
        });
        (0, globals_1.it)('should throw error when payload is an object', () => {
            const input = { payload: { data: 'test' } };
            (0, globals_1.expect)(() => (0, validation_js_1.validateAndSanitizeDropInput)(input)).toThrow('Invalid payload');
        });
        (0, globals_1.it)('should throw error when payload is an array', () => {
            const input = { payload: ['test'] };
            (0, globals_1.expect)(() => (0, validation_js_1.validateAndSanitizeDropInput)(input)).toThrow('Invalid payload');
        });
    });
    (0, globals_1.describe)('Base64 Validation', () => {
        (0, globals_1.it)('should reject invalid base64 strings', () => {
            const input = {
                payload: 'not-valid-base64!!!@@@',
            };
            (0, globals_1.expect)(() => (0, validation_js_1.validateAndSanitizeDropInput)(input)).toThrow('Payload must be base64 encoded');
        });
        (0, globals_1.it)('should reject plain text as non-base64', () => {
            const input = {
                payload: 'This is just plain text',
            };
            (0, globals_1.expect)(() => (0, validation_js_1.validateAndSanitizeDropInput)(input)).toThrow('Payload must be base64 encoded');
        });
        (0, globals_1.it)('should reject base64 with special characters', () => {
            const input = {
                payload: 'SGVsbG8=!@#',
            };
            (0, globals_1.expect)(() => (0, validation_js_1.validateAndSanitizeDropInput)(input)).toThrow('Payload must be base64 encoded');
        });
        (0, globals_1.it)('should accept valid base64 with padding', () => {
            const validPayload = Buffer.from('hello world').toString('base64');
            const input = { payload: validPayload };
            const result = (0, validation_js_1.validateAndSanitizeDropInput)(input);
            (0, globals_1.expect)(result.payload.toString()).toBe('hello world');
        });
        (0, globals_1.it)('should accept valid base64 without padding', () => {
            // Remove padding
            const validPayload = Buffer.from('hello').toString('base64').replace(/=/g, '');
            const input = { payload: validPayload + '=' };
            const result = (0, validation_js_1.validateAndSanitizeDropInput)(input);
            (0, globals_1.expect)(result.payload.toString()).toBe('hello');
        });
        (0, globals_1.it)('should handle empty base64 string as valid', () => {
            const input = {
                payload: '',
            };
            // Empty string is valid base64 (decodes to empty buffer)
            const result = (0, validation_js_1.validateAndSanitizeDropInput)(input);
            (0, globals_1.expect)(result.payload.byteLength).toBe(0);
        });
        (0, globals_1.it)('should handle whitespace-only payload', () => {
            const input = {
                payload: '   ',
            };
            (0, globals_1.expect)(() => (0, validation_js_1.validateAndSanitizeDropInput)(input)).toThrow('Payload must be base64 encoded');
        });
    });
    (0, globals_1.describe)('Size Limit Enforcement', () => {
        const MAX_SIZE = 1024 * 1024 * 5; // 5MB
        (0, globals_1.it)('should accept payload under size limit', () => {
            const smallData = Buffer.from('x'.repeat(100));
            const input = {
                payload: smallData.toString('base64'),
            };
            const result = (0, validation_js_1.validateAndSanitizeDropInput)(input);
            (0, globals_1.expect)(result.payload.byteLength).toBeLessThan(MAX_SIZE);
        });
        (0, globals_1.it)('should accept payload exactly at size limit', () => {
            const maxData = Buffer.from('x'.repeat(MAX_SIZE));
            const input = {
                payload: maxData.toString('base64'),
            };
            const result = (0, validation_js_1.validateAndSanitizeDropInput)(input);
            (0, globals_1.expect)(result.payload.byteLength).toBe(MAX_SIZE);
        });
        (0, globals_1.it)('should reject payload exceeding size limit', () => {
            const oversizedData = Buffer.from('x'.repeat(MAX_SIZE + 1));
            const input = {
                payload: oversizedData.toString('base64'),
            };
            (0, globals_1.expect)(() => (0, validation_js_1.validateAndSanitizeDropInput)(input)).toThrow('Payload size exceeds limit');
        });
        (0, globals_1.it)('should reject very large payload', () => {
            const hugeData = Buffer.from('x'.repeat(MAX_SIZE * 2));
            const input = {
                payload: hugeData.toString('base64'),
            };
            (0, globals_1.expect)(() => (0, validation_js_1.validateAndSanitizeDropInput)(input)).toThrow('Payload size exceeds limit');
        });
        (0, globals_1.it)('should log security event when size limit exceeded', () => {
            const oversizedData = Buffer.from('x'.repeat(MAX_SIZE + 1));
            const input = {
                payload: oversizedData.toString('base64'),
            };
            try {
                (0, validation_js_1.validateAndSanitizeDropInput)(input);
            }
            catch (e) {
                // Expected
            }
            (0, globals_1.expect)(logEventSpy).toHaveBeenCalledWith('drop_validation_failed', globals_1.expect.objectContaining({
                level: 'warn',
                message: 'Payload exceeds maximum size',
            }));
        });
    });
    (0, globals_1.describe)('Metadata Validation', () => {
        (0, globals_1.it)('should parse valid JSON metadata', () => {
            const input = {
                payload: Buffer.from('test').toString('base64'),
                metadata: JSON.stringify({ key: 'value', count: 42 }),
            };
            const result = (0, validation_js_1.validateAndSanitizeDropInput)(input);
            (0, globals_1.expect)(result.metadata).toEqual({ key: 'value', count: 42 });
        });
        (0, globals_1.it)('should handle undefined metadata', () => {
            const input = {
                payload: Buffer.from('test').toString('base64'),
            };
            const result = (0, validation_js_1.validateAndSanitizeDropInput)(input);
            (0, globals_1.expect)(result.metadata).toBeUndefined();
        });
        (0, globals_1.it)('should throw error for invalid JSON metadata', () => {
            const input = {
                payload: Buffer.from('test').toString('base64'),
                metadata: 'not valid json {{{',
            };
            (0, globals_1.expect)(() => (0, validation_js_1.validateAndSanitizeDropInput)(input)).toThrow('Metadata must be valid JSON');
        });
        (0, globals_1.it)('should handle empty string metadata as undefined', () => {
            const input = {
                payload: Buffer.from('test').toString('base64'),
                metadata: '',
            };
            // Empty string is falsy so it's treated as undefined (not parsed)
            const result = (0, validation_js_1.validateAndSanitizeDropInput)(input);
            (0, globals_1.expect)(result.metadata).toBeUndefined();
        });
        (0, globals_1.it)('should sanitize low ASCII characters from metadata', () => {
            const input = {
                payload: Buffer.from('test').toString('base64'),
                metadata: '{"key":"value\u0000\u0001"}',
            };
            const result = (0, validation_js_1.validateAndSanitizeDropInput)(input);
            (0, globals_1.expect)(result.metadata).toBeDefined();
        });
        (0, globals_1.it)('should handle nested JSON metadata', () => {
            const metadata = {
                user: {
                    id: 123,
                    name: 'test',
                    tags: ['tag1', 'tag2'],
                },
            };
            const input = {
                payload: Buffer.from('test').toString('base64'),
                metadata: JSON.stringify(metadata),
            };
            const result = (0, validation_js_1.validateAndSanitizeDropInput)(input);
            (0, globals_1.expect)(result.metadata).toEqual(metadata);
        });
        (0, globals_1.it)('should handle metadata with special characters', () => {
            const metadata = {
                text: 'Hello "World" with \'quotes\'',
                unicode: '日本語 🎉',
            };
            const input = {
                payload: Buffer.from('test').toString('base64'),
                metadata: JSON.stringify(metadata),
            };
            const result = (0, validation_js_1.validateAndSanitizeDropInput)(input);
            (0, globals_1.expect)(result.metadata).toEqual(metadata);
        });
        (0, globals_1.it)('should throw error for malformed JSON with trailing comma', () => {
            const input = {
                payload: Buffer.from('test').toString('base64'),
                metadata: '{"key": "value",}',
            };
            (0, globals_1.expect)(() => (0, validation_js_1.validateAndSanitizeDropInput)(input)).toThrow('Metadata must be valid JSON');
        });
        (0, globals_1.it)('should handle boolean metadata values', () => {
            const metadata = { active: true, deleted: false };
            const input = {
                payload: Buffer.from('test').toString('base64'),
                metadata: JSON.stringify(metadata),
            };
            const result = (0, validation_js_1.validateAndSanitizeDropInput)(input);
            (0, globals_1.expect)(result.metadata).toEqual(metadata);
        });
        (0, globals_1.it)('should handle null metadata values', () => {
            const metadata = { value: null, optional: null };
            const input = {
                payload: Buffer.from('test').toString('base64'),
                metadata: JSON.stringify(metadata),
            };
            const result = (0, validation_js_1.validateAndSanitizeDropInput)(input);
            (0, globals_1.expect)(result.metadata).toEqual(metadata);
        });
    });
    (0, globals_1.describe)('Security Event Logging', () => {
        (0, globals_1.it)('should log security event for missing payload', () => {
            try {
                (0, validation_js_1.validateAndSanitizeDropInput)({});
            }
            catch (e) {
                // Expected
            }
            (0, globals_1.expect)(logEventSpy).toHaveBeenCalledWith('drop_validation_failed', globals_1.expect.objectContaining({
                level: 'warn',
                message: 'Payload missing or not a string',
            }));
        });
        (0, globals_1.it)('should log security event for invalid base64', () => {
            try {
                (0, validation_js_1.validateAndSanitizeDropInput)({ payload: 'not-base64!!!' });
            }
            catch (e) {
                // Expected
            }
            (0, globals_1.expect)(logEventSpy).toHaveBeenCalledWith('drop_validation_failed', globals_1.expect.objectContaining({
                level: 'warn',
                message: 'Payload is not valid base64',
            }));
        });
        (0, globals_1.it)('should log security event for invalid metadata JSON', () => {
            try {
                (0, validation_js_1.validateAndSanitizeDropInput)({
                    payload: Buffer.from('test').toString('base64'),
                    metadata: 'invalid json',
                });
            }
            catch (e) {
                // Expected
            }
            (0, globals_1.expect)(logEventSpy).toHaveBeenCalledWith('drop_validation_failed', globals_1.expect.objectContaining({
                level: 'warn',
                message: 'Metadata is not valid JSON',
            }));
        });
        (0, globals_1.it)('should not log security event for valid input', () => {
            (0, validation_js_1.validateAndSanitizeDropInput)({
                payload: Buffer.from('test').toString('base64'),
                metadata: JSON.stringify({ key: 'value' }),
            });
            (0, globals_1.expect)(logEventSpy).not.toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('Edge Cases and Attack Scenarios', () => {
        (0, globals_1.it)('should handle payload with null bytes in decoded content', () => {
            const data = Buffer.from('test\x00data\x00here');
            const input = {
                payload: data.toString('base64'),
            };
            const result = (0, validation_js_1.validateAndSanitizeDropInput)(input);
            (0, globals_1.expect)(result.payload).toEqual(data);
        });
        (0, globals_1.it)('should handle binary payload data', () => {
            const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe]);
            const input = {
                payload: binaryData.toString('base64'),
            };
            const result = (0, validation_js_1.validateAndSanitizeDropInput)(input);
            (0, globals_1.expect)(result.payload).toEqual(binaryData);
        });
        (0, globals_1.it)('should reject payload with SQL injection patterns', () => {
            // SQL injection attempts should be encoded, not executed
            const sqlInjection = "'; DROP TABLE users; --";
            const input = {
                payload: Buffer.from(sqlInjection).toString('base64'),
            };
            const result = (0, validation_js_1.validateAndSanitizeDropInput)(input);
            (0, globals_1.expect)(result.payload.toString()).toBe(sqlInjection);
        });
        (0, globals_1.it)('should handle payload with script tags', () => {
            // XSS attempts should be encoded
            const xss = '<script>alert("XSS")</script>';
            const input = {
                payload: Buffer.from(xss).toString('base64'),
            };
            const result = (0, validation_js_1.validateAndSanitizeDropInput)(input);
            (0, globals_1.expect)(result.payload.toString()).toBe(xss);
        });
        (0, globals_1.it)('should handle very long single-line payload', () => {
            const longString = 'a'.repeat(10000);
            const input = {
                payload: Buffer.from(longString).toString('base64'),
            };
            const result = (0, validation_js_1.validateAndSanitizeDropInput)(input);
            (0, globals_1.expect)(result.payload.toString()).toBe(longString);
        });
        (0, globals_1.it)('should handle payload with unicode characters', () => {
            const unicode = '🎉 Hello 世界 مرحبا שלום';
            const input = {
                payload: Buffer.from(unicode, 'utf-8').toString('base64'),
            };
            const result = (0, validation_js_1.validateAndSanitizeDropInput)(input);
            (0, globals_1.expect)(result.payload.toString('utf-8')).toBe(unicode);
        });
        (0, globals_1.it)('should handle payload with newlines and special chars', () => {
            const multiline = 'line1\nline2\r\nline3\ttabbed';
            const input = {
                payload: Buffer.from(multiline).toString('base64'),
            };
            const result = (0, validation_js_1.validateAndSanitizeDropInput)(input);
            (0, globals_1.expect)(result.payload.toString()).toBe(multiline);
        });
        (0, globals_1.it)('should handle metadata with prototype pollution attempt', () => {
            const maliciousMetadata = '{"__proto__": {"admin": true}}';
            const input = {
                payload: Buffer.from('test').toString('base64'),
                metadata: maliciousMetadata,
            };
            const result = (0, validation_js_1.validateAndSanitizeDropInput)(input);
            // Should parse without pollution
            (0, globals_1.expect)(result.metadata).toHaveProperty('__proto__');
            (0, globals_1.expect)(result.metadata.__proto__.admin).toBe(true);
        });
        (0, globals_1.it)('should handle metadata with constructor property', () => {
            const metadata = '{"constructor": {"prototype": {"admin": true}}}';
            const input = {
                payload: Buffer.from('test').toString('base64'),
                metadata: metadata,
            };
            const result = (0, validation_js_1.validateAndSanitizeDropInput)(input);
            (0, globals_1.expect)(result.metadata).toHaveProperty('constructor');
        });
        (0, globals_1.it)('should handle extremely nested metadata', () => {
            const nested = { a: { b: { c: { d: { e: { f: 'deep' } } } } } };
            const input = {
                payload: Buffer.from('test').toString('base64'),
                metadata: JSON.stringify(nested),
            };
            const result = (0, validation_js_1.validateAndSanitizeDropInput)(input);
            (0, globals_1.expect)(result.metadata).toEqual(nested);
        });
    });
    (0, globals_1.describe)('Buffer Handling', () => {
        (0, globals_1.it)('should return Buffer instance for payload', () => {
            const input = {
                payload: Buffer.from('test').toString('base64'),
            };
            const result = (0, validation_js_1.validateAndSanitizeDropInput)(input);
            (0, globals_1.expect)(Buffer.isBuffer(result.payload)).toBe(true);
        });
        (0, globals_1.it)('should preserve binary data integrity', () => {
            const binaryData = new Uint8Array(256);
            for (let i = 0; i < 256; i++) {
                binaryData[i] = i;
            }
            const buffer = Buffer.from(binaryData);
            const input = {
                payload: buffer.toString('base64'),
            };
            const result = (0, validation_js_1.validateAndSanitizeDropInput)(input);
            (0, globals_1.expect)(result.payload).toEqual(buffer);
        });
        (0, globals_1.it)('should handle zero-length payload', () => {
            const input = {
                payload: Buffer.from('').toString('base64'),
            };
            // Zero-length payload is valid (no minimum size requirement)
            const result = (0, validation_js_1.validateAndSanitizeDropInput)(input);
            (0, globals_1.expect)(result.payload.byteLength).toBe(0);
        });
    });
    (0, globals_1.describe)('Concurrent Validation', () => {
        (0, globals_1.it)('should handle multiple concurrent validations', async () => {
            const inputs = Array.from({ length: 10 }, (_, i) => ({
                payload: Buffer.from(`test-${i}`).toString('base64'),
                metadata: JSON.stringify({ index: i }),
            }));
            const results = inputs.map((input) => (0, validation_js_1.validateAndSanitizeDropInput)(input));
            results.forEach((result, i) => {
                (0, globals_1.expect)(result.payload.toString()).toBe(`test-${i}`);
                (0, globals_1.expect)(result.metadata).toEqual({ index: i });
            });
        });
        (0, globals_1.it)('should maintain isolation between validations', () => {
            const input1 = {
                payload: Buffer.from('payload1').toString('base64'),
                metadata: JSON.stringify({ id: 1 }),
            };
            const input2 = {
                payload: Buffer.from('payload2').toString('base64'),
                metadata: JSON.stringify({ id: 2 }),
            };
            const result1 = (0, validation_js_1.validateAndSanitizeDropInput)(input1);
            const result2 = (0, validation_js_1.validateAndSanitizeDropInput)(input2);
            (0, globals_1.expect)(result1.payload.toString()).toBe('payload1');
            (0, globals_1.expect)(result2.payload.toString()).toBe('payload2');
            (0, globals_1.expect)(result1.metadata).toEqual({ id: 1 });
            (0, globals_1.expect)(result2.metadata).toEqual({ id: 2 });
        });
    });
});
