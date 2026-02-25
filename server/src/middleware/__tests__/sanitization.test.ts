import { jest, describe, it, expect } from '@jest/globals';
import { sanitizeInput } from '../sanitization.js';
import { Request, Response } from 'express';

describe('Sanitization Middleware', () => {
  it('should remove NoSQL injection keys starting with $', () => {
    const req = {
      body: {
        username: 'admin',
        password: { $gt: '' }
      }
    } as unknown as Request;
    const res = {} as Response;
    const next = jest.fn();

    sanitizeInput(req, res, (next as any));

    expect(req.body).toEqual({ username: 'admin' });
    expect(next).toHaveBeenCalled();
  });

  it('should block prototype pollution keys', () => {
    const req = {
      body: {
        name: 'test',
        __proto__: { admin: true },
        constructor: { prototype: { malicious: true } }
      }
    } as unknown as Request;
    const res = {} as Response;
    const next = jest.fn();

    sanitizeInput(req, res, (next as any));

    expect(req.body).toEqual({ name: 'test' });
    expect((req.body as any).__proto__).not.toEqual({ admin: true });
  });

  it('should preserve Date and Buffer instances', () => {
    const now = new Date();
    const buffer = Buffer.from('hello');
    const req = {
      body: {
        timestamp: now,
        data: buffer
      }
    } as unknown as Request;
    const res = {} as Response;
    const next = jest.fn();

    sanitizeInput(req, res, (next as any));

    expect(req.body.timestamp).toBeInstanceOf(Date);
    expect(req.body.timestamp).toEqual(now);
    expect(req.body.data).toBeInstanceOf(Buffer);
    expect(req.body.data).toEqual(buffer);
  });

  it('should handle nested arrays and objects', () => {
    const req = {
      body: {
        items: [
          { id: 1, name: 'safe' },
          { id: 2, '$hidden': 'secret' }
        ]
      }
    } as unknown as Request;
    const res = {} as Response;
    const next = jest.fn();

    sanitizeInput(req, res, (next as any));

    expect(req.body.items).toEqual([
      { id: 1, name: 'safe' },
      { id: 2 }
    ]);
  });
});
