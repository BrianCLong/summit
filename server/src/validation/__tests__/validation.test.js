"use strict";
/**
 * Comprehensive Validation and Security Tests
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
// Mock htmlSanitizer to avoid jsdom ESM issues
// Simulate HTML entity escaping like DOMPurify would
const globals_1 = require("@jest/globals");
globals_1.jest.unstable_mockModule('../../utils/htmlSanitizer.js', () => ({
    sanitizeHtml: (input) => {
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    },
}));
const { EntityIdSchema, EmailSchema, URLSchema, SearchQuerySchema, FileUploadSchema, IPAddressSchema, PhoneNumberSchema, PaginationSchema, SanitizationUtils, SecurityValidator, QueryValidator, validateInput, validateInputSafe, } = await Promise.resolve().then(() => __importStar(require('../index.js')));
(0, globals_1.describe)('Input Validation Schemas', () => {
    (0, globals_1.describe)('EntityIdSchema', () => {
        (0, globals_1.it)('should accept valid UUID', () => {
            const valid = '123e4567-e89b-12d3-a456-426614174000';
            (0, globals_1.expect)(() => validateInput(EntityIdSchema, valid)).not.toThrow();
        });
        (0, globals_1.it)('should reject invalid UUID', () => {
            const invalid = 'not-a-uuid';
            (0, globals_1.expect)(() => validateInput(EntityIdSchema, invalid)).toThrow();
        });
        (0, globals_1.it)('should reject empty string', () => {
            (0, globals_1.expect)(() => validateInput(EntityIdSchema, '')).toThrow();
        });
    });
    (0, globals_1.describe)('EmailSchema', () => {
        (0, globals_1.it)('should accept valid email', () => {
            const valid = 'user@example.com';
            (0, globals_1.expect)(() => validateInput(EmailSchema, valid)).not.toThrow();
        });
        (0, globals_1.it)('should reject invalid email', () => {
            const invalid = 'not-an-email';
            (0, globals_1.expect)(() => validateInput(EmailSchema, invalid)).toThrow();
        });
        (0, globals_1.it)('should reject email with consecutive dots', () => {
            const invalid = 'user..name@example.com';
            (0, globals_1.expect)(() => validateInput(EmailSchema, invalid)).toThrow();
        });
        (0, globals_1.it)('should convert email to lowercase', () => {
            const result = validateInput(EmailSchema, 'User@Example.COM');
            (0, globals_1.expect)(result).toBe('user@example.com');
        });
    });
    (0, globals_1.describe)('URLSchema', () => {
        (0, globals_1.it)('should accept valid HTTPS URL', () => {
            const valid = 'https://example.com/path';
            (0, globals_1.expect)(() => validateInput(URLSchema, valid)).not.toThrow();
        });
        (0, globals_1.it)('should accept valid HTTP URL', () => {
            const valid = 'http://example.com';
            (0, globals_1.expect)(() => validateInput(URLSchema, valid)).not.toThrow();
        });
        (0, globals_1.it)('should reject non-HTTP(S) protocol', () => {
            const invalid = 'ftp://example.com';
            (0, globals_1.expect)(() => validateInput(URLSchema, invalid)).toThrow();
        });
        (0, globals_1.it)('should reject localhost URLs', () => {
            const invalid = 'http://localhost:3000';
            (0, globals_1.expect)(() => validateInput(URLSchema, invalid)).toThrow();
        });
    });
    (0, globals_1.describe)('SearchQuerySchema', () => {
        (0, globals_1.it)('should accept valid search query', () => {
            const valid = 'search term';
            (0, globals_1.expect)(() => validateInput(SearchQuerySchema, valid)).not.toThrow();
        });
        (0, globals_1.it)('should reject empty query', () => {
            (0, globals_1.expect)(() => validateInput(SearchQuerySchema, '')).toThrow();
        });
        (0, globals_1.it)('should reject query with HTML tags', () => {
            const invalid = '<script>alert("xss")</script>';
            (0, globals_1.expect)(() => validateInput(SearchQuerySchema, invalid)).toThrow();
        });
        (0, globals_1.it)('should reject query with javascript protocol', () => {
            const invalid = 'javascript:alert(1)';
            (0, globals_1.expect)(() => validateInput(SearchQuerySchema, invalid)).toThrow();
        });
        (0, globals_1.it)('should reject query with event handlers', () => {
            const invalid = 'onerror=alert(1)';
            (0, globals_1.expect)(() => validateInput(SearchQuerySchema, invalid)).toThrow();
        });
        (0, globals_1.it)('should reject excessively long query', () => {
            const invalid = 'a'.repeat(501);
            (0, globals_1.expect)(() => validateInput(SearchQuerySchema, invalid)).toThrow();
        });
    });
    (0, globals_1.describe)('FileUploadSchema', () => {
        (0, globals_1.it)('should accept valid file metadata', () => {
            const valid = {
                filename: 'document.pdf',
                mimeType: 'application/pdf',
                size: 1024 * 1024, // 1MB
            };
            (0, globals_1.expect)(() => validateInput(FileUploadSchema, valid)).not.toThrow();
        });
        (0, globals_1.it)('should reject invalid filename characters', () => {
            const invalid = {
                filename: 'file<script>.pdf',
                mimeType: 'application/pdf',
                size: 1024,
            };
            (0, globals_1.expect)(() => validateInput(FileUploadSchema, invalid)).toThrow();
        });
        (0, globals_1.it)('should reject disallowed MIME type', () => {
            const invalid = {
                filename: 'file.exe',
                mimeType: 'application/x-msdownload',
                size: 1024,
            };
            (0, globals_1.expect)(() => validateInput(FileUploadSchema, invalid)).toThrow();
        });
        (0, globals_1.it)('should reject file exceeding size limit', () => {
            const invalid = {
                filename: 'large.pdf',
                mimeType: 'application/pdf',
                size: 11 * 1024 * 1024, // 11MB (exceeds 10MB limit)
            };
            (0, globals_1.expect)(() => validateInput(FileUploadSchema, invalid)).toThrow();
        });
    });
    (0, globals_1.describe)('IPAddressSchema', () => {
        (0, globals_1.it)('should accept valid IPv4 address', () => {
            const valid = '192.168.1.1';
            (0, globals_1.expect)(() => validateInput(IPAddressSchema, valid)).not.toThrow();
        });
        (0, globals_1.it)('should accept valid IPv6 address', () => {
            const valid = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
            (0, globals_1.expect)(() => validateInput(IPAddressSchema, valid)).not.toThrow();
        });
        (0, globals_1.it)('should reject invalid IP address', () => {
            const invalid = '999.999.999.999';
            (0, globals_1.expect)(() => validateInput(IPAddressSchema, invalid)).toThrow();
        });
    });
    (0, globals_1.describe)('PhoneNumberSchema', () => {
        (0, globals_1.it)('should accept valid E.164 phone number', () => {
            const valid = '+14155552671';
            (0, globals_1.expect)(() => validateInput(PhoneNumberSchema, valid)).not.toThrow();
        });
        (0, globals_1.it)('should reject invalid phone number', () => {
            const invalid = '123';
            (0, globals_1.expect)(() => validateInput(PhoneNumberSchema, invalid)).toThrow();
        });
    });
    (0, globals_1.describe)('PaginationSchema', () => {
        (0, globals_1.it)('should accept valid pagination', () => {
            const valid = { limit: 20, offset: 0 };
            (0, globals_1.expect)(() => validateInput(PaginationSchema, valid)).not.toThrow();
        });
        (0, globals_1.it)('should apply default values', () => {
            const result = validateInput(PaginationSchema, {});
            (0, globals_1.expect)(result.limit).toBe(20);
            (0, globals_1.expect)(result.offset).toBe(0);
        });
        (0, globals_1.it)('should reject limit exceeding maximum', () => {
            const invalid = { limit: 1001, offset: 0 };
            (0, globals_1.expect)(() => validateInput(PaginationSchema, invalid)).toThrow();
        });
        (0, globals_1.it)('should reject negative offset', () => {
            const invalid = { limit: 20, offset: -1 };
            (0, globals_1.expect)(() => validateInput(PaginationSchema, invalid)).toThrow();
        });
    });
});
(0, globals_1.describe)('Sanitization Utils', () => {
    (0, globals_1.describe)('sanitizeHTML', () => {
        (0, globals_1.it)('should escape HTML entities', () => {
            const input = '<div>Test</div>';
            const result = SanitizationUtils.sanitizeHTML(input);
            (0, globals_1.expect)(result).toBe('&lt;div&gt;Test&lt;&#x2F;div&gt;');
        });
        (0, globals_1.it)('should escape quotes', () => {
            const input = '"test" and \'test\'';
            const result = SanitizationUtils.sanitizeHTML(input);
            (0, globals_1.expect)(result).toContain('&quot;');
            (0, globals_1.expect)(result).toContain('&#x27;');
        });
        (0, globals_1.it)('should escape ampersands', () => {
            const input = 'A & B';
            const result = SanitizationUtils.sanitizeHTML(input);
            (0, globals_1.expect)(result).toBe('A &amp; B');
        });
    });
    (0, globals_1.describe)('removeDangerousContent', () => {
        (0, globals_1.it)('should remove script tags', () => {
            const input = 'Hello <script>alert("XSS")</script> World';
            const result = SanitizationUtils.removeDangerousContent(input);
            (0, globals_1.expect)(result).not.toContain('<script>');
            (0, globals_1.expect)(result).toContain('Hello');
            (0, globals_1.expect)(result).toContain('World');
        });
        (0, globals_1.it)('should remove iframe tags', () => {
            const input = '<iframe src="evil.com"></iframe>';
            const result = SanitizationUtils.removeDangerousContent(input);
            (0, globals_1.expect)(result).not.toContain('<iframe>');
        });
        (0, globals_1.it)('should remove javascript protocol', () => {
            const input = '<a href="javascript:alert(1)">Click</a>';
            const result = SanitizationUtils.removeDangerousContent(input);
            (0, globals_1.expect)(result).not.toContain('javascript:');
        });
        (0, globals_1.it)('should remove event handlers', () => {
            const input = '<img onerror="alert(1)" src="x">';
            const result = SanitizationUtils.removeDangerousContent(input);
            (0, globals_1.expect)(result).not.toContain('onerror=');
        });
        (0, globals_1.it)('should remove base64 data URIs', () => {
            const input = '<img src="data:text/html;base64,PHNjcmlwdD4=">';
            const result = SanitizationUtils.removeDangerousContent(input);
            (0, globals_1.expect)(result).not.toContain('data:');
            (0, globals_1.expect)(result).not.toContain('base64');
        });
    });
    (0, globals_1.describe)('sanitizeUserInput', () => {
        (0, globals_1.it)('should sanitize strings', () => {
            const input = '<script>alert(1)</script>';
            const result = SanitizationUtils.sanitizeUserInput(input);
            (0, globals_1.expect)(result).not.toContain('<script>');
        });
        (0, globals_1.it)('should sanitize arrays', () => {
            const input = ['<script>test</script>', 'safe'];
            const result = SanitizationUtils.sanitizeUserInput(input);
            (0, globals_1.expect)(result[0]).not.toContain('<script>');
            (0, globals_1.expect)(result[1]).toBe('safe');
        });
        (0, globals_1.it)('should sanitize objects', () => {
            const input = {
                name: '<script>alert(1)</script>',
                age: 25,
            };
            const result = SanitizationUtils.sanitizeUserInput(input);
            (0, globals_1.expect)(result.name).not.toContain('<script>');
            (0, globals_1.expect)(result.age).toBe(25);
        });
        (0, globals_1.it)('should limit string length', () => {
            const input = 'a'.repeat(20000);
            const result = SanitizationUtils.sanitizeUserInput(input);
            (0, globals_1.expect)(result.length).toBeLessThanOrEqual(10000);
        });
        (0, globals_1.it)('should limit array length', () => {
            const input = new Array(2000).fill('test');
            const result = SanitizationUtils.sanitizeUserInput(input);
            (0, globals_1.expect)(result.length).toBeLessThanOrEqual(1000);
        });
        (0, globals_1.it)('should limit object keys', () => {
            const input = {};
            for (let i = 0; i < 150; i++) {
                input[`key${i}`] = 'value';
            }
            const result = SanitizationUtils.sanitizeUserInput(input);
            (0, globals_1.expect)(Object.keys(result).length).toBeLessThanOrEqual(100);
        });
    });
    (0, globals_1.describe)('sanitizeCypher', () => {
        (0, globals_1.it)('should correctly escape backslashes first to prevent double-escaping quotes', () => {
            // Input: ' OR 1=1 //
            const input = "' OR 1=1 //";
            // Expected safe output: \' OR 1=1 // (JS string literal: "\\' OR 1=1 //")
            // Vulnerable output: \\' OR 1=1 // (JS string literal: "\\\\' OR 1=1 //")
            // In vulnerable version, the first backslash escapes the second backslash,
            // leaving the single quote unescaped, which closes the string context.
            const result = SanitizationUtils.sanitizeCypher(input);
            (0, globals_1.expect)(result).toBe("\\' OR 1=1 //");
        });
        (0, globals_1.it)('should escape backslashes correctly', () => {
            const input = '\\';
            const result = SanitizationUtils.sanitizeCypher(input);
            (0, globals_1.expect)(result).toBe('\\\\');
        });
        (0, globals_1.it)('should escape quotes correctly', () => {
            const input = "'";
            const result = SanitizationUtils.sanitizeCypher(input);
            (0, globals_1.expect)(result).toBe("\\'");
        });
    });
});
(0, globals_1.describe)('Security Validator', () => {
    (0, globals_1.describe)('validateInput', () => {
        (0, globals_1.it)('should pass valid input', () => {
            const input = { name: 'test', age: 25 };
            const result = SecurityValidator.validateInput(input);
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.errors).toHaveLength(0);
        });
        (0, globals_1.it)('should detect SQL injection', () => {
            const input = "'; DROP TABLE users; --";
            const result = SecurityValidator.validateInput(input);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain('Potential SQL injection detected');
        });
        (0, globals_1.it)('should detect Cypher injection', () => {
            const input = "'; MATCH (n) DETACH DELETE n; //";
            const result = SecurityValidator.validateInput(input);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain('Potential Cypher injection detected');
        });
        (0, globals_1.it)('should detect XSS attempts', () => {
            const input = '<script>alert("XSS")</script>';
            const result = SecurityValidator.validateInput(input);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain('Potential XSS content detected');
        });
        (0, globals_1.it)('should reject excessively large inputs', () => {
            const input = 'a'.repeat(2000000);
            const result = SecurityValidator.validateInput(input);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain('Input size too large');
        });
    });
    (0, globals_1.describe)('validatePermissions', () => {
        (0, globals_1.it)('should pass with wildcard permission', () => {
            const user = { permissions: ['*'], tenantId: 'tenant1' };
            const result = SecurityValidator.validatePermissions(user, 'read', 'entity');
            (0, globals_1.expect)(result.valid).toBe(true);
        });
        (0, globals_1.it)('should pass with specific permission', () => {
            const user = { permissions: ['entity:read'], tenantId: 'tenant1' };
            const result = SecurityValidator.validatePermissions(user, 'read', 'entity');
            (0, globals_1.expect)(result.valid).toBe(true);
        });
        (0, globals_1.it)('should fail without permission', () => {
            const user = { permissions: ['entity:read'], tenantId: 'tenant1' };
            const result = SecurityValidator.validatePermissions(user, 'delete', 'entity');
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain('Missing permission: entity:delete');
        });
        (0, globals_1.it)('should prevent cross-tenant access', () => {
            const user = { permissions: ['*'], tenantId: 'tenant1' };
            const context = { tenantId: 'tenant2' };
            const result = SecurityValidator.validatePermissions(user, 'read', 'entity', context);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain('Cross-tenant access not allowed');
        });
    });
});
(0, globals_1.describe)('Query Validator', () => {
    (0, globals_1.describe)('hasDangerousSQLPatterns', () => {
        (0, globals_1.it)('should detect DROP TABLE', () => {
            const query = 'SELECT * FROM users; DROP TABLE users;';
            (0, globals_1.expect)(QueryValidator.hasDangerousSQLPatterns(query)).toBe(true);
        });
        (0, globals_1.it)('should detect UNION SELECT injection', () => {
            const query = "SELECT * FROM users WHERE id = 1 UNION SELECT * FROM passwords";
            (0, globals_1.expect)(QueryValidator.hasDangerousSQLPatterns(query)).toBe(true);
        });
        (0, globals_1.it)('should allow safe queries', () => {
            const query = 'SELECT * FROM users WHERE id = $1';
            (0, globals_1.expect)(QueryValidator.hasDangerousSQLPatterns(query)).toBe(false);
        });
    });
    (0, globals_1.describe)('hasDangerousCypherPatterns', () => {
        (0, globals_1.it)('should detect DROP commands', () => {
            const query = 'MATCH (n) DETACH DELETE n; DROP INDEX ON :User(email);';
            (0, globals_1.expect)(QueryValidator.hasDangerousCypherPatterns(query)).toBe(true);
        });
        (0, globals_1.it)('should detect dbms procedures', () => {
            const query = 'CALL dbms.security.clearAuthCache()';
            (0, globals_1.expect)(QueryValidator.hasDangerousCypherPatterns(query)).toBe(true);
        });
        (0, globals_1.it)('should allow safe queries', () => {
            const query = 'MATCH (n:User {id: $id}) RETURN n';
            (0, globals_1.expect)(QueryValidator.hasDangerousCypherPatterns(query)).toBe(false);
        });
    });
    (0, globals_1.describe)('validateCypherQuery', () => {
        (0, globals_1.it)('should pass valid parameterized query', () => {
            const query = 'MATCH (n {id: $id}) RETURN n';
            const params = { id: '123' };
            const result = QueryValidator.validateCypherQuery(query, params);
            (0, globals_1.expect)(result.valid).toBe(true);
        });
        (0, globals_1.it)('should fail on dangerous patterns', () => {
            const query = 'CALL dbms.listUsers()';
            const params = {};
            const result = QueryValidator.validateCypherQuery(query, params);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain('Query contains potentially dangerous Cypher patterns');
        });
        (0, globals_1.it)('should reject excessively long queries', () => {
            const query = 'MATCH (n) RETURN n'.repeat(10000);
            const params = {};
            const result = QueryValidator.validateCypherQuery(query, params);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain('Query exceeds maximum length');
        });
    });
    (0, globals_1.describe)('validateSQLQuery', () => {
        (0, globals_1.it)('should pass valid parameterized query', () => {
            const query = 'SELECT * FROM users WHERE id = $1';
            const params = ['123'];
            const result = QueryValidator.validateSQLQuery(query, params);
            (0, globals_1.expect)(result.valid).toBe(true);
        });
        (0, globals_1.it)('should fail on parameter count mismatch', () => {
            const query = 'SELECT * FROM users WHERE id = ? AND name = ?';
            const params = ['123']; // Missing second parameter
            const result = QueryValidator.validateSQLQuery(query, params);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain('Parameter count mismatch');
        });
        (0, globals_1.it)('should fail on dangerous patterns', () => {
            const query = 'SELECT * FROM users; DROP TABLE users;';
            const params = [];
            const result = QueryValidator.validateSQLQuery(query, params);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors).toContain('Query contains potentially dangerous SQL patterns');
        });
    });
});
(0, globals_1.describe)('Helper Functions', () => {
    (0, globals_1.describe)('validateInputSafe', () => {
        (0, globals_1.it)('should return success for valid input', () => {
            const result = validateInputSafe(EmailSchema, 'test@example.com');
            (0, globals_1.expect)(result.success).toBe(true);
            if (result.success) {
                (0, globals_1.expect)(result.data).toBe('test@example.com');
            }
        });
        (0, globals_1.it)('should return error for invalid input', () => {
            const result = validateInputSafe(EmailSchema, 'not-an-email');
            (0, globals_1.expect)(result.success).toBe(false);
            (0, globals_1.expect)(result.errors).toBeDefined();
        });
    });
});
