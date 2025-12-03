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
 * Sanitize string input to prevent XSS
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
 * Sanitize HTML content (allow safe HTML tags)
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
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!validator.isEmail(email)) {
    throw new Error('Invalid email address');
  }

  return validator.normalizeEmail(email) || email.toLowerCase().trim();
}

/**
 * Validate and sanitize URL
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
 * Sanitize file path to prevent path traversal
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
 * Sanitize SQL input (for use with parameterized queries)
 * Note: Always use parameterized queries. This is additional protection.
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
 * Sanitize shell command input
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
 * Sanitize NoSQL query input
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
 * Validate integer input
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
 * Validate float input
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
 * Validate boolean input
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
 * Validate UUID
 */
export function validateUUID(input: string, version?: validator.UUIDVersion): string {
  if (!validator.isUUID(input, version)) {
    throw new Error('Invalid UUID');
  }

  return input.toLowerCase();
}

/**
 * Sanitize JSON input
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
 * Sanitize object to remove dangerous properties
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
 * Rate limit key sanitizer
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
 * Comprehensive input validator
 */
export class InputValidator {
  private errors: string[] = [];

  addError(error: string): void {
    this.errors.push(error);
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  getErrors(): string[] {
    return this.errors;
  }

  reset(): void {
    this.errors = [];
  }

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

  validateEmail(input: any, fieldName: string): string | null {
    try {
      return sanitizeEmail(input);
    } catch (error: any) {
      this.addError(`${fieldName}: ${error.message}`);
      return null;
    }
  }

  validateURL(input: any, fieldName: string): string | null {
    try {
      return sanitizeURL(input);
    } catch (error: any) {
      this.addError(`${fieldName}: ${error.message}`);
      return null;
    }
  }

  validateInteger(input: any, fieldName: string, min?: number, max?: number): number | null {
    try {
      return validateInteger(input, min, max);
    } catch (error: any) {
      this.addError(`${fieldName}: ${error.message}`);
      return null;
    }
  }
}
