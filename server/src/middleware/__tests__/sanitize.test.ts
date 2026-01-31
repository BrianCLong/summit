/**
 * Tests for sanitize middleware
 */

import { describe, it, test, expect, jest, beforeAll } from '@jest/globals';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#x27;');

const sanitizeValue = (input: any): any => {
  if (typeof input === 'string') {
    return escapeHtml(input).trim().slice(0, 10000);
  }
  if (Array.isArray(input)) {
    return input.slice(0, 1000).map((item) => sanitizeValue(item));
  }
  if (input && typeof input === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      if (Object.keys(sanitized).length >= 100) break;
      sanitized[key] = sanitizeValue(value);
    }
    return sanitized;
  }
  return input;
};

// ESM-compatible mocking using unstable_mockModule
jest.unstable_mockModule('../../validation/index.js', () => ({
  SanitizationUtils: {
    sanitizeHTML: (input: string) => escapeHtml(String(input)),
    sanitizeUserInput: (input: any): any => sanitizeValue(input),
  },
}));

// Dynamic import AFTER mock is set up
const { default: sanitizeRequest } = await import('../sanitize.js');

const requestFactory = (options: Record<string, any> = {}) => {
  return {
    headers: {
      'content-type': 'application/json',
      'user-agent': 'IntelGraph-Test/1.0',
      ...options.headers,
    },
    body: options.body || {},
    query: options.query || {},
    params: options.params || {},
    user: options.user,
    tenant: options.tenant,
    cookies: options.cookies || {},
    ip: options.ip || '127.0.0.1',
    method: options.method || 'GET',
    url: options.url || '/',
    path: options.path || '/',
    get(name: string) {
      return this.headers[name.toLowerCase()];
    },
  };
};

const responseFactory = (): any => ({
  statusCode: 200,
  headers: {} as Record<string, string>,
  body: null,
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  setHeader: jest.fn(function (this: any, name: string, value: string) {
    this.headers[name] = value;
    return this;
  }),
  getHeader: jest.fn(function (this: any, name: string) {
    return this.headers[name];
  }),
  end: jest.fn(),
});

const nextFactory = () => jest.fn();

describe('sanitize middleware', () => {
  describe('HTML sanitization', () => {
    it('should sanitize HTML in request body', () => {
      const req = requestFactory({
        body: {
          name: '<script>alert("xss")</script>',
          description: 'Normal text',
        },
      });
      const res = responseFactory();
      const next = nextFactory();

      sanitizeRequest(req as any, res, next);

      expect(req.body.name).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(req.body.description).toBe('Normal text');
      expect(next).toHaveBeenCalled();
    });

    it('should sanitize HTML in query parameters', () => {
      const req = requestFactory({
        query: {
          search: '<img src=x onerror=alert(1)>',
          filter: 'safe value',
        },
      });
      const res = responseFactory();
      const next = nextFactory();

      sanitizeRequest(req as any, res, next);

      expect(req.query.search).toBe('&lt;img src=x onerror=alert(1)&gt;');
      expect(req.query.filter).toBe('safe value');
      expect(next).toHaveBeenCalled();
    });

    it('should escape all dangerous characters', () => {
      const req = requestFactory({
        body: {
          input: '&<>"\' test',
        },
      });
      const res = responseFactory();
      const next = nextFactory();

      sanitizeRequest(req as any, res, next);

      expect(req.body.input).toBe('&amp;&lt;&gt;&quot;&#x27; test');
    });
  });

  describe('Nested data sanitization', () => {
    it('should sanitize nested objects', () => {
      const req = requestFactory({
        body: {
          user: {
            name: '<script>bad</script>',
            profile: {
              bio: '<b>test</b>',
            },
          },
        },
      });
      const res = responseFactory();
      const next = nextFactory();

      sanitizeRequest(req as any, res, next);

      expect(req.body.user.name).toBe('&lt;script&gt;bad&lt;/script&gt;');
      expect(req.body.user.profile.bio).toBe('&lt;b&gt;test&lt;/b&gt;');
    });

    it('should sanitize arrays', () => {
      const req = requestFactory({
        body: {
          tags: ['<script>xss</script>', 'safe tag', '<img src=x>'],
        },
      });
      const res = responseFactory();
      const next = nextFactory();

      sanitizeRequest(req as any, res, next);

      expect(req.body.tags).toEqual([
        '&lt;script&gt;xss&lt;/script&gt;',
        'safe tag',
        '&lt;img src=x&gt;',
      ]);
    });

    it('should sanitize arrays of objects', () => {
      const req = requestFactory({
        body: {
          items: [
            { name: '<script>1</script>' },
            { name: '<script>2</script>' },
          ],
        },
      });
      const res = responseFactory();
      const next = nextFactory();

      sanitizeRequest(req as any, res, next);

      expect(req.body.items[0].name).toBe('&lt;script&gt;1&lt;/script&gt;');
      expect(req.body.items[1].name).toBe('&lt;script&gt;2&lt;/script&gt;');
    });
  });

  describe('Data type handling', () => {
    it('should not modify numbers', () => {
      const req = requestFactory({
        body: {
          count: 42,
          price: 19.99,
        },
      });
      const res = responseFactory();
      const next = nextFactory();

      sanitizeRequest(req as any, res, next);

      expect(req.body.count).toBe(42);
      expect(req.body.price).toBe(19.99);
    });

    it('should not modify booleans', () => {
      const req = requestFactory({
        body: {
          active: true,
          deleted: false,
        },
      });
      const res = responseFactory();
      const next = nextFactory();

      sanitizeRequest(req as any, res, next);

      expect(req.body.active).toBe(true);
      expect(req.body.deleted).toBe(false);
    });

    it('should not modify null values', () => {
      const req = requestFactory({
        body: {
          optionalField: null,
        },
      });
      const res = responseFactory();
      const next = nextFactory();

      sanitizeRequest(req as any, res, next);

      expect(req.body.optionalField).toBeNull();
    });

    it('should handle undefined values', () => {
      const req = requestFactory({
        body: {
          field: undefined,
        },
      });
      const res = responseFactory();
      const next = nextFactory();

      sanitizeRequest(req as any, res, next);

      expect(req.body.field).toBeUndefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty body', () => {
      const req = requestFactory({
        body: {},
      });
      const res = responseFactory();
      const next = nextFactory();

      sanitizeRequest(req as any, res, next);

      expect(req.body).toEqual({});
      expect(next).toHaveBeenCalled();
    });

    it('should handle empty query', () => {
      const req = requestFactory({
        query: {},
      });
      const res = responseFactory();
      const next = nextFactory();

      sanitizeRequest(req as any, res, next);

      expect(req.query).toEqual({});
      expect(next).toHaveBeenCalled();
    });

    it('should handle missing body and query', () => {
      const req = requestFactory({});
      delete (req as any).body;
      delete (req as any).query;
      const res = responseFactory();
      const next = nextFactory();

      expect(() => {
        sanitizeRequest(req as any, res, next);
      }).not.toThrow();

      expect(next).toHaveBeenCalled();
    });

    it('should handle complex nested structures', () => {
      const req = requestFactory({
        body: {
          level1: {
            level2: {
              level3: {
                dangerous: '<script>xss</script>',
                array: ['<b>test</b>', { nested: '<i>deep</i>' }],
              },
            },
          },
        },
      });
      const res = responseFactory();
      const next = nextFactory();

      sanitizeRequest(req as any, res, next);

      expect(req.body.level1.level2.level3.dangerous).toBe('&lt;script&gt;xss&lt;/script&gt;');
      expect(req.body.level1.level2.level3.array[0]).toBe('&lt;b&gt;test&lt;/b&gt;');
      expect(req.body.level1.level2.level3.array[1].nested).toBe('&lt;i&gt;deep&lt;/i&gt;');
    });
  });

  describe('SQL injection prevention', () => {
    it('should escape SQL-like patterns', () => {
      const req = requestFactory({
        body: {
          input: "'; DROP TABLE users; --",
        },
      });
      const res = responseFactory();
      const next = nextFactory();

      sanitizeRequest(req as any, res, next);

      expect(req.body.input).toBe('&#x27;; DROP TABLE users; --');
    });
  });

  describe('Middleware behavior', () => {
    it('should always call next()', () => {
      const req = requestFactory({ body: {} });
      const res = responseFactory();
      const next = nextFactory();

      sanitizeRequest(req as any, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it('should not modify response object', () => {
      const req = requestFactory({ body: { test: '<script>xss</script>' } });
      const res = responseFactory();
      const next = nextFactory();

      sanitizeRequest(req as any, res, next);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
