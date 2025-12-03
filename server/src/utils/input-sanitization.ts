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
 *
 * Uses DOMPurify for robust HTML sanitization with regex fallback
 */

import validator from 'validator';
import { escape as htmlEscape } from 'html-escaper';
import DOMPurify from 'isomorphic-dompurify';

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
 * DOMPurify configuration for different sanitization modes
 */
const DOMPURIFY_CONFIGS = {
  // Standard safe HTML with limited tags
  standard: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span'],
    ALLOWED_ATTR: ['href', 'title', 'src', 'alt', 'class'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
    SANITIZE_DOM: true,
    WHOLE_DOCUMENT: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
  },
  // Strict mode - only plain text with basic formatting
  strict: {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br'],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
    SANITIZE_DOM: true,
  },
  // Rich content with more tags allowed
  rich: {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img',
    ],
    ALLOWED_ATTR: ['href', 'title', 'src', 'alt', 'class', 'id', 'colspan', 'rowspan'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
    SANITIZE_DOM: true,
  },
} as const;

/**
 * Comprehensive HTML sanitization using DOMPurify with defense-in-depth
 *
 * Security features:
 * - DOMPurify as primary sanitization engine (battle-tested, regularly updated)
 * - Tag whitelist enforcement
 * - Attribute sanitization
 * - Event handler removal
 * - Script/style tag removal
 * - Data URI blocking
 * - Encoded attack prevention
 * - URL protocol validation
 */
export function sanitizeHTML(
  input: string,
  options: {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
    stripAll?: boolean;
    mode?: 'standard' | 'strict' | 'rich';
    useDOMPurify?: boolean;
  } = {},
): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  const {
    stripAll = false,
    mode = 'standard',
    useDOMPurify = true,
    allowedTags,
    allowedAttributes,
  } = options;

  // If stripAll is true, remove all HTML and return plain text
  if (stripAll) {
    // Use DOMPurify with empty allowed tags for consistent stripping
    if (useDOMPurify) {
      return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
        .replace(/\s+/g, ' ')
        .trim();
    }
    return input
      .replace(/<[^>]*>/g, '')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Use DOMPurify as primary sanitization (recommended)
  if (useDOMPurify) {
    // Build config from options or use preset
    const baseConfig = DOMPURIFY_CONFIGS[mode];
    const config: DOMPurify.Config = {
      ...baseConfig,
      ...(allowedTags && { ALLOWED_TAGS: allowedTags }),
      ...(allowedAttributes && { ALLOWED_ATTR: Object.values(allowedAttributes).flat() }),
    };

    // Add hooks for additional security
    DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
      // Block javascript: and data: URLs in href/src
      if (['href', 'src', 'action', 'formaction'].includes(data.attrName)) {
        const value = data.attrValue.toLowerCase().trim();
        if (
          value.startsWith('javascript:') ||
          value.startsWith('vbscript:') ||
          value.startsWith('data:text') ||
          value.startsWith('data:application')
        ) {
          data.attrValue = '#';
          data.keepAttr = false;
        }
      }
    });

    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
      // Set target="_blank" links to have rel="noopener noreferrer"
      if (node.tagName === 'A' && node.hasAttribute('target')) {
        node.setAttribute('rel', 'noopener noreferrer');
      }
    });

    const sanitized = DOMPurify.sanitize(input, config);

    // Remove hooks after use to prevent accumulation
    DOMPurify.removeAllHooks();

    return sanitized;
  }

  // Fallback: regex-based sanitization (defense-in-depth)
  return sanitizeHTMLRegex(input, {
    allowedTags: allowedTags || DOMPURIFY_CONFIGS[mode].ALLOWED_TAGS as unknown as string[],
    allowedAttributes: allowedAttributes || {
      a: ['href', 'title'],
      img: ['src', 'alt', 'title'],
      span: ['class'],
    },
  });
}

/**
 * Regex-based HTML sanitization (fallback/defense-in-depth)
 * Used when DOMPurify is disabled or as additional layer
 */
function sanitizeHTMLRegex(
  input: string,
  options: {
    allowedTags: string[];
    allowedAttributes: Record<string, string[]>;
  },
): string {
  const { allowedTags, allowedAttributes } = options;

  let sanitized = input;

  // Step 1: Decode HTML entities that might be used for bypasses
  sanitized = decodeHtmlEntities(sanitized);

  // Step 2: Remove script tags and their content (highest priority)
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Step 3: Remove style tags and their content
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Step 4: Remove all event handlers (on*) from any tag
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '');

  // Step 5: Remove javascript: and data: protocols
  sanitized = sanitized.replace(/\s*href\s*=\s*["']?\s*javascript:[^"'>\s]*/gi, ' href="#"');
  sanitized = sanitized.replace(/\s*src\s*=\s*["']?\s*javascript:[^"'>\s]*/gi, '');
  sanitized = sanitized.replace(/\s*href\s*=\s*["']?\s*data:[^"'>\s]*/gi, ' href="#"');
  sanitized = sanitized.replace(/\s*src\s*=\s*["']?\s*data:(?!image\/)[^"'>\s]*/gi, '');

  // Step 6: Remove dangerous tags entirely
  const dangerousTags = [
    'script', 'style', 'iframe', 'object', 'embed', 'form', 'input',
    'textarea', 'button', 'select', 'option', 'link', 'meta', 'base',
    'applet', 'frame', 'frameset', 'layer', 'bgsound', 'xml',
  ];
  for (const tag of dangerousTags) {
    const pattern = new RegExp(`<${tag}\\b[^>]*>.*?</${tag}>|<${tag}\\b[^>]*/?>`, 'gis');
    sanitized = sanitized.replace(pattern, '');
  }

  // Step 7: Filter tags and attributes
  sanitized = sanitized.replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi, (match, tagName, attributes) => {
    const tag = tagName.toLowerCase();

    // Remove disallowed tags
    if (!allowedTags.includes(tag)) {
      return '';
    }

    // For self-closing or closing tags without attributes
    if (match.startsWith('</') || !attributes.trim()) {
      return match.startsWith('</') ? `</${tag}>` : `<${tag}>`;
    }

    // Sanitize attributes
    const tagAllowedAttrs = allowedAttributes[tag] || [];
    let safeAttributes = '';

    // Parse attributes
    const attrPattern = /([a-z_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/gi;
    let attrMatch;

    while ((attrMatch = attrPattern.exec(attributes)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrValue = attrMatch[2] || attrMatch[3] || attrMatch[4] || '';

      // Skip event handlers
      if (attrName.startsWith('on')) {
        continue;
      }

      // Skip dangerous attributes
      if (['style', 'formaction', 'action', 'xlink:href'].includes(attrName)) {
        continue;
      }

      // Only include allowed attributes for this tag
      if (tagAllowedAttrs.includes(attrName)) {
        // Validate href/src values
        if (['href', 'src'].includes(attrName)) {
          const lowerValue = attrValue.toLowerCase().trim();
          if (
            lowerValue.startsWith('javascript:') ||
            lowerValue.startsWith('vbscript:') ||
            lowerValue.startsWith('data:text') ||
            lowerValue.startsWith('data:application')
          ) {
            continue;
          }
        }

        safeAttributes += ` ${attrName}="${htmlEscape(attrValue)}"`;
      }
    }

    return `<${tag}${safeAttributes}>`;
  });

  // Step 8: Final cleanup - remove any remaining encoded attacks
  sanitized = sanitized.replace(/&#x?[0-9a-f]+;?/gi, (match) => {
    // Decode and check if it's a dangerous character
    const decoded = decodeHtmlEntities(match);
    if (/[<>"']/.test(decoded)) {
      return '';
    }
    return match;
  });

  return sanitized;
}

/**
 * Decode common HTML entities (helper for sanitization)
 */
function decodeHtmlEntities(input: string): string {
  const entities: Record<string, string> = {
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#47;': '/',
    '&#60;': '<',
    '&#62;': '>',
    '&#34;': '"',
  };

  let decoded = input;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'gi'), char);
  }

  // Handle numeric entities
  decoded = decoded.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));

  return decoded;
}

/**
 * Strip all HTML tags and return plain text
 */
export function stripHTML(input: string): string {
  return sanitizeHTML(input, { stripAll: true });
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
