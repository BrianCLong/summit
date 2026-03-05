import { Request, Response, NextFunction } from 'express';

/**
 * Recursively removes any keys that start with '$' or '.',
 * which could be used to execute malicious queries (e.g. NoSQL injection).
 *
 * BOLT OPTIMIZATION:
 * - Implements copy-on-write to avoid unnecessary allocations if no sanitization is needed.
 * - Uses O(1) character checks (key[0]) instead of startsWith.
 * - Preserves Date, RegExp, and Buffer instances.
 * - Uses Object.keys() for efficient iteration.
 */
function sanitize(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    // Preserve common non-plain objects that shouldn't be recursed into
    if (obj instanceof Date || obj instanceof RegExp || (typeof Buffer !== 'undefined' && Buffer.isBuffer(obj))) {
        return obj;
    }

    if (Array.isArray(obj)) {
        let newArr: any[] | null = null;
        for (let i = 0; i < obj.length; i++) {
            const v = obj[i];
            const t = sanitize(v);
            if (t !== v && !newArr) {
                newArr = obj.slice(0, i);
            }
            if (newArr) {
                newArr.push(t);
            }
        }
        return newArr || obj;
    }

    const keys = Object.keys(obj);
    let newObj: any = null;

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const firstChar = key[0];

        // O(1) character check for injection patterns
        if (firstChar === '$' || firstChar === '.') {
            if (!newObj) {
                newObj = {};
                for (let j = 0; j < i; j++) {
                    newObj[keys[j]] = obj[keys[j]];
                }
            }
            continue;
        }

        const v = obj[key];
        const t = sanitize(v);

        // Copy-on-write: only allocate new object if a value changed
        if (t !== v && !newObj) {
            newObj = {};
            for (let j = 0; j < i; j++) {
                newObj[keys[j]] = obj[keys[j]];
            }
        }

        if (newObj) {
            newObj[key] = t;
        }
    }

    return newObj || obj;
}

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
    if (process.env.DEBUG_TESTS) {
        console.log('[Sanitization] Custom sanitizeInput middleware called for path:', req.path);
    }
    if (req.body) {
        req.body = sanitize(req.body);
    }

    if (req.query) {
        try {
            const sanitizedQuery = sanitize(req.query);
            // In some environments (like Jest/Supertest), req.query might be read-only
            // through a getter. We try to redefine it or safely update it.
            Object.defineProperty(req, 'query', {
                value: sanitizedQuery,
                writable: true,
                configurable: true,
                enumerable: true
            });
        } catch (err: any) {
            // Fallback: if we can't redefine, we just skip it to avoid crashing
            // but log it for visibility in tests.
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
