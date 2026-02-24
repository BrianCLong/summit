import { Request, Response, NextFunction } from 'express';
import { escape } from 'html-escaper';

/**
 * Recursively removes any keys that start with '$' or '.',
 * which could be used to execute malicious queries (e.g. NoSQL injection).
 *
 * Hardened to prevent:
 * - Prototype Pollution (__proto__, constructor, prototype)
 * - Property injection via inheritance (uses hasOwnProperty)
 * - Destruction of special objects (Date, RegExp, Buffer)
 * - XSS (HTML escapes all strings)
 *
 * Performance:
 * - Copy-on-Write (CoW) pattern to skip allocations for clean objects
 * - O(1) character checks for keys
 */
function sanitize(obj: any): any {
    if (typeof obj === 'string') {
        const sanitized = escape(obj);
        return sanitized !== obj ? sanitized : obj;
    }

    if (!obj || typeof obj !== 'object') return obj;

    // Explicitly preserve special object types
    if (obj instanceof Date || obj instanceof RegExp || Buffer.isBuffer(obj)) {
        return obj;
    }

    if (Array.isArray(obj)) {
        let hasChanged = false;
        const sanitizedArray = obj.map(item => {
            const sanitizedItem = sanitize(item);
            if (sanitizedItem !== item) hasChanged = true;
            return sanitizedItem;
        });
        return hasChanged ? sanitizedArray : obj;
    }

    let hasChanged = false;
    const clean: any = {};
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

    for (const key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) {
            hasChanged = true;
            continue;
        }

        // Fast character checks for NoSQL injection protection and Prototype Pollution
        if (key.length > 0 && (key[0] === '$' || key[0] === '.')) {
            hasChanged = true;
            continue;
        }

        if (dangerousKeys.includes(key)) {
            hasChanged = true;
            continue;
        }

        const value = obj[key];
        const sanitizedValue = sanitize(value);

        if (sanitizedValue !== value) {
            hasChanged = true;
        }

        clean[key] = sanitizedValue;
    }

    // Check if any keys were removed by comparing key counts if hasChanged is still false
    if (!hasChanged && Object.keys(obj).length !== Object.keys(clean).length) {
        hasChanged = true;
    }

    // If no keys were removed or modified, return the original object (CoW)
    return hasChanged ? clean : obj;
}

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
    if (process.env.DEBUG_TESTS) {
        console.warn('[Sanitization] Custom sanitizeInput middleware called for path:', req.path);
    }

    if (req.body) {
        req.body = sanitize(req.body);
    }

    if (req.query) {
        try {
            const sanitizedQuery = sanitize(req.query);
            Object.defineProperty(req, 'query', {
                value: sanitizedQuery,
                writable: true,
                configurable: true,
                enumerable: true
            });
        } catch (err: any) {
            if (process.env.DEBUG_TESTS) {
                console.warn('[Sanitization] Warning: Could not sanitize req.query:', err.message);
            }
        }
    }

    if (req.params) {
        try {
            const sanitizedParams = sanitize(req.params);
            Object.defineProperty(req, 'params', {
                value: sanitizedParams,
                writable: true,
                configurable: true,
                enumerable: true
            });
        } catch (err: any) {
            if (process.env.DEBUG_TESTS) {
                console.warn('[Sanitization] Warning: Could not sanitize req.params:', err.message);
            }
        }
    }

    next();
};
