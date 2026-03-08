
import { describe, it, expect } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { sanitizeInput } from '../sanitization.js';

describe('sanitization middleware COW and correctness', () => {
  it('should preserve the same object reference if no keys start with $ or .', () => {
    const body = {
      name: 'test',
      items: [1, 2, 3],
      nested: { a: 1, b: 2 }
    };
    const req = { body } as unknown as Request;
    const res = {} as Response;
    const next = (() => {}) as NextFunction;

    sanitizeInput(req, res, next);

    expect(req.body).toBe(body);
    expect(req.body.items).toBe(body.items);
    expect(req.body.nested).toBe(body.nested);
  });

  it('should remove keys starting with $ or . and return a new object', () => {
    const body = {
      name: 'test',
      $bad: 'remove me',
      nested: {
        '.bad': 'remove me too',
        ok: true
      }
    };
    const req = { body } as unknown as Request;
    const res = {} as Response;
    const next = (() => {}) as NextFunction;

    sanitizeInput(req, res, next);

    expect(req.body).not.toBe(body);
    expect(req.body.$bad).toBeUndefined();
    expect(req.body.name).toBe('test');
    expect(req.body.nested).not.toBe(body.nested);
    expect(req.body.nested['.bad']).toBeUndefined();
    expect(req.body.nested.ok).toBe(true);
  });

  it('should preserve Date, RegExp and Buffer instances', () => {
    const date = new Date();
    const regex = /test/i;
    const buffer = Buffer.from('test');
    const body = {
      date,
      regex,
      buffer,
      nested: { date }
    };
    const req = { body } as unknown as Request;
    const res = {} as Response;
    const next = (() => {}) as NextFunction;

    sanitizeInput(req, res, next);

    expect(req.body).toBe(body);
    expect(req.body.date).toBe(date);
    expect(req.body.regex).toBe(regex);
    expect(req.body.buffer).toBe(buffer);
    expect(req.body.nested.date).toBe(date);
  });

  it('should correctly handle arrays and COW', () => {
    const items = [1, 2, 3];
    const dirtyItems = [1, { $bad: 1 }, 3];
    const body = { items, dirtyItems };
    const req = { body } as unknown as Request;
    const res = {} as Response;
    const next = (() => {}) as NextFunction;

    sanitizeInput(req, res, next);

    expect(req.body.items).toBe(items);
    expect(req.body.dirtyItems).not.toBe(dirtyItems);
    expect(req.body.dirtyItems[1]).toEqual({});
  });

  it('should avoid redundant Object.defineProperty for query and params', () => {
    const query = { q: 'test' };
    const params = { id: '123' };

    // We use a proxy or a mock to check if defineProperty was called
    // But since we can't easily spy on Object.defineProperty, we just check if it works
    const req = { query, params } as unknown as Request;
    const res = {} as Response;
    const next = (() => {}) as NextFunction;

    // To test if defineProperty was called, we can make the property non-configurable
    Object.defineProperty(req, 'query', {
        value: query,
        configurable: false,
        writable: true
    });

    // This should NOT throw if we skip defineProperty when not needed
    expect(() => sanitizeInput(req, res, next)).not.toThrow();
  });
});
