import { Request, Response, NextFunction } from 'express';

/**
 * Recursively removes any keys that start with '$' or '.',
 * which could be used to execute malicious queries (e.g. NoSQL injection).
 *
 * BOLT OPTIMIZATION:
 * - Implements Copy-on-Write (CoW) to avoid unnecessary allocations.
 * - Uses O(1) character checks (key[0]) instead of startsWith.
 * - Preserves Date, RegExp, and Buffer instances.
 * - Protects against Prototype Pollution by skipping __proto__, constructor, and prototype.
 */
function sanitize(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // Preserve special objects
  if (
    obj instanceof Date ||
    obj instanceof RegExp ||
    (typeof Buffer !== 'undefined' && Buffer.isBuffer(obj))
  ) {
    return obj;
  }

  if (Array.isArray(obj)) {
    let result: any[] | undefined;
    for (let i = 0; i < obj.length; i++) {
      const item = obj[i];
      const sanitized = sanitize(item);
      if (result) {
        result.push(sanitized);
      } else if (sanitized !== item) {
        result = obj.slice(0, i);
        result.push(sanitized);
      }
    }
    return result || obj;
  }

  let result: any | undefined;
  // Use for...in for performance, but guard with hasOwnProperty
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      continue;
    }

    const char0 = key[0];
    if (
      char0 === '$' ||
      char0 === '.' ||
      key === '__proto__' ||
      key === 'constructor' ||
      key === 'prototype'
    ) {
      if (!result) {
        result = {};
        // Copy preceding safe keys
        for (const k in obj) {
          if (k === key) {
            break;
          }
          if (Object.prototype.hasOwnProperty.call(obj, k)) {
            result[k] = obj[k];
          }
        }
      }
      continue;
    }

    const value = obj[key];
    const sanitizedValue = sanitize(value);

    if (result) {
      result[key] = sanitizedValue;
    } else if (sanitizedValue !== value) {
      result = {};
      // Copy preceding safe keys
      for (const k in obj) {
        if (k === key) {
          break;
        }
        if (Object.prototype.hasOwnProperty.call(obj, k)) {
          result[k] = obj[k];
        }
      }
      result[key] = sanitizedValue;
    }
  }

  return result || obj;
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
