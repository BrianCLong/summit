/**
 * Tests for sanitization middleware
 */

import { describe, it, expect, jest } from '@jest/globals';
import { sanitizeInput } from '../sanitization.js';

const requestFactory = (options: Record<string, any> = {}) => {
  return {
    headers: {
      'content-type': 'application/json',
      ...options.headers,
    },
    body: Object.prototype.hasOwnProperty.call(options, 'body') ? options.body : {},
    query: Object.prototype.hasOwnProperty.call(options, 'query') ? options.query : {},
    params: Object.prototype.hasOwnProperty.call(options, 'params') ? options.params : {},
    ip: options.ip || '127.0.0.1',
    method: options.method || 'GET',
    url: options.url || '/',
    path: options.path || '/',
  };
};

const responseFactory = (): any => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

const nextFactory = () => jest.fn();

describe('sanitization middleware', () => {
  describe('NoSQL Key Sanitization', () => {
    it('should remove keys starting with $ in request body', () => {
      const body = {
        name: 'John',
        $where: '1 == 1',
        nested: {
          $gt: 0,
          safe: true
        }
      };
      const req = requestFactory({ body });
      const res = responseFactory();
      const next = nextFactory();

      sanitizeInput(req as any, res, next);

      expect(req.body).toEqual({
        name: 'John',
        nested: {
          safe: true
        }
      });
      expect(req.body.$where).toBeUndefined();
      expect(req.body.nested.$gt).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should remove keys starting with . in query parameters', () => {
      const query = {
        search: 'test',
        '.internal': 'secret'
      };
      const req = requestFactory({ query });
      const res = responseFactory();
      const next = nextFactory();

      sanitizeInput(req as any, res, next);

      expect(req.query).toEqual({
        search: 'test'
      });
      expect(req.query['.internal']).toBeUndefined();
    });

    it('should handle arrays recursively', () => {
      const body = {
        items: [
          { id: 1, $secret: 'hide' },
          { id: 2, name: 'safe' }
        ],
        tags: ['$meta', 'safe']
      };
      const req = requestFactory({ body });
      const res = responseFactory();
      const next = nextFactory();

      sanitizeInput(req as any, res, next);

      expect(req.body.items[0]).toEqual({ id: 1 });
      expect(req.body.items[1]).toEqual({ id: 2, name: 'safe' });
      // Note: we don't remove array elements, only object keys
      expect(req.body.tags).toEqual(['$meta', 'safe']);
    });
  });

  describe('Copy-on-Write (CoW) Optimization', () => {
    it('should preserve original object reference if no sanitization is needed', () => {
      const body = {
        name: 'John',
        age: 30,
        nested: {
          active: true
        }
      };
      const req = requestFactory({ body });
      const res = responseFactory();
      const next = nextFactory();

      sanitizeInput(req as any, res, next);

      expect(req.body).toBe(body); // Strict equality check for CoW
    });

    it('should preserve original array reference if no elements need sanitization', () => {
      const body = {
        list: [{ a: 1 }, { b: 2 }]
      };
      const req = requestFactory({ body });
      const res = responseFactory();
      const next = nextFactory();

      sanitizeInput(req as any, res, next);

      expect(req.body).toBe(body);
      expect(req.body.list).toBe(body.list);
    });

    it('should only clone objects that actually change', () => {
      const innerSafe = { ok: true };
      const innerDirty = { $bad: true, ok: false };
      const body = {
        safe: innerSafe,
        dirty: innerDirty
      };
      const req = requestFactory({ body });
      const res = responseFactory();
      const next = nextFactory();

      sanitizeInput(req as any, res, next);

      expect(req.body).not.toBe(body);
      expect(req.body.safe).toBe(innerSafe); // This should still be the same reference
      expect(req.body.dirty).not.toBe(innerDirty);
      expect(req.body.dirty).toEqual({ ok: false });
    });
  });

  describe('Robustness and Security', () => {
    it('should preserve Date, RegExp and Buffer instances', () => {
      const date = new Date();
      const reg = /test/i;
      const buf = Buffer.from('hello');
      const body = {
        date,
        reg,
        buf,
        name: 'John'
      };
      const req = requestFactory({ body });
      const res = responseFactory();
      const next = nextFactory();

      sanitizeInput(req as any, res, next);

      expect(req.body.date).toBe(date);
      expect(req.body.date instanceof Date).toBe(true);
      expect(req.body.reg).toBe(reg);
      expect(req.body.buf).toBe(buf);
      expect(req.body.name).toBe('John');
    });

    it('should protect against Prototype Pollution', () => {
      // Use a trick to create an object with an enumerable __proto__ property
      const body = {};
      Object.defineProperty(body, '__proto__', {
        value: { polluted: true },
        enumerable: true,
        configurable: true,
        writable: true
      });
      (body as any).name = 'test';

      const req = requestFactory({ body });
      const res = responseFactory();
      const next = nextFactory();

      sanitizeInput(req as any, res, next);

      expect(req.body.name).toBe('test');
      expect(Object.prototype.hasOwnProperty.call(req.body, '__proto__')).toBe(false);
      expect(({} as any).polluted).toBeUndefined();
    });

    it('should skip constructor and prototype keys', () => {
      const body = {
        name: 'test',
        constructor: 'fake',
        prototype: 'fake'
      };
      const req = requestFactory({ body });
      const res = responseFactory();
      const next = nextFactory();

      sanitizeInput(req as any, res, next);

      expect(req.body).toEqual({ name: 'test' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and non-object inputs', () => {
      const req = requestFactory({ body: null });
      const res = responseFactory();
      const next = nextFactory();

      sanitizeInput(req as any, res, next);
      expect(req.body).toBeNull();
      expect(next).toHaveBeenCalled();
    });

    it('should handle empty objects', () => {
      const body = {};
      const req = requestFactory({ body });
      const res = responseFactory();
      const next = nextFactory();

      sanitizeInput(req as any, res, next);
      expect(req.body).toBe(body);
    });
  });
});
