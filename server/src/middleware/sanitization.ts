import { Request, Response, NextFunction } from 'express';
import { escape } from 'html-escaper';

/**
 * Recursively sanitizes an object to prevent NoSQL injection and Prototype Pollution.
 * Also escapes HTML characters in strings to provide basic XSS protection.
 * Uses a Copy-on-Write pattern to avoid unnecessary mutations and allocations.
 */
export function sanitize<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
        if (typeof obj === 'string') {
            const escaped = escape(obj);
            return (escaped !== obj ? escaped : obj) as unknown as T;
        }
        return obj;
    }

    // Preservation list for instances that should not be traversed/mutated
    if (obj instanceof Date || obj instanceof RegExp || obj instanceof Buffer) {
        return obj;
    }

    if (Array.isArray(obj)) {
        let newArr: any[] | null = null;
        for (let i = 0; i < obj.length; i++) {
            const val = obj[i];
            const sanitizedVal = sanitize(val);
            if (sanitizedVal !== val) {
                if (!newArr) newArr = [...obj];
                newArr[i] = sanitizedVal;
            }
        }
        return (newArr || obj) as unknown as T;
    }

    let newObj: any | null = null;
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            // 1. Prototype Pollution protection
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                if (!newObj) newObj = { ...obj };
                delete newObj[key];
                continue;
            }

            // 2. NoSQL injection protection (stripping keys starting with $ or .)
            if (key[0] === '$' || key[0] === '.') {
                if (!newObj) newObj = { ...obj };
                delete newObj[key];
                continue;
            }

            const val = (obj as any)[key];
            const sanitizedVal = sanitize(val);
            if (sanitizedVal !== val) {
                if (!newObj) newObj = { ...obj };
                newObj[key] = sanitizedVal;
            }
        }
    }

    return (newObj || obj) as unknown as T;
}

/**
 * Express middleware to sanitize request body, query, and params.
 */
export const sanitizationMiddleware = (req: Request, _res: Response, next: NextFunction) => {
    if (req.body) {
        req.body = sanitize(req.body);
    }

    if (req.query) {
        // Use defineProperty to bypass potential read-only locks on query/params
        Object.defineProperty(req, 'query', {
            value: sanitize(req.query),
            writable: true,
            configurable: true
        });
    }

    if (req.params) {
        Object.defineProperty(req, 'params', {
            value: sanitize(req.params),
            writable: true,
            configurable: true
        });
    }

    next();
};
