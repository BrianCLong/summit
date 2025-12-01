/**
 * Comprehensive Validation and Security Tests
 */

import { describe, it, expect } from '@jest/globals';
import {
  EntityIdSchema,
  EmailSchema,
  URLSchema,
  SearchQuerySchema,
  FileUploadSchema,
  IPAddressSchema,
  PhoneNumberSchema,
  PaginationSchema,
  SanitizationUtils,
  SecurityValidator,
  QueryValidator,
  validateInput,
  validateInputSafe,
} from '../index';

describe('Input Validation Schemas', () => {
  describe('EntityIdSchema', () => {
    it('should accept valid UUID', () => {
      const valid = '123e4567-e89b-12d3-a456-426614174000';
      expect(() => validateInput(EntityIdSchema, valid)).not.toThrow();
    });

    it('should reject invalid UUID', () => {
      const invalid = 'not-a-uuid';
      expect(() => validateInput(EntityIdSchema, invalid)).toThrow();
    });

    it('should reject empty string', () => {
      expect(() => validateInput(EntityIdSchema, '')).toThrow();
    });
  });

  describe('EmailSchema', () => {
    it('should accept valid email', () => {
      const valid = 'user@example.com';
      expect(() => validateInput(EmailSchema, valid)).not.toThrow();
    });

    it('should reject invalid email', () => {
      const invalid = 'not-an-email';
      expect(() => validateInput(EmailSchema, invalid)).toThrow();
    });

    it('should reject email with consecutive dots', () => {
      const invalid = 'user..name@example.com';
      expect(() => validateInput(EmailSchema, invalid)).toThrow();
    });

    it('should convert email to lowercase', () => {
      const result = validateInput(EmailSchema, 'User@Example.COM');
      expect(result).toBe('user@example.com');
    });
  });

  describe('URLSchema', () => {
    it('should accept valid HTTPS URL', () => {
      const valid = 'https://example.com/path';
      expect(() => validateInput(URLSchema, valid)).not.toThrow();
    });

    it('should accept valid HTTP URL', () => {
      const valid = 'http://example.com';
      expect(() => validateInput(URLSchema, valid)).not.toThrow();
    });

    it('should reject non-HTTP(S) protocol', () => {
      const invalid = 'ftp://example.com';
      expect(() => validateInput(URLSchema, invalid)).toThrow();
    });

    it('should reject localhost URLs', () => {
      const invalid = 'http://localhost:3000';
      expect(() => validateInput(URLSchema, invalid)).toThrow();
    });
  });

  describe('SearchQuerySchema', () => {
    it('should accept valid search query', () => {
      const valid = 'search term';
      expect(() => validateInput(SearchQuerySchema, valid)).not.toThrow();
    });

    it('should reject empty query', () => {
      expect(() => validateInput(SearchQuerySchema, '')).toThrow();
    });

    it('should reject query with HTML tags', () => {
      const invalid = '<script>alert("xss")</script>';
      expect(() => validateInput(SearchQuerySchema, invalid)).toThrow();
    });

    it('should reject query with javascript protocol', () => {
      const invalid = 'javascript:alert(1)';
      expect(() => validateInput(SearchQuerySchema, invalid)).toThrow();
    });

    it('should reject query with event handlers', () => {
      const invalid = 'onerror=alert(1)';
      expect(() => validateInput(SearchQuerySchema, invalid)).toThrow();
    });

    it('should reject excessively long query', () => {
      const invalid = 'a'.repeat(501);
      expect(() => validateInput(SearchQuerySchema, invalid)).toThrow();
    });
  });

  describe('FileUploadSchema', () => {
    it('should accept valid file metadata', () => {
      const valid = {
        filename: 'document.pdf',
        mimeType: 'application/pdf',
        size: 1024 * 1024, // 1MB
      };
      expect(() => validateInput(FileUploadSchema, valid)).not.toThrow();
    });

    it('should reject invalid filename characters', () => {
      const invalid = {
        filename: 'file<script>.pdf',
        mimeType: 'application/pdf',
        size: 1024,
      };
      expect(() => validateInput(FileUploadSchema, invalid)).toThrow();
    });

    it('should reject disallowed MIME type', () => {
      const invalid = {
        filename: 'file.exe',
        mimeType: 'application/x-msdownload',
        size: 1024,
      };
      expect(() => validateInput(FileUploadSchema, invalid)).toThrow();
    });

    it('should reject file exceeding size limit', () => {
      const invalid = {
        filename: 'large.pdf',
        mimeType: 'application/pdf',
        size: 11 * 1024 * 1024, // 11MB (exceeds 10MB limit)
      };
      expect(() => validateInput(FileUploadSchema, invalid)).toThrow();
    });
  });

  describe('IPAddressSchema', () => {
    it('should accept valid IPv4 address', () => {
      const valid = '192.168.1.1';
      expect(() => validateInput(IPAddressSchema, valid)).not.toThrow();
    });

    it('should accept valid IPv6 address', () => {
      const valid = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      expect(() => validateInput(IPAddressSchema, valid)).not.toThrow();
    });

    it('should reject invalid IP address', () => {
      const invalid = '999.999.999.999';
      expect(() => validateInput(IPAddressSchema, invalid)).toThrow();
    });
  });

  describe('PhoneNumberSchema', () => {
    it('should accept valid E.164 phone number', () => {
      const valid = '+14155552671';
      expect(() => validateInput(PhoneNumberSchema, valid)).not.toThrow();
    });

    it('should reject invalid phone number', () => {
      const invalid = '123';
      expect(() => validateInput(PhoneNumberSchema, invalid)).toThrow();
    });
  });

  describe('PaginationSchema', () => {
    it('should accept valid pagination', () => {
      const valid = { limit: 20, offset: 0 };
      expect(() => validateInput(PaginationSchema, valid)).not.toThrow();
    });

    it('should apply default values', () => {
      const result = validateInput(PaginationSchema, {});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it('should reject limit exceeding maximum', () => {
      const invalid = { limit: 1001, offset: 0 };
      expect(() => validateInput(PaginationSchema, invalid)).toThrow();
    });

    it('should reject negative offset', () => {
      const invalid = { limit: 20, offset: -1 };
      expect(() => validateInput(PaginationSchema, invalid)).toThrow();
    });
  });
});

describe('Sanitization Utils', () => {
  describe('sanitizeHTML', () => {
    it('should escape HTML entities', () => {
      const input = '<div>Test</div>';
      const result = SanitizationUtils.sanitizeHTML(input);
      expect(result).toBe('&lt;div&gt;Test&lt;&#x2F;div&gt;');
    });

    it('should escape quotes', () => {
      const input = '"test" and \'test\'';
      const result = SanitizationUtils.sanitizeHTML(input);
      expect(result).toContain('&quot;');
      expect(result).toContain('&#x27;');
    });

    it('should escape ampersands', () => {
      const input = 'A & B';
      const result = SanitizationUtils.sanitizeHTML(input);
      expect(result).toBe('A &amp; B');
    });
  });

  describe('removeDangerousContent', () => {
    it('should remove script tags', () => {
      const input = 'Hello <script>alert("XSS")</script> World';
      const result = SanitizationUtils.removeDangerousContent(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('Hello');
      expect(result).toContain('World');
    });

    it('should remove iframe tags', () => {
      const input = '<iframe src="evil.com"></iframe>';
      const result = SanitizationUtils.removeDangerousContent(input);
      expect(result).not.toContain('<iframe>');
    });

    it('should remove javascript protocol', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const result = SanitizationUtils.removeDangerousContent(input);
      expect(result).not.toContain('javascript:');
    });

    it('should remove event handlers', () => {
      const input = '<img onerror="alert(1)" src="x">';
      const result = SanitizationUtils.removeDangerousContent(input);
      expect(result).not.toContain('onerror=');
    });

    it('should remove base64 data URIs', () => {
      const input = '<img src="data:text/html;base64,PHNjcmlwdD4=">';
      const result = SanitizationUtils.removeDangerousContent(input);
      expect(result).not.toContain('data:');
      expect(result).not.toContain('base64');
    });
  });

  describe('sanitizeUserInput', () => {
    it('should sanitize strings', () => {
      const input = '<script>alert(1)</script>';
      const result = SanitizationUtils.sanitizeUserInput(input);
      expect(result).not.toContain('<script>');
    });

    it('should sanitize arrays', () => {
      const input = ['<script>test</script>', 'safe'];
      const result = SanitizationUtils.sanitizeUserInput(input);
      expect(result[0]).not.toContain('<script>');
      expect(result[1]).toBe('safe');
    });

    it('should sanitize objects', () => {
      const input = {
        name: '<script>alert(1)</script>',
        age: 25,
      };
      const result = SanitizationUtils.sanitizeUserInput(input);
      expect(result.name).not.toContain('<script>');
      expect(result.age).toBe(25);
    });

    it('should limit string length', () => {
      const input = 'a'.repeat(20000);
      const result = SanitizationUtils.sanitizeUserInput(input);
      expect(result.length).toBeLessThanOrEqual(10000);
    });

    it('should limit array length', () => {
      const input = new Array(2000).fill('test');
      const result = SanitizationUtils.sanitizeUserInput(input);
      expect(result.length).toBeLessThanOrEqual(1000);
    });

    it('should limit object keys', () => {
      const input: Record<string, string> = {};
      for (let i = 0; i < 150; i++) {
        input[`key${i}`] = 'value';
      }
      const result = SanitizationUtils.sanitizeUserInput(input);
      expect(Object.keys(result).length).toBeLessThanOrEqual(100);
    });
  });
});

describe('Security Validator', () => {
  describe('validateInput', () => {
    it('should pass valid input', () => {
      const input = { name: 'test', age: 25 };
      const result = SecurityValidator.validateInput(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect SQL injection', () => {
      const input = "'; DROP TABLE users; --";
      const result = SecurityValidator.validateInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Potential SQL injection detected');
    });

    it('should detect Cypher injection', () => {
      const input = "'; MATCH (n) DETACH DELETE n; //";
      const result = SecurityValidator.validateInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Potential Cypher injection detected');
    });

    it('should detect XSS attempts', () => {
      const input = '<script>alert("XSS")</script>';
      const result = SecurityValidator.validateInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Potential XSS content detected');
    });

    it('should reject excessively large inputs', () => {
      const input = 'a'.repeat(2000000);
      const result = SecurityValidator.validateInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Input size too large');
    });
  });

  describe('validatePermissions', () => {
    it('should pass with wildcard permission', () => {
      const user = { permissions: ['*'], tenantId: 'tenant1' };
      const result = SecurityValidator.validatePermissions(user, 'read', 'entity');
      expect(result.valid).toBe(true);
    });

    it('should pass with specific permission', () => {
      const user = { permissions: ['entity:read'], tenantId: 'tenant1' };
      const result = SecurityValidator.validatePermissions(user, 'read', 'entity');
      expect(result.valid).toBe(true);
    });

    it('should fail without permission', () => {
      const user = { permissions: ['entity:read'], tenantId: 'tenant1' };
      const result = SecurityValidator.validatePermissions(user, 'delete', 'entity');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing permission: entity:delete');
    });

    it('should prevent cross-tenant access', () => {
      const user = { permissions: ['*'], tenantId: 'tenant1' };
      const context = { tenantId: 'tenant2' };
      const result = SecurityValidator.validatePermissions(
        user,
        'read',
        'entity',
        context
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Cross-tenant access not allowed');
    });
  });
});

describe('Query Validator', () => {
  describe('hasDangerousSQLPatterns', () => {
    it('should detect DROP TABLE', () => {
      const query = 'SELECT * FROM users; DROP TABLE users;';
      expect(QueryValidator.hasDangerousSQLPatterns(query)).toBe(true);
    });

    it('should detect UNION SELECT injection', () => {
      const query = "SELECT * FROM users WHERE id = 1 UNION SELECT * FROM passwords";
      expect(QueryValidator.hasDangerousSQLPatterns(query)).toBe(true);
    });

    it('should allow safe queries', () => {
      const query = 'SELECT * FROM users WHERE id = $1';
      expect(QueryValidator.hasDangerousSQLPatterns(query)).toBe(false);
    });
  });

  describe('hasDangerousCypherPatterns', () => {
    it('should detect DROP commands', () => {
      const query = 'MATCH (n) DETACH DELETE n; DROP INDEX ON :User(email);';
      expect(QueryValidator.hasDangerousCypherPatterns(query)).toBe(true);
    });

    it('should detect dbms procedures', () => {
      const query = 'CALL dbms.security.clearAuthCache()';
      expect(QueryValidator.hasDangerousCypherPatterns(query)).toBe(true);
    });

    it('should allow safe queries', () => {
      const query = 'MATCH (n:User {id: $id}) RETURN n';
      expect(QueryValidator.hasDangerousCypherPatterns(query)).toBe(false);
    });
  });

  describe('validateCypherQuery', () => {
    it('should pass valid parameterized query', () => {
      const query = 'MATCH (n {id: $id}) RETURN n';
      const params = { id: '123' };
      const result = QueryValidator.validateCypherQuery(query, params);
      expect(result.valid).toBe(true);
    });

    it('should fail on dangerous patterns', () => {
      const query = 'CALL dbms.listUsers()';
      const params = {};
      const result = QueryValidator.validateCypherQuery(query, params);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Query contains potentially dangerous Cypher patterns'
      );
    });

    it('should reject excessively long queries', () => {
      const query = 'MATCH (n) RETURN n'.repeat(10000);
      const params = {};
      const result = QueryValidator.validateCypherQuery(query, params);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Query exceeds maximum length');
    });
  });

  describe('validateSQLQuery', () => {
    it('should pass valid parameterized query', () => {
      const query = 'SELECT * FROM users WHERE id = $1';
      const params = ['123'];
      const result = QueryValidator.validateSQLQuery(query, params);
      expect(result.valid).toBe(true);
    });

    it('should fail on parameter count mismatch', () => {
      const query = 'SELECT * FROM users WHERE id = ? AND name = ?';
      const params = ['123']; // Missing second parameter
      const result = QueryValidator.validateSQLQuery(query, params);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Parameter count mismatch');
    });

    it('should fail on dangerous patterns', () => {
      const query = 'SELECT * FROM users; DROP TABLE users;';
      const params = [];
      const result = QueryValidator.validateSQLQuery(query, params);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Query contains potentially dangerous SQL patterns'
      );
    });
  });
});

describe('Helper Functions', () => {
  describe('validateInputSafe', () => {
    it('should return success for valid input', () => {
      const result = validateInputSafe(EmailSchema, 'test@example.com');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('test@example.com');
      }
    });

    it('should return error for invalid input', () => {
      const result = validateInputSafe(EmailSchema, 'not-an-email');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeDefined();
      }
    });
  });
});
