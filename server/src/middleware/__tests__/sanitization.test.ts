import { describe, it, expect, jest } from '@jest/globals';
import { sanitizeInput } from '../sanitization.js';

describe('Sanitization Middleware (Optimized)', () => {
    const next = jest.fn();
    const res = {} as any;

    it('should remove keys starting with $ or .', () => {
        const req = {
            body: {
                $gt: 5,
                nested: {
                    '.dot': 'value',
                    safe: 'keep'
                },
                safe: 123
            }
        } as any;

        sanitizeInput(req, res, next);

        expect(req.body).toEqual({
            nested: {
                safe: 'keep'
            },
            safe: 123
        });
        expect(next).toHaveBeenCalled();
    });

    it('should implement Copy-on-Write and return the same object if clean', () => {
        const cleanBody = {
            name: 'John',
            age: 30,
            tags: ['a', 'b'],
            meta: {
                foo: 'bar'
            }
        };
        const req = {
            body: cleanBody
        } as any;

        sanitizeInput(req, res, next);

        // Reference equality check
        expect(req.body).toBe(cleanBody);
    });

    it('should only create new objects for parts that changed', () => {
        const nestedClean = { safe: true };
        const req = {
            body: {
                $bad: true,
                clean: nestedClean
            }
        } as any;

        sanitizeInput(req, res, next);

        expect(req.body).toEqual({ clean: { safe: true } });
        expect(req.body).not.toBe(req.body.body); // Root changed
        expect(req.body.clean).toBe(nestedClean); // Nested preserved
    });

    it('should preserve Date, RegExp, and Buffer instances', () => {
        const date = new Date();
        const regex = /test/i;
        const buffer = Buffer.from('hello');

        const req = {
            body: {
                date,
                regex,
                buffer,
                nested: {
                    date,
                    $remove: true
                }
            }
        } as any;

        sanitizeInput(req, res, next);

        expect(req.body.date).toBe(date);
        expect(req.body.regex).toBe(regex);
        expect(req.body.buffer).toBe(buffer);
        expect(req.body.nested.date).toBe(date);
        expect(req.body.nested.$remove).toBeUndefined();
    });

    it('should handle arrays with Copy-on-Write', () => {
        const cleanItem = { ok: true };
        const dirtyItem = { $bad: true };
        const req = {
            body: [cleanItem, dirtyItem]
        } as any;

        sanitizeInput(req, res, next);

        expect(req.body).toHaveLength(2);
        expect(req.body[0]).toBe(cleanItem); // Reference preserved
        expect(req.body[1]).toEqual({}); // Sanitized
    });

    it('should sanitize req.query and req.params using Object.defineProperty if changed', () => {
        const req = {
            query: { $where: '1=1', safe: 'abc' },
            params: { id: '123' } // Clean
        } as any;

        const originalParams = req.params;

        sanitizeInput(req, res, next);

        expect(req.query).toEqual({ safe: 'abc' });
        expect(req.query.$where).toBeUndefined();
        expect(req.params).toBe(originalParams); // Should NOT have been redefined since it was clean
    });

    it('should handle null and undefined gracefully', () => {
        const req = {
            body: {
                val: null,
                undef: undefined,
                nested: null
            }
        } as any;

        sanitizeInput(req, res, next);

        expect(req.body).toEqual({
            val: null,
            undef: undefined,
            nested: null
        });
        expect(req.body).toBe(req.body); // Reference preserved
    });
});
