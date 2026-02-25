import { sanitize } from '../sanitization.js';

describe('Sanitization Middleware', () => {
    it('should strip NoSQL injection keys starting with $ or .', () => {
        const input = {
            username: 'admin',
            password: { $gt: '' },
            'nested.key': 'value'
        };
        const expected = {
            username: 'admin'
        };
        expect(sanitize(input)).toEqual(expected);
    });

    it('should prevent Prototype Pollution', () => {
        const input = JSON.parse('{"username": "user", "__proto__": {"admin": true}}');
        const sanitized = sanitize(input);
        expect(sanitized.username).toBe('user');
        expect(sanitized.__proto__).toBeUndefined();
        expect((Object.prototype as any).admin).toBeUndefined();
    });

    it('should escape HTML characters in strings (XSS protection)', () => {
        const input = {
            comment: '<script>alert("xss")</script>',
            safe: 'Hello World'
        };
        const sanitized = sanitize(input);
        expect(sanitized.comment).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
        expect(sanitized.safe).toBe('Hello World');
    });

    it('should preserve special object instances', () => {
        const now = new Date();
        const buffer = Buffer.from('hello');
        const input = { now, buffer };
        const sanitized = sanitize(input);
        expect(sanitized.now).toBe(now);
        expect(sanitized.buffer).toBe(buffer);
        expect(sanitized.now instanceof Date).toBe(true);
    });

    it('should sanitize query and params', () => {
        const query = { id: { $ne: null } };
        const sanitized = sanitize(query);
        expect(sanitized).toEqual({});
    });

    it('should use Copy-on-Write for clean objects', () => {
        const input = { safe: 'data', count: 123 };
        const sanitized = sanitize(input);
        expect(sanitized).toBe(input); // Should be the same instance
    });
});
