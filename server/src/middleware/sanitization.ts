import { Request, Response, NextFunction } from 'express';

/**
 * Robust input sanitization using Copy-on-Write pattern.
 * Protects against Prototype Pollution and NoSQL injection.
 * Preserves Date, Buffer, and RegExp instances.
 */
function sanitize(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date || obj instanceof Buffer || obj instanceof RegExp) {
    return obj;
  }

  if (Array.isArray(obj)) {
    let hasChanged = false;
    const cleanedArray = obj.map(item => {
      const sanitizedItem = sanitize(item);
      if (sanitizedItem !== item) hasChanged = true;
      return sanitizedItem;
    });
    return hasChanged ? cleanedArray : obj;
  }

  let hasChanged = false;
  const cleanObj: any = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // 🛡️ Block Prototype Pollution keys
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        hasChanged = true;
        continue;
      }

      // 🛡️ Filter NoSQL injection keys (starting with $)
      if (key[0] === '$') {
        hasChanged = true;
        continue;
      }

      const value = obj[key];
      const sanitizedValue = sanitize(value);

      if (sanitizedValue !== value) {
        hasChanged = true;
      }

      // 🛡️ Drop keys that become empty objects after sanitization (e.g., pure NoSQL injection)
      if (
        sanitizedValue !== null &&
        typeof sanitizedValue === 'object' &&
        !(sanitizedValue instanceof Date || sanitizedValue instanceof Buffer || sanitizedValue instanceof RegExp) &&
        !Array.isArray(sanitizedValue) &&
        Object.keys(sanitizedValue).length === 0 &&
        typeof value === 'object' &&
        value !== null &&
        Object.keys(value).length > 0
      ) {
        hasChanged = true;
        continue;
      }

      cleanObj[key] = sanitizedValue;
    }
  }

  return hasChanged ? cleanObj : obj;
}

/**
 * Middleware to sanitize req.body, req.query, and req.params.
 * Uses Object.defineProperty to ensure updates succeed even on read-only properties.
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitize(req.body);
  }

  ['query', 'params'].forEach((prop) => {
    const originalValue = (req as any)[prop];
    if (originalValue) {
      const sanitizedValue = sanitize(originalValue);
      if (sanitizedValue !== originalValue) {
        Object.defineProperty(req, prop, {
          value: sanitizedValue,
          writable: true,
          configurable: true,
          enumerable: true
        });
      }
    }
  });

  next();
};
