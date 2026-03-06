import { Request, Response, NextFunction } from 'express';

/**
 * Recursively removes any keys that start with '$' or '.',
 * which could be used to execute malicious queries (e.g. NoSQL injection).
 *
 * Performance Optimizations:
 * 1. Copy-on-Write: Skip allocations for clean objects/arrays to reduce GC pressure.
 * 2. O(1) Checks: Use key[0] instead of startsWith() for faster character matching.
 * 3. Type Preservation: Explicitly preserve Date, RegExp, and Buffer instances to avoid corruption.
 * 4. Efficient Iteration: Use Object.keys() for faster traversal of plain objects.
 */
function sanitize(obj: any): any {
    // Basic types or null/undefined
    if (!obj || typeof obj !== 'object') return obj;

    // Preserved instance types - don't recurse into these
    if (obj instanceof Date || obj instanceof RegExp || Buffer.isBuffer(obj)) {
        return obj;
    }

    if (Array.isArray(obj)) {
        let newArr: any[] | null = null;
        for (let i = 0; i < obj.length; i++) {
            const val = obj[i];
            const sanitized = sanitize(val);

            // If we already started building a new array, or this item changed
            if (newArr || sanitized !== val) {
                if (!newArr) {
                    // Start building new array from unchanged items
                    newArr = obj.slice(0, i);
                }
                newArr.push(sanitized);
            }
        }
        return newArr || obj;
    }

    let newObj: any = null;
    const keys = Object.keys(obj);

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];

        // Fast character check for '$' and '.' (O(1))
        if (key[0] === '$' || key[0] === '.') {
            if (!newObj) {
                newObj = {};
                // Copy all previous clean keys
                for (let j = 0; j < i; j++) {
                    const prevKey = keys[j];
                    newObj[prevKey] = obj[prevKey];
                }
            }
            continue;
        }

        const val = obj[key];
        const sanitized = sanitize(val);

        if (newObj || sanitized !== val) {
            if (!newObj) {
                newObj = {};
                // Copy all previous clean keys
                for (let j = 0; j < i; j++) {
                    const prevKey = keys[j];
                    newObj[prevKey] = obj[prevKey];
                }
            }
            newObj[key] = sanitized;
        }
    }

    return newObj || obj;
}

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
    if (process.env.DEBUG_TESTS) {
        console.log('[Sanitization] sanitizeInput middleware called for path:', req.path);
    }

    if (req.body) {
        req.body = sanitize(req.body);
    }

    if (req.query) {
        const sanitizedQuery = sanitize(req.query);
        // Only redefine if actually changed
        if (sanitizedQuery !== req.query) {
            try {
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
        // Only redefine if actually changed
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
