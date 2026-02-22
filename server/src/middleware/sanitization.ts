import { Request, Response, NextFunction } from 'express';

/**
 * Recursively removes any keys that start with '$' or '.',
 * which could be used to execute malicious queries (e.g. NoSQL injection).
 *
 * BOLT OPTIMIZATION:
 * - Implements copy-on-write pattern to avoid unnecessary allocations.
 * - Uses O(1) character checks (key[0]) instead of startsWith.
 * - Preserves Date, RegExp and Buffer instances.
 * - Uses Object.prototype.hasOwnProperty.call() for safe iteration.
 */
function sanitize(obj: any): any {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    // Preserve special types that shouldn't be recursively sanitized
    if (
        obj instanceof Date ||
        obj instanceof RegExp ||
        (typeof Buffer !== 'undefined' && Buffer.isBuffer(obj))
    ) {
        return obj;
    }

    if (Array.isArray(obj)) {
        let newArr: any[] | null = null;
        for (let i = 0; i < obj.length; i++) {
            const val = obj[i];
            const sanitized = sanitize(val);
            if (sanitized !== val && !newArr) {
                newArr = obj.slice(0, i);
            }
            if (newArr) {
                newArr.push(sanitized);
            }
        }
        return newArr || obj;
    }

    let newObj: any = null;
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const firstChar = key[0];
            if (firstChar === '$' || firstChar === '.') {
                if (!newObj) {
                    newObj = { ...obj };
                }
                delete newObj[key];
            } else {
                const val = obj[key];
                const sanitized = sanitize(val);
                if (sanitized !== val) {
                    if (!newObj) {
                        newObj = { ...obj };
                    }
                    newObj[key] = sanitized;
                }
            }
        }
    }
    return newObj || obj;
}

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
    if (process.env.DEBUG_TESTS) {
        console.warn('[Sanitization] Custom sanitizeInput middleware called for path:', req.path);
    }

    if (req.body) {
        const sanitizedBody = sanitize(req.body);
        if (sanitizedBody !== req.body) {
            req.body = sanitizedBody;
        }
    }

    if (req.query) {
        const sanitizedQuery = sanitize(req.query);
        if (sanitizedQuery !== req.query) {
            try {
                // In some environments (like Jest/Supertest), req.query might be read-only
                // through a getter. We try to redefine it or safely update it.
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
    }

    if (req.params) {
        const sanitizedParams = sanitize(req.params);
        if (sanitizedParams !== req.params) {
            try {
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
    }

    next();
};
