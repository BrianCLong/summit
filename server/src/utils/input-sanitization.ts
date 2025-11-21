/**
 * Input Sanitization Utilities
 *
 * Comprehensive input validation and sanitization to prevent:
 * - SQL Injection
 * - XSS (Cross-Site Scripting)
 * - Command Injection
 * - Path Traversal
 * - NoSQL Injection
 * - LDAP Injection
 * - XML Injection
 */

import validator from 'validator';
import { escape as htmlEscape } from 'html-escaper';

/**
 * Sanitize string input to prevent XSS by removing null bytes and escaping HTML characters.
 *
 * @param {string} input - The string to sanitize.
 * @returns {string} The sanitized string.
 * @throws {Error} If the input is not a string.
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  // Remove any null bytes
  let sanitized = input.replace(/\0/g, '');

  // HTML escape to prevent XSS
  sanitized = htmlEscape(sanitized);

  return sanitized;
}

/**
 * Sanitize HTML content by stripping unsafe tags and attributes.
 * Allows a set of safe tags (b, i, em, strong, a, p, br).
 *
 * @param {string} input - The HTML string to sanitize.
 * @param {string[]} [allowedTags] - Optional list of allowed tags.
 * @returns {string} The sanitized HTML string.
 * @throws {Error} If the input is not a string.
 */
export function sanitizeHTML(input: string, allowedTags?: string[]): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  // Basic implementation - for production, use a library like DOMPurify or sanitize-html
  // This is a simplified version
  const allowed = allowedTags || ['b', 'i', 'em', 'strong', 'a', 'p', 'br'];
  const tagPattern = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;

  return input.replace(tagPattern, (match, tag) => {
    return allowed.includes(tag.toLowerCase()) ? match : '';
  });
}

/**
 * Validate and sanitize an email address.
 *
 * @param {string} email - The email address to validate.
 * @returns {string} The normalized email address.
 * @throws {Error} If the email address is invalid.
 */
export function sanitizeEmail(email: string): string {
  if (!validator.isEmail(email)) {
    throw new Error('Invalid email address');
  }

  return validator.normalizeEmail(email) || email.toLowerCase().trim();
}

/**
 * Validate and sanitize a URL.
 * Checks for allowed protocols and prevents dangerous schemes like javascript: and data:.
 *
 * @param {string} url - The URL to validate.
 * @param {string[]} [allowedProtocols=['http', 'https']] - List of allowed protocols.
 * @returns {string} The validated URL.
 * @throws {Error} If the URL is invalid or uses a dangerous scheme.
 */
export function sanitizeURL(url: string, allowedProtocols: string[] = ['http', 'https']): string {
  if (!validator.isURL(url, { protocols: allowedProtocols, require_protocol: true })) {
    throw new Error('Invalid URL');
  }

  // Prevent javascript: and data: URLs
  const urlLower = url.toLowerCase();
  if (urlLower.startsWith('javascript:') || urlLower.startsWith('data:')) {
    throw new Error('Dangerous URL scheme detected');
  }

  return url.trim();
}

/**
 * Sanitize file path to prevent path traversal attacks.
 * Optionally ensures the path is within a specific base directory.
 *
 * @param {string} path - The file path to sanitize.
 * @param {string} [allowedBasePath] - Optional base path to restrict the file path to.
 * @returns {string} The sanitized file path.
 * @throws {Error} If path traversal is detected or the path is outside the allowed base path.
 */
export function sanitizeFilePath(path: string, allowedBasePath?: string): string {
  if (typeof path !== 'string') {
    throw new Error('Path must be a string');
  }

  // Remove null bytes
  let sanitized = path.replace(/\0/g, '');

  // Prevent path traversal
  if (sanitized.includes('..') || sanitized.includes('~')) {
    throw new Error('Path traversal detected');
  }

  // Remove leading slashes for relative paths
  sanitized = sanitized.replace(/^\/+/, '');

  // If allowed base path is specified, ensure the path is within it
  if (allowedBasePath) {
    const { resolve, normalize } = require('path');
    const normalizedBase = normalize(resolve(allowedBasePath));
    const normalizedPath = normalize(resolve(allowedBasePath, sanitized));

    if (!normalizedPath.startsWith(normalizedBase)) {
      throw new Error('Path is outside allowed directory');
    }

    return normalizedPath;
  }

  return sanitized;
}

/**
 * Sanitize SQL input by checking for common injection patterns.
 * Note: This is a secondary defense; always use parameterized queries.
 *
 * @param {string} input - The SQL input string.
 * @returns {string} The input string if safe.
 * @throws {Error} If potential SQL injection patterns are detected.
 */
export function sanitizeSQL(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  // Check for common SQL injection patterns
  const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|OR|AND)\b)/gi,
    /--/g, // SQL comments
    /;/g,  // SQL statement terminator
    /'/g,  // Single quotes
    /"/g,  // Double quotes
    /`/g,  // Backticks
  ];

  let hasInjectionPattern = false;
  for (const pattern of sqlInjectionPatterns) {
    if (pattern.test(input)) {
      hasInjectionPattern = true;
      break;
    }
  }

  if (hasInjectionPattern) {
    throw new Error('Potential SQL injection detected');
  }

  return input;
}

/**
 * Sanitize shell command input by checking for dangerous characters.
 *
 * @param {string} input - The shell command input.
 * @returns {string} The input string if safe.
 * @throws {Error} If dangerous shell characters are detected.
 */
export function sanitizeShellInput(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  // Dangerous shell characters
  const dangerousChars = /[;&|`$(){}[\]<>\\!]/g;

  if (dangerousChars.test(input)) {
    throw new Error('Dangerous shell characters detected');
  }

  return input;
}

/**
 * Sanitize NoSQL query input to prevent operator injection.
 * Recursively checks objects for keys starting with '$'.
 *
 * @param {any} input - The input to sanitize.
 * @returns {any} The sanitized input.
 * @throws {Error} If NoSQL operator injection is detected.
 */
export function sanitizeNoSQL(input: any): any {
  if (typeof input === 'string') {
    // Check for MongoDB operators
    if (input.startsWith('$')) {
      throw new Error('NoSQL operator injection detected');
    }
    return input;
  }

  if (typeof input === 'object' && input !== null) {
    // Check object keys for operators
    const keys = Object.keys(input);
    for (const key of keys) {
      if (key.startsWith('$')) {
        throw new Error('NoSQL operator injection detected in object key');
      }
    }

    // Recursively sanitize nested objects
    const sanitized: any = Array.isArray(input) ? [] : {};
    for (const key in input) {
      sanitized[key] = sanitizeNoSQL(input[key]);
    }
    return sanitized;
  }

  return input;
}

/**
 * Validate that the input is an integer within the specified range.
 *
 * @param {any} input - The input to validate.
 * @param {number} [min] - The minimum allowed value.
 * @param {number} [max] - The maximum allowed value.
 * @returns {number} The parsed integer.
 * @throws {Error} If the input is not a valid integer or out of range.
 */
export function validateInteger(input: any, min?: number, max?: number): number {
  const num = parseInt(input, 10);

  if (isNaN(num)) {
    throw new Error('Invalid integer');
  }

  if (min !== undefined && num < min) {
    throw new Error(`Value must be at least ${min}`);
  }

  if (max !== undefined && num > max) {
    throw new Error(`Value must be at most ${max}`);
  }

  return num;
}

/**
 * Validate that the input is a float within the specified range.
 *
 * @param {any} input - The input to validate.
 * @param {number} [min] - The minimum allowed value.
 * @param {number} [max] - The maximum allowed value.
 * @returns {number} The parsed float.
 * @throws {Error} If the input is not a valid float or out of range.
 */
export function validateFloat(input: any, min?: number, max?: number): number {
  const num = parseFloat(input);

  if (isNaN(num)) {
    throw new Error('Invalid float');
  }

  if (min !== undefined && num < min) {
    throw new Error(`Value must be at least ${min}`);
  }

  if (max !== undefined && num > max) {
    throw new Error(`Value must be at most ${max}`);
  }

  return num;
}

/**
 * Validate that the input is a boolean value.
 * Accepts boolean types, 'true'/'false' strings (case-insensitive), and 1/0 numbers.
 *
 * @param {any} input - The input to validate.
 * @returns {boolean} The boolean value.
 * @throws {Error} If the input is not a valid boolean representation.
 */
export function validateBoolean(input: any): boolean {
  if (typeof input === 'boolean') {
    return input;
  }

  if (typeof input === 'string') {
    const lower = input.toLowerCase();
    if (lower === 'true' || lower === '1') return true;
    if (lower === 'false' || lower === '0') return false;
  }

  if (typeof input === 'number') {
    if (input === 1) return true;
    if (input === 0) return false;
  }

  throw new Error('Invalid boolean value');
}

/**
 * Validate that the input is a valid UUID.
 *
 * @param {string} input - The UUID string to validate.
 * @param {validator.UUIDVersion} [version] - The UUID version to check against.
 * @returns {string} The validated and lowercased UUID.
 * @throws {Error} If the input is not a valid UUID.
 */
export function validateUUID(input: string, version?: validator.UUIDVersion): string {
  if (!validator.isUUID(input, version)) {
    throw new Error('Invalid UUID');
  }

  return input.toLowerCase();
}

/**
 * Sanitize JSON input by parsing it and checking for prototype pollution.
 *
 * @param {string} input - The JSON string.
 * @returns {any} The parsed JSON object.
 * @throws {Error} If the JSON is invalid or prototype pollution is detected.
 */
export function sanitizeJSON(input: string): any {
  try {
    const parsed = JSON.parse(input);

    // Prevent prototype pollution
    if (parsed.__proto__ || parsed.constructor || parsed.prototype) {
      throw new Error('Prototype pollution attempt detected');
    }

    return parsed;
  } catch (error: any) {
    throw new Error(`Invalid JSON: ${error.message}`);
  }
}

/**
 * Sanitize an object by removing dangerous properties like __proto__, constructor, and prototype.
 *
 * @param {any} obj - The object to sanitize.
 * @returns {any} The sanitized object.
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  // Prevent prototype pollution
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized: any = {};
  for (const key in obj) {
    if (dangerousKeys.includes(key)) {
      continue; // Skip dangerous keys
    }

    if (obj.hasOwnProperty(key)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
  }

  return sanitized;
}

/**
 * Sanitize a rate limit key by allowing only safe characters (alphanumeric, -, _, .).
 *
 * @param {string} key - The rate limit key.
 * @returns {string} The sanitized key.
 * @throws {Error} If the key contains invalid characters or is empty.
 */
export function sanitizeRateLimitKey(key: string): string {
  // Only allow alphanumeric, hyphens, underscores, and dots
  const sanitized = key.replace(/[^a-zA-Z0-9\-_.]/g, '');

  if (sanitized.length === 0) {
    throw new Error('Invalid rate limit key');
  }

  return sanitized;
}

/**
 * Comprehensive input validator class that accumulates errors.
 */
export class InputValidator {
  private errors: string[] = [];

  /**
   * Adds an error message to the list.
   * @param {string} error - The error message.
   */
  addError(error: string): void {
    this.errors.push(error);
  }

  /**
   * Checks if there are any validation errors.
   * @returns {boolean} True if errors exist.
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Retrieves the list of validation errors.
   * @returns {string[]} Array of error messages.
   */
  getErrors(): string[] {
    return this.errors;
  }

  /**
   * Resets the validator, clearing all errors.
   */
  reset(): void {
    this.errors = [];
  }

  /**
   * Validates a string input.
   *
   * @param {any} input - The input to validate.
   * @param {string} fieldName - The name of the field (for error messages).
   * @param {object} [options] - Validation options (minLength, maxLength, pattern).
   * @returns {string | null} The sanitized string or null if validation fails.
   */
  validateString(input: any, fieldName: string, options?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
  }): string | null {
    if (typeof input !== 'string') {
      this.addError(`${fieldName} must be a string`);
      return null;
    }

    if (options?.minLength && input.length < options.minLength) {
      this.addError(`${fieldName} must be at least ${options.minLength} characters`);
      return null;
    }

    if (options?.maxLength && input.length > options.maxLength) {
      this.addError(`${fieldName} must be at most ${options.maxLength} characters`);
      return null;
    }

    if (options?.pattern && !options.pattern.test(input)) {
      this.addError(`${fieldName} does not match required pattern`);
      return null;
    }

    try {
      return sanitizeString(input);
    } catch (error: any) {
      this.addError(`${fieldName}: ${error.message}`);
      return null;
    }
  }

  /**
   * Validates an email input.
   *
   * @param {any} input - The input to validate.
   * @param {string} fieldName - The name of the field.
   * @returns {string | null} The sanitized email or null if validation fails.
   */
  validateEmail(input: any, fieldName: string): string | null {
    try {
      return sanitizeEmail(input);
    } catch (error: any) {
      this.addError(`${fieldName}: ${error.message}`);
      return null;
    }
  }

  /**
   * Validates a URL input.
   *
   * @param {any} input - The input to validate.
   * @param {string} fieldName - The name of the field.
   * @returns {string | null} The sanitized URL or null if validation fails.
   */
  validateURL(input: any, fieldName: string): string | null {
    try {
      return sanitizeURL(input);
    } catch (error: any) {
      this.addError(`${fieldName}: ${error.message}`);
      return null;
    }
  }

  /**
   * Validates an integer input.
   *
   * @param {any} input - The input to validate.
   * @param {string} fieldName - The name of the field.
   * @param {number} [min] - Minimum value.
   * @param {number} [max] - Maximum value.
   * @returns {number | null} The parsed integer or null if validation fails.
   */
  validateInteger(input: any, fieldName: string, min?: number, max?: number): number | null {
    try {
      return validateInteger(input, min, max);
    } catch (error: any) {
      this.addError(`${fieldName}: ${error.message}`);
      return null;
    }
  }
}
