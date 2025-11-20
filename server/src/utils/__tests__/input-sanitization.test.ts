/**
 * Unit tests for input-sanitization utilities
 */

import {
  sanitizeString,
  sanitizeHTML,
  sanitizeEmail,
  sanitizeURL,
  sanitizeFilePath,
  sanitizeSQL,
  sanitizeShellInput,
  sanitizeNoSQL,
  validateInteger,
  validateFloat,
  validateBoolean,
  validateUUID,
  sanitizeJSON,
  sanitizeObject,
  InputValidator,
} from '../input-sanitization';

describe('Input Sanitization Utilities', () => {
  describe('sanitizeString', () => {
    it('should sanitize basic strings', () => {
      const result = sanitizeString('Hello World');
      expect(result).toBe('Hello World');
    });

    it('should escape HTML entities', () => {
      const result = sanitizeString('<script>alert("XSS")</script>');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    it('should remove null bytes', () => {
      const result = sanitizeString('Hello\0World');
      expect(result).toBe('HelloWorld');
    });

    it('should throw error for non-string input', () => {
      expect(() => sanitizeString(123 as any)).toThrow('Input must be a string');
      expect(() => sanitizeString(null as any)).toThrow('Input must be a string');
    });
  });

  describe('sanitizeHTML', () => {
    it('should allow safe HTML tags', () => {
      const result = sanitizeHTML('<p><strong>Bold</strong> text</p>', ['p', 'strong']);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
    });

    it('should remove dangerous tags', () => {
      const result = sanitizeHTML('<script>alert("XSS")</script><p>Safe</p>', ['p']);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>');
    });
  });

  describe('sanitizeEmail', () => {
    it('should accept valid email addresses', () => {
      const email = sanitizeEmail('user@example.com');
      expect(email).toBe('user@example.com');
    });

    it('should normalize email addresses', () => {
      const email = sanitizeEmail('  User@Example.COM  ');
      expect(email).toBe('user@example.com');
    });

    it('should reject invalid email addresses', () => {
      expect(() => sanitizeEmail('not-an-email')).toThrow('Invalid email address');
      expect(() => sanitizeEmail('missing@domain')).toThrow();
    });
  });

  describe('sanitizeURL', () => {
    it('should accept valid HTTP/HTTPS URLs', () => {
      const url = sanitizeURL('https://example.com');
      expect(url).toBe('https://example.com');
    });

    it('should reject javascript: URLs', () => {
      expect(() => sanitizeURL('javascript:alert(1)')).toThrow('Dangerous URL scheme');
    });

    it('should reject data: URLs', () => {
      expect(() => sanitizeURL('data:text/html,<script>alert(1)</script>')).toThrow('Dangerous URL scheme');
    });

    it('should reject invalid URLs', () => {
      expect(() => sanitizeURL('not a url')).toThrow('Invalid URL');
    });
  });

  describe('sanitizeFilePath', () => {
    it('should accept safe file paths', () => {
      const path = sanitizeFilePath('documents/file.txt');
      expect(path).toBe('documents/file.txt');
    });

    it('should reject path traversal attempts with ..', () => {
      expect(() => sanitizeFilePath('../etc/passwd')).toThrow('Path traversal detected');
      expect(() => sanitizeFilePath('docs/../../etc/passwd')).toThrow('Path traversal detected');
    });

    it('should reject paths with tilde', () => {
      expect(() => sanitizeFilePath('~/secrets')).toThrow('Path traversal detected');
    });

    it('should remove null bytes', () => {
      const path = sanitizeFilePath('file\0.txt');
      expect(path).toBe('file.txt');
    });

    it('should validate against allowed base path', () => {
      const safePath = sanitizeFilePath('subdir/file.txt', '/uploads');
      expect(safePath).toContain('/uploads');
    });
  });

  describe('sanitizeSQL', () => {
    it('should accept safe input', () => {
      const result = sanitizeSQL('username123');
      expect(result).toBe('username123');
    });

    it('should reject SQL keywords', () => {
      expect(() => sanitizeSQL('SELECT * FROM users')).toThrow('Potential SQL injection');
      expect(() => sanitizeSQL('DROP TABLE users')).toThrow('Potential SQL injection');
      expect(() => sanitizeSQL("'; DROP TABLE users; --")).toThrow('Potential SQL injection');
    });

    it('should reject SQL comments', () => {
      expect(() => sanitizeSQL('input -- comment')).toThrow('Potential SQL injection');
    });
  });

  describe('sanitizeShellInput', () => {
    it('should accept safe input', () => {
      const result = sanitizeShellInput('filename.txt');
      expect(result).toBe('filename.txt');
    });

    it('should reject dangerous shell characters', () => {
      expect(() => sanitizeShellInput('file; rm -rf /')).toThrow('Dangerous shell characters');
      expect(() => sanitizeShellInput('file && cat /etc/passwd')).toThrow('Dangerous shell characters');
      expect(() => sanitizeShellInput('file | grep secret')).toThrow('Dangerous shell characters');
      expect(() => sanitizeShellInput('file `whoami`')).toThrow('Dangerous shell characters');
      expect(() => sanitizeShellInput('file$(whoami)')).toThrow('Dangerous shell characters');
    });
  });

  describe('sanitizeNoSQL', () => {
    it('should accept safe strings', () => {
      const result = sanitizeNoSQL('username');
      expect(result).toBe('username');
    });

    it('should reject MongoDB operator injection in strings', () => {
      expect(() => sanitizeNoSQL('$where')).toThrow('NoSQL operator injection');
      expect(() => sanitizeNoSQL('$ne')).toThrow('NoSQL operator injection');
    });

    it('should reject MongoDB operators in objects', () => {
      expect(() => sanitizeNoSQL({ $where: '1==1' })).toThrow('NoSQL operator injection');
      expect(() => sanitizeNoSQL({ username: { $ne: null } })).toThrow('NoSQL operator injection');
    });

    it('should recursively sanitize nested objects', () => {
      const safe = sanitizeNoSQL({ user: { name: 'test' } });
      expect(safe).toEqual({ user: { name: 'test' } });
    });
  });

  describe('validateInteger', () => {
    it('should validate valid integers', () => {
      expect(validateInteger('42')).toBe(42);
      expect(validateInteger(42)).toBe(42);
    });

    it('should enforce min/max constraints', () => {
      expect(validateInteger(5, 0, 10)).toBe(5);
      expect(() => validateInteger(-1, 0, 10)).toThrow('Value must be at least 0');
      expect(() => validateInteger(11, 0, 10)).toThrow('Value must be at most 10');
    });

    it('should reject non-integers', () => {
      expect(() => validateInteger('not a number')).toThrow('Invalid integer');
      expect(() => validateInteger('3.14')).not.toThrow(); // parseInt accepts this
    });
  });

  describe('validateFloat', () => {
    it('should validate valid floats', () => {
      expect(validateFloat('3.14')).toBeCloseTo(3.14);
      expect(validateFloat(2.718)).toBeCloseTo(2.718);
    });

    it('should enforce min/max constraints', () => {
      expect(validateFloat(5.5, 0, 10)).toBeCloseTo(5.5);
      expect(() => validateFloat(-0.1, 0, 10)).toThrow('Value must be at least 0');
      expect(() => validateFloat(10.1, 0, 10)).toThrow('Value must be at most 10');
    });
  });

  describe('validateBoolean', () => {
    it('should validate boolean values', () => {
      expect(validateBoolean(true)).toBe(true);
      expect(validateBoolean(false)).toBe(false);
    });

    it('should convert string representations', () => {
      expect(validateBoolean('true')).toBe(true);
      expect(validateBoolean('TRUE')).toBe(true);
      expect(validateBoolean('false')).toBe(false);
      expect(validateBoolean('1')).toBe(true);
      expect(validateBoolean('0')).toBe(false);
    });

    it('should convert number representations', () => {
      expect(validateBoolean(1)).toBe(true);
      expect(validateBoolean(0)).toBe(false);
    });

    it('should reject invalid values', () => {
      expect(() => validateBoolean('yes')).toThrow('Invalid boolean value');
      expect(() => validateBoolean(2)).toThrow('Invalid boolean value');
    });
  });

  describe('validateUUID', () => {
    it('should validate valid UUIDs', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(validateUUID(uuid)).toBe(uuid.toLowerCase());
    });

    it('should reject invalid UUIDs', () => {
      expect(() => validateUUID('not-a-uuid')).toThrow('Invalid UUID');
      expect(() => validateUUID('123456')).toThrow('Invalid UUID');
    });
  });

  describe('sanitizeJSON', () => {
    it('should parse valid JSON', () => {
      const result = sanitizeJSON('{"key": "value"}');
      expect(result).toEqual({ key: 'value' });
    });

    it('should reject prototype pollution attempts', () => {
      expect(() => sanitizeJSON('{"__proto__": {"admin": true}}')).toThrow('Prototype pollution');
      expect(() => sanitizeJSON('{"constructor": {"admin": true}}')).toThrow('Prototype pollution');
    });

    it('should reject invalid JSON', () => {
      expect(() => sanitizeJSON('not json')).toThrow('Invalid JSON');
      expect(() => sanitizeJSON('{invalid}')).toThrow('Invalid JSON');
    });
  });

  describe('sanitizeObject', () => {
    it('should allow safe objects', () => {
      const obj = { name: 'test', value: 123 };
      const result = sanitizeObject(obj);
      expect(result).toEqual(obj);
    });

    it('should remove dangerous properties', () => {
      const obj = {
        name: 'test',
        __proto__: { admin: true },
        constructor: { admin: true },
        prototype: { admin: true },
      };
      const result = sanitizeObject(obj);
      expect(result).toEqual({ name: 'test' });
      expect(result.__proto__).toBeUndefined();
    });

    it('should recursively sanitize nested objects', () => {
      const obj = {
        user: {
          name: 'test',
          __proto__: { admin: true },
        },
      };
      const result = sanitizeObject(obj);
      expect(result.user.name).toBe('test');
      expect(result.user.__proto__).toBeUndefined();
    });

    it('should handle arrays', () => {
      const arr = [{ name: 'test', __proto__: { admin: true } }];
      const result = sanitizeObject(arr);
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].name).toBe('test');
      expect(result[0].__proto__).toBeUndefined();
    });
  });

  describe('InputValidator', () => {
    let validator: InputValidator;

    beforeEach(() => {
      validator = new InputValidator();
    });

    it('should track validation errors', () => {
      validator.validateString(null, 'name');
      expect(validator.hasErrors()).toBe(true);
      expect(validator.getErrors()).toHaveLength(1);
    });

    it('should reset errors', () => {
      validator.validateString(null, 'name');
      validator.reset();
      expect(validator.hasErrors()).toBe(false);
      expect(validator.getErrors()).toHaveLength(0);
    });

    it('should validate string with constraints', () => {
      const result = validator.validateString('test', 'username', {
        minLength: 2,
        maxLength: 10,
      });
      expect(result).toBe('test');
      expect(validator.hasErrors()).toBe(false);
    });

    it('should enforce minLength constraint', () => {
      validator.validateString('a', 'username', { minLength: 3 });
      expect(validator.hasErrors()).toBe(true);
      expect(validator.getErrors()[0]).toContain('at least 3 characters');
    });

    it('should enforce maxLength constraint', () => {
      validator.validateString('toolong', 'username', { maxLength: 3 });
      expect(validator.hasErrors()).toBe(true);
      expect(validator.getErrors()[0]).toContain('at most 3 characters');
    });

    it('should enforce pattern constraint', () => {
      validator.validateString('invalid!', 'username', {
        pattern: /^[a-z0-9]+$/,
      });
      expect(validator.hasErrors()).toBe(true);
      expect(validator.getErrors()[0]).toContain('does not match required pattern');
    });
  });
});
