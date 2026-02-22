import { Request, Response, NextFunction } from 'express';
import { sanitizeInput } from '../sanitization';
import { describe, it, expect, jest } from '@jest/globals';

describe('sanitization middleware', () => {
  it('should remove keys starting with $ or .', () => {
    const req = {
      body: {
        safe: 'value',
        '$unsafe': 'value',
        '.unsafe': 'value',
        nested: {
          ok: 1,
          '$no': 2
        }
      },
      query: {
        'a.b': 'c',
        '.unsafe': 'value',
        d: 'e'
      }
    } as unknown as Request;

    const res = {} as Response;
    const next = jest.fn() as NextFunction;

    sanitizeInput(req, res, next);

    expect(req.body).toEqual({
      safe: 'value',
      nested: {
        ok: 1
      }
    });
    expect(req.query).toEqual({
      'a.b': 'c',
      d: 'e'
    });
    expect(next).toHaveBeenCalled();
  });

  it('should handle arrays', () => {
    const req = {
      body: [
        { '$bad': 1, good: 2 },
        { also: { '.bad': 3, good: 4 } }
      ]
    } as unknown as Request;

    const res = {} as Response;
    const next = jest.fn() as NextFunction;

    sanitizeInput(req, res, next);

    expect(req.body).toEqual([
      { good: 2 },
      { also: { good: 4 } }
    ]);
  });

  it('should preserve Date, Buffer and RegExp objects', () => {
    const date = new Date();
    const buffer = Buffer.from('test');
    const regex = /test/;

    const req = {
      body: {
        date,
        buffer,
        regex,
        other: {
          '$bad': 1,
          date
        }
      }
    } as unknown as Request;

    const res = {} as Response;
    const next = jest.fn() as NextFunction;

    sanitizeInput(req, res, next);

    expect(req.body.date).toBe(date);
    expect(req.body.buffer).toBe(buffer);
    expect(req.body.regex).toBe(regex);
    expect(req.body.other.date).toBe(date);
    expect(req.body.other.$bad).toBeUndefined();
  });

  it('should not allocate new objects if no changes are needed (Copy-on-Write)', () => {
    const body = {
      a: 1,
      b: {
        c: 2
      },
      d: [3, 4]
    };
    const req = {
      body
    } as unknown as Request;

    const res = {} as Response;
    const next = jest.fn() as NextFunction;

    sanitizeInput(req, res, next);

    expect(req.body).toBe(body); // Same reference
    expect(req.body.b).toBe(body.b); // Same reference
    expect(req.body.d).toBe(body.d); // Same reference
  });

  it('should handle null and undefined', () => {
    const req = {
      body: {
        a: null,
        b: undefined
      }
    } as unknown as Request;

    const res = {} as Response;
    const next = jest.fn() as NextFunction;

    sanitizeInput(req, res, next);

    expect(req.body).toEqual({
      a: null,
      b: undefined
    });
  });
});
