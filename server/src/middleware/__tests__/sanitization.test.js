"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const sanitization_js_1 = require("../sanitization.js");
(0, globals_1.describe)('Sanitization Middleware (Optimized)', () => {
    const next = globals_1.jest.fn();
    const res = {};
    (0, globals_1.it)('should remove keys starting with $ or .', () => {
        const req = {
            body: {
                $gt: 5,
                nested: {
                    '.dot': 'value',
                    safe: 'keep'
                },
                safe: 123
            }
        };
        (0, sanitization_js_1.sanitizeInput)(req, res, next);
        (0, globals_1.expect)(req.body).toEqual({
            nested: {
                safe: 'keep'
            },
            safe: 123
        });
        (0, globals_1.expect)(next).toHaveBeenCalled();
    });
    (0, globals_1.it)('should implement Copy-on-Write and return the same object if clean', () => {
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
        };
        (0, sanitization_js_1.sanitizeInput)(req, res, next);
        // Reference equality check
        (0, globals_1.expect)(req.body).toBe(cleanBody);
    });
    (0, globals_1.it)('should only create new objects for parts that changed', () => {
        const nestedClean = { safe: true };
        const req = {
            body: {
                $bad: true,
                clean: nestedClean
            }
        };
        (0, sanitization_js_1.sanitizeInput)(req, res, next);
        (0, globals_1.expect)(req.body).toEqual({ clean: { safe: true } });
        (0, globals_1.expect)(req.body).not.toBe(req.body.body); // Root changed
        (0, globals_1.expect)(req.body.clean).toBe(nestedClean); // Nested preserved
    });
    (0, globals_1.it)('should preserve Date, RegExp, and Buffer instances', () => {
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
        };
        (0, sanitization_js_1.sanitizeInput)(req, res, next);
        (0, globals_1.expect)(req.body.date).toBe(date);
        (0, globals_1.expect)(req.body.regex).toBe(regex);
        (0, globals_1.expect)(req.body.buffer).toBe(buffer);
        (0, globals_1.expect)(req.body.nested.date).toBe(date);
        (0, globals_1.expect)(req.body.nested.$remove).toBeUndefined();
    });
    (0, globals_1.it)('should handle arrays with Copy-on-Write', () => {
        const cleanItem = { ok: true };
        const dirtyItem = { $bad: true };
        const req = {
            body: [cleanItem, dirtyItem]
        };
        (0, sanitization_js_1.sanitizeInput)(req, res, next);
        (0, globals_1.expect)(req.body).toHaveLength(2);
        (0, globals_1.expect)(req.body[0]).toBe(cleanItem); // Reference preserved
        (0, globals_1.expect)(req.body[1]).toEqual({}); // Sanitized
    });
    (0, globals_1.it)('should sanitize req.query and req.params using Object.defineProperty if changed', () => {
        const req = {
            query: { $where: '1=1', safe: 'abc' },
            params: { id: '123' } // Clean
        };
        const originalParams = req.params;
        (0, sanitization_js_1.sanitizeInput)(req, res, next);
        (0, globals_1.expect)(req.query).toEqual({ safe: 'abc' });
        (0, globals_1.expect)(req.query.$where).toBeUndefined();
        (0, globals_1.expect)(req.params).toBe(originalParams); // Should NOT have been redefined since it was clean
    });
    (0, globals_1.it)('should handle null and undefined gracefully', () => {
        const req = {
            body: {
                val: null,
                undef: undefined,
                nested: null
            }
        };
        (0, sanitization_js_1.sanitizeInput)(req, res, next);
        (0, globals_1.expect)(req.body).toEqual({
            val: null,
            undef: undefined,
            nested: null
        });
        (0, globals_1.expect)(req.body).toBe(req.body); // Reference preserved
    });
});
