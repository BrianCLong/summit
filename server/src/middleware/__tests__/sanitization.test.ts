import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { sanitizeInput } from '../sanitization.js';

describe('Sanitization Middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        mockReq = {
            body: {},
            query: {},
            params: {}
        };
        mockRes = {};
        next = jest.fn() as unknown as NextFunction;
    });

    it('should strip NoSQL injection keys starting with $ or .', () => {
        mockReq.body = {
            username: 'alice',
            '$where': '1 == 1',
            nested: {
                '.dangerous': true,
                safe: 123
            }
        };

        sanitizeInput(mockReq as Request, mockRes as Response, next);

        expect(mockReq.body).toEqual({
            username: 'alice',
            nested: {
                safe: 123
            }
        });
        expect(next).toHaveBeenCalled();
    });

    it('should prevent Prototype Pollution', () => {
        mockReq.body = {
            '__proto__': { admin: true },
            'constructor': { prototype: { malicious: true } },
            'normal': 'value'
        };

        sanitizeInput(mockReq as Request, mockRes as Response, next);

        expect(mockReq.body).toEqual({
            'normal': 'value'
        });
        // @ts-ignore
        expect(mockReq.body.__proto__).not.toHaveProperty('admin');
    });

    it('should escape HTML characters in strings (XSS protection)', () => {
        mockReq.body = {
            comment: '<script>alert("xss")</script>',
            safe: 'Hello & Welcome'
        };

        sanitizeInput(mockReq as Request, mockRes as Response, next);

        expect(mockReq.body.comment).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
        expect(mockReq.body.safe).toBe('Hello &amp; Welcome');
    });

    it('should preserve special object instances', () => {
        const now = new Date();
        const regex = /test/g;
        const buffer = Buffer.from('hello');

        mockReq.body = {
            date: now,
            pattern: regex,
            data: buffer,
            text: '<b>clean</b>'
        };

        sanitizeInput(mockReq as Request, mockRes as Response, next);

        expect(mockReq.body.date).toBeInstanceOf(Date);
        expect((mockReq.body.date as Date).getTime()).toBe(now.getTime());
        expect(mockReq.body.pattern).toBeInstanceOf(RegExp);
        expect(Buffer.isBuffer(mockReq.body.data)).toBe(true);
        expect(mockReq.body.text).toBe('&lt;b&gt;clean&lt;/b&gt;');
    });

    it('should sanitize query and params', () => {
        mockReq.query = { q: '"><img src=x onerror=alert(1)>' };
        mockReq.params = { '$id': 'dangerous', safe: '123' };

        sanitizeInput(mockReq as Request, mockRes as Response, next);

        expect(mockReq.query!.q).toContain('&quot;&gt;');
        expect(mockReq.params!['$id']).toBeUndefined();
        expect(mockReq.params!.safe).toBe('123');
    });

    it('should use Copy-on-Write for clean objects', () => {
        const cleanObj = { a: 1, b: 'safe' };
        mockReq.body = cleanObj;

        sanitizeInput(mockReq as Request, mockRes as Response, next);

        // Should be the exact same object reference if nothing changed
        expect(mockReq.body).toBe(cleanObj);
    });
});
