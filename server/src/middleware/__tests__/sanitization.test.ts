import { describe, it, expect, jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { sanitizeInput } from '../sanitization.js';

describe('sanitization middleware', () => {
    const mockResponse = () => {
        const res: any = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        return res as Response;
    };

    const mockNext = () => jest.fn() as unknown as NextFunction;

    it('should remove keys starting with $ or . (NoSQL injection)', () => {
        const req: any = {
            body: {
                username: 'jules',
                '$where': 'sleep(5000)',
                nested: {
                    '.key': 'value',
                    safe: 123
                }
            }
        };
        const res = mockResponse();
        const next = mockNext();

        sanitizeInput(req, res, next);

        expect(req.body).toEqual({
            username: 'jules',
            nested: {
                safe: 123
            }
        });
        expect(next).toHaveBeenCalled();
    });

    it('should prevent prototype pollution', () => {
        const req: any = {
            body: JSON.parse('{"username": "jules", "__proto__": {"polluted": "yes"}, "constructor": {"prototype": {"polluted": "yes"}}}')
        };
        const res = mockResponse();
        const next = mockNext();

        sanitizeInput(req, res, next);

        expect(req.body).toEqual({ username: 'jules' });
        expect(req.body.polluted).toBeUndefined();
        expect(next).toHaveBeenCalled();
    });

    it('should only iterate over own properties (ignore inherited)', () => {
        const parent = { inherited: 'value' };
        const body = Object.create(parent);
        body.own = 'safe';

        const req: any = { body };
        const res = mockResponse();
        const next = mockNext();

        sanitizeInput(req, res, next);

        expect(req.body).toEqual({ own: 'safe' });
        expect(req.body.inherited).toBeUndefined();
        expect(next).toHaveBeenCalled();
    });

    it('should preserve Date, RegExp and Buffer instances', () => {
        const date = new Date();
        const regex = /test/i;
        const buffer = Buffer.from('hello');

        const req: any = {
            body: {
                date,
                regex,
                buffer,
                safe: 'value'
            }
        };
        const res = mockResponse();
        const next = mockNext();

        sanitizeInput(req, res, next);

        expect(req.body.date).toBe(date);
        expect(req.body.date instanceof Date).toBe(true);
        expect(req.body.regex).toBe(regex);
        expect(req.body.regex instanceof RegExp).toBe(true);
        expect(req.body.buffer).toBe(buffer);
        expect(Buffer.isBuffer(req.body.buffer)).toBe(true);
        expect(next).toHaveBeenCalled();
    });

    it('should implement copy-on-write (return same object if clean)', () => {
        const body = {
            username: 'jules',
            nested: {
                safe: 123
            },
            array: [1, 2, 3]
        };
        const req: any = { body };
        const res = mockResponse();
        const next = mockNext();

        sanitizeInput(req, res, next);

        expect(req.body).toBe(body); // Same reference
        expect(req.body.nested).toBe(body.nested); // Same reference
        expect(req.body.array).toBe(body.array); // Same reference
        expect(next).toHaveBeenCalled();
    });

    it('should handle arrays correctly', () => {
        const req: any = {
            body: [
                { safe: 1 },
                { '$bad': 2 },
                { nested: [{ '.bad': 3 }, { safe: 4 }] }
            ]
        };
        const res = mockResponse();
        const next = mockNext();

        sanitizeInput(req, res, next);

        expect(req.body).toEqual([
            { safe: 1 },
            {},
            { nested: [{}, { safe: 4 }] }
        ]);
        expect(next).toHaveBeenCalled();
    });

    it('should sanitize req.query and req.params', () => {
        const req: any = {
            query: { '$gt': 0, safe: 'yes' },
            params: { '.id': '123', name: 'jules' }
        };
        const res = mockResponse();
        const next = mockNext();

        sanitizeInput(req, res, next);

        expect(req.query).toEqual({ safe: 'yes' });
        expect(req.params).toEqual({ name: 'jules' });
        expect(next).toHaveBeenCalled();
    });

    it('should HTML escape strings to prevent XSS', () => {
        const req: any = {
            body: {
                name: '<script>alert("xss")</script>',
                comment: 'User & Friend',
                array: ['<b>bold</b>', 'safe']
            }
        };
        const res = mockResponse();
        const next = mockNext();

        sanitizeInput(req, res, next);

        expect(req.body.name).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
        expect(req.body.comment).toBe('User &amp; Friend');
        expect(req.body.array[0]).toBe('&lt;b&gt;bold&lt;/b&gt;');
        expect(req.body.array[1]).toBe('safe');
        expect(next).toHaveBeenCalled();
    });
});
