import { Request, Response, NextFunction } from 'express';

/**
 * Recursively removes any keys that start with '$' or '.',
 * which could be used to execute malicious queries (e.g. NoSQL injection).
 *
 * BOLT OPTIMIZATION:
 * - Uses a copy-on-write pattern to avoid unnecessary allocations/cloning when no sanitization is needed.
 * - Improves performance for the 99% of requests that are already clean.
 * - Protects non-plain objects (Date, RegExp, Buffer) from being stripped.
 */
function sanitize(obj: any): any {
  // Return early for non-objects or null
  if (!obj || typeof obj !== 'object') return obj;

  // Protect common non-plain objects that shouldn't be recursed into
  if (obj instanceof Date || obj instanceof RegExp || (typeof Buffer !== 'undefined' && Buffer.isBuffer(obj))) {
    return obj;
  }

  // Handle Arrays
  if (Array.isArray(obj)) {
    let newArr: any[] | null = null;
    for (let i = 0; i < obj.length; i++) {
      const v = obj[i];
      const t = sanitize(v);
      if (t !== v && !newArr) {
        // First change detected, create a shallow copy up to this point
        newArr = obj.slice(0, i);
      }
      if (newArr) {
        newArr.push(t);
      }
    }
    return newArr || obj;
  }

  // Handle Objects
  let newObj: any = null;
  const keys = Object.keys(obj);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    // BOLT: Faster character check instead of startsWith
    const isMaliciousKey = key[0] === '$' || key[0] === '.';

    if (isMaliciousKey) {
      if (!newObj) {
        // First malicious key found, create a shallow copy of properties before it
        newObj = {};
        for (let j = 0; j < i; j++) {
          newObj[keys[j]] = obj[keys[j]];
        }
      }
      continue;
    }

    const value = obj[key];
    const sanitizedValue = sanitize(value);

    if (sanitizedValue !== value && !newObj) {
      // Change in nested property found, create a shallow copy of properties before it
      newObj = {};
      for (let j = 0; j < i; j++) {
        newObj[keys[j]] = obj[keys[j]];
      }
    }

    if (newObj) {
      newObj[key] = sanitizedValue;
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
      if (sanitizedQuery !== req.query) {
        Object.defineProperty(req, 'query', {
          value: sanitizedQuery,
          writable: true,
          configurable: true,
          enumerable: true
        });
      }
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
      if (sanitizedParams !== req.params) {
        Object.defineProperty(req, 'params', {
          value: sanitizedParams,
          writable: true,
          configurable: true,
          enumerable: true
        });
      }
    } catch (err: any) {
      if (process.env.DEBUG_TESTS) {
        console.warn('[Sanitization] Warning: Could not sanitize req.params:', err.message);
      }
    }
  }

  next();
};
