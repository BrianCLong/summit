import { Request, Response, NextFunction } from 'express';

/**
 * Recursively removes any keys that start with '$' or '.',
 * which could be used to execute malicious queries (e.g. NoSQL injection).
 */
function sanitize(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitize);

    const clean: any = {};
    for (const key in obj) {
        if (key.startsWith('$') || key.startsWith('.')) continue;
        clean[key] = sanitize(obj[key]);
    }
    return clean;
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
