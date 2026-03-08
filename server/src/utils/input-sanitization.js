"use strict";
// @ts-nocheck
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputValidator = void 0;
exports.sanitizeString = sanitizeString;
exports.sanitizeHTML = sanitizeHTML;
exports.stripHTML = stripHTML;
exports.sanitizeEmail = sanitizeEmail;
exports.sanitizeURL = sanitizeURL;
exports.sanitizeFilePath = sanitizeFilePath;
exports.sanitizeSQL = sanitizeSQL;
exports.sanitizeShellInput = sanitizeShellInput;
exports.sanitizeNoSQL = sanitizeNoSQL;
exports.validateInteger = validateInteger;
exports.validateFloat = validateFloat;
exports.validateBoolean = validateBoolean;
exports.validateUUID = validateUUID;
exports.sanitizeJSON = sanitizeJSON;
exports.sanitizeObject = sanitizeObject;
exports.sanitizeRateLimitKey = sanitizeRateLimitKey;
const validator_1 = __importDefault(require("validator"));
const html_escaper_1 = require("html-escaper");
const isomorphic_dompurify_1 = __importDefault(require("isomorphic-dompurify"));
/**
 * Sanitize string input to prevent XSS
 */
function sanitizeString(input) {
    if (typeof input !== 'string') {
        throw new Error('Input must be a string');
    }
    // Remove any null bytes
    let sanitized = input.replace(/\0/g, '');
    // HTML escape to prevent XSS
    sanitized = (0, html_escaper_1.escape)(sanitized);
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
};
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
function sanitizeHTML(input, options = {}) {
    if (typeof input !== 'string') {
        throw new Error('Input must be a string');
    }
    const { stripAll = false, mode = 'standard', useDOMPurify = true, allowedTags, allowedAttributes, } = options;
    // If stripAll is true, remove all HTML and return plain text
    if (stripAll) {
        // Use DOMPurify with empty allowed tags for consistent stripping
        if (useDOMPurify) {
            return isomorphic_dompurify_1.default.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [], RETURN_TRUSTED_TYPE: true })
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
        const config = {
            ...baseConfig,
            ...(allowedTags && { ALLOWED_TAGS: allowedTags }),
            ...(allowedAttributes && { ALLOWED_ATTR: Object.values(allowedAttributes).flat() }),
        };
        // Add hooks for additional security
        isomorphic_dompurify_1.default.addHook('uponSanitizeAttribute', (node, data) => {
            // Block javascript: and data: URLs in href/src
            if (['href', 'src', 'action', 'formaction'].includes(data.attrName)) {
                const value = data.attrValue.toLowerCase().trim();
                if (value.startsWith('javascript:') ||
                    value.startsWith('vbscript:') ||
                    value.startsWith('data:text') ||
                    value.startsWith('data:application')) {
                    data.attrValue = '#';
                    data.keepAttr = false;
                }
            }
        });
        isomorphic_dompurify_1.default.addHook('afterSanitizeAttributes', (node) => {
            // Set target="_blank" links to have rel="noopener noreferrer"
            if (node.tagName === 'A' && node.hasAttribute('target')) {
                node.setAttribute('rel', 'noopener noreferrer');
            }
        });
        const sanitized = isomorphic_dompurify_1.default.sanitize(input, config);
        // Remove hooks after use to prevent accumulation
        isomorphic_dompurify_1.default.removeAllHooks();
        return sanitized;
    }
    // Fallback: regex-based sanitization (defense-in-depth)
    return sanitizeHTMLRegex(input, {
        allowedTags: allowedTags || DOMPURIFY_CONFIGS[mode].ALLOWED_TAGS,
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
function sanitizeHTMLRegex(input, options) {
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
                    if (lowerValue.startsWith('javascript:') ||
                        lowerValue.startsWith('vbscript:') ||
                        lowerValue.startsWith('data:text') ||
                        lowerValue.startsWith('data:application')) {
                        continue;
                    }
                }
                safeAttributes += ` ${attrName}="${(0, html_escaper_1.escape)(attrValue)}"`;
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
function decodeHtmlEntities(input) {
    const entities = {
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
function stripHTML(input) {
    return sanitizeHTML(input, { stripAll: true });
}
/**
 * Validate and sanitize email address
 */
function sanitizeEmail(email) {
    if (!validator_1.default.isEmail(email)) {
        throw new Error('Invalid email address');
    }
    return validator_1.default.normalizeEmail(email) || email.toLowerCase().trim();
}
/**
 * Validate and sanitize URL
 */
function sanitizeURL(url, allowedProtocols = ['http', 'https']) {
    if (!validator_1.default.isURL(url, { protocols: allowedProtocols, require_protocol: true })) {
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
function sanitizeFilePath(pathInput, allowedBasePath) {
    if (typeof pathInput !== 'string') {
        throw new Error('Path must be a string');
    }
    // Remove null bytes
    let sanitized = pathInput.replace(/\0/g, '');
    // Prevent path traversal
    if (sanitized.includes('..') || sanitized.includes('~')) {
        throw new Error('Path traversal detected');
    }
    // Remove leading slashes for relative paths
    sanitized = sanitized.replace(/^\/+/, '');
    // If allowed base path is specified, ensure the path is within it
    if (allowedBasePath) {
        // Use dynamic require for path module
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pathModule = require('path');
        const { resolve, normalize } = pathModule;
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
function sanitizeSQL(input) {
    if (typeof input !== 'string') {
        throw new Error('Input must be a string');
    }
    // Check for common SQL injection patterns
    const sqlInjectionPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|OR|AND)\b)/gi,
        /--/g, // SQL comments
        /;/g, // SQL statement terminator
        /'/g, // Single quotes
        /"/g, // Double quotes
        /`/g, // Backticks
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
function sanitizeShellInput(input) {
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
function sanitizeNoSQL(input) {
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
        const sanitized = Array.isArray(input) ? [] : {};
        for (const key in input) {
            if (Array.isArray(sanitized)) {
                sanitized.push(sanitizeNoSQL(input[parseInt(key)]));
            }
            else {
                sanitized[key] = sanitizeNoSQL(input[key]);
            }
        }
        return sanitized;
    }
    return input;
}
/**
 * Validate integer input
 */
function validateInteger(input, min, max) {
    const num = parseInt(String(input), 10);
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
function validateFloat(input, min, max) {
    const num = parseFloat(String(input));
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
function validateBoolean(input) {
    if (typeof input === 'boolean') {
        return input;
    }
    if (typeof input === 'string') {
        const lower = input.toLowerCase();
        if (lower === 'true' || lower === '1')
            return true;
        if (lower === 'false' || lower === '0')
            return false;
    }
    if (typeof input === 'number') {
        if (input === 1)
            return true;
        if (input === 0)
            return false;
    }
    throw new Error('Invalid boolean value');
}
/**
 * Validate UUID
 */
function validateUUID(input, version) {
    if (!validator_1.default.isUUID(input, version)) {
        throw new Error('Invalid UUID');
    }
    return input.toLowerCase();
}
/**
 * Sanitize JSON input
 */
function sanitizeJSON(input) {
    try {
        const parsed = JSON.parse(input);
        // Prevent prototype pollution
        if (parsed.__proto__ || parsed.constructor || parsed.prototype) {
            throw new Error('Prototype pollution attempt detected');
        }
        return parsed;
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Invalid JSON: ${errorMessage}`);
    }
}
/**
 * Sanitize object to remove dangerous properties
 */
function sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }
    // Prevent prototype pollution
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }
    const sanitized = {};
    const objRecord = obj;
    for (const key in objRecord) {
        if (dangerousKeys.includes(key)) {
            continue; // Skip dangerous keys
        }
        if (Object.prototype.hasOwnProperty.call(objRecord, key)) {
            sanitized[key] = sanitizeObject(objRecord[key]);
        }
    }
    return sanitized;
}
/**
 * Rate limit key sanitizer
 */
function sanitizeRateLimitKey(key) {
    // Only allow alphanumeric, hyphens, underscores, and dots
    const sanitized = key.replace(/[^a-zA-Z0-9\-_.]/g, '');
    if (sanitized.length === 0) {
        throw new Error('Invalid rate limit key');
    }
    return sanitized;
}
/**
 * Comprehensive input validator class for collecting validation errors.
 *
 * Allows validating multiple fields and collecting all errors before returning.
 */
class InputValidator {
    errors = [];
    /**
     * Adds an error message to the collection.
     * @param error - The error message to add.
     */
    addError(error) {
        this.errors.push(error);
    }
    /**
     * Checks if any errors have been collected.
     * @returns True if there are errors, false otherwise.
     */
    hasErrors() {
        return this.errors.length > 0;
    }
    /**
     * Retrieves all collected error messages.
     * @returns An array of error strings.
     */
    getErrors() {
        return this.errors;
    }
    /**
     * Resets the error collection.
     */
    reset() {
        this.errors = [];
    }
    /**
     * Validates a string input.
     *
     * @param input - The input value to validate.
     * @param fieldName - The name of the field for error messages.
     * @param options - Validation options (minLength, maxLength, pattern).
     * @returns The sanitized string if valid, or null if invalid (errors added to collection).
     */
    validateString(input, fieldName, options) {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.addError(`${fieldName}: ${errorMessage}`);
            return null;
        }
    }
    /**
     * Validates an email address.
     *
     * @param input - The input value to validate.
     * @param fieldName - The name of the field for error messages.
     * @returns The sanitized email if valid, or null if invalid.
     */
    validateEmail(input, fieldName) {
        try {
            return sanitizeEmail(String(input));
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.addError(`${fieldName}: ${errorMessage}`);
            return null;
        }
    }
    /**
     * Validates a URL.
     *
     * @param input - The input value to validate.
     * @param fieldName - The name of the field for error messages.
     * @returns The sanitized URL if valid, or null if invalid.
     */
    validateURL(input, fieldName) {
        try {
            return sanitizeURL(String(input));
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.addError(`${fieldName}: ${errorMessage}`);
            return null;
        }
    }
    /**
     * Validates an integer.
     *
     * @param input - The input value to validate.
     * @param fieldName - The name of the field for error messages.
     * @param min - Minimum allowed value.
     * @param max - Maximum allowed value.
     * @returns The validated integer if valid, or null if invalid.
     */
    validateInteger(input, fieldName, min, max) {
        try {
            return validateInteger(input, min, max);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.addError(`${fieldName}: ${errorMessage}`);
            return null;
        }
    }
}
exports.InputValidator = InputValidator;
