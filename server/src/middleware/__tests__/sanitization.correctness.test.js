"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const sanitization_js_1 = require("../sanitization.js");
(0, globals_1.describe)('sanitization middleware COW and correctness', () => {
    (0, globals_1.it)('should preserve the same object reference if no keys start with $ or .', () => {
        const body = {
            name: 'test',
            items: [1, 2, 3],
            nested: { a: 1, b: 2 }
        };
        const req = { body };
        const res = {};
        const next = (() => { });
        (0, sanitization_js_1.sanitizeInput)(req, res, next);
        (0, globals_1.expect)(req.body).toBe(body);
        (0, globals_1.expect)(req.body.items).toBe(body.items);
        (0, globals_1.expect)(req.body.nested).toBe(body.nested);
    });
    (0, globals_1.it)('should remove keys starting with $ or . and return a new object', () => {
        const body = {
            name: 'test',
            $bad: 'remove me',
            nested: {
                '.bad': 'remove me too',
                ok: true
            }
        };
        const req = { body };
        const res = {};
        const next = (() => { });
        (0, sanitization_js_1.sanitizeInput)(req, res, next);
        (0, globals_1.expect)(req.body).not.toBe(body);
        (0, globals_1.expect)(req.body.$bad).toBeUndefined();
        (0, globals_1.expect)(req.body.name).toBe('test');
        (0, globals_1.expect)(req.body.nested).not.toBe(body.nested);
        (0, globals_1.expect)(req.body.nested['.bad']).toBeUndefined();
        (0, globals_1.expect)(req.body.nested.ok).toBe(true);
    });
    (0, globals_1.it)('should preserve Date, RegExp and Buffer instances', () => {
        const date = new Date();
        const regex = /test/i;
        const buffer = Buffer.from('test');
        const body = {
            date,
            regex,
            buffer,
            nested: { date }
        };
        const req = { body };
        const res = {};
        const next = (() => { });
        (0, sanitization_js_1.sanitizeInput)(req, res, next);
        (0, globals_1.expect)(req.body).toBe(body);
        (0, globals_1.expect)(req.body.date).toBe(date);
        (0, globals_1.expect)(req.body.regex).toBe(regex);
        (0, globals_1.expect)(req.body.buffer).toBe(buffer);
        (0, globals_1.expect)(req.body.nested.date).toBe(date);
    });
    (0, globals_1.it)('should correctly handle arrays and COW', () => {
        const items = [1, 2, 3];
        const dirtyItems = [1, { $bad: 1 }, 3];
        const body = { items, dirtyItems };
        const req = { body };
        const res = {};
        const next = (() => { });
        (0, sanitization_js_1.sanitizeInput)(req, res, next);
        (0, globals_1.expect)(req.body.items).toBe(items);
        (0, globals_1.expect)(req.body.dirtyItems).not.toBe(dirtyItems);
        (0, globals_1.expect)(req.body.dirtyItems[1]).toEqual({});
    });
    (0, globals_1.it)('should avoid redundant Object.defineProperty for query and params', () => {
        const query = { q: 'test' };
        const params = { id: '123' };
        // We use a proxy or a mock to check if defineProperty was called
        // But since we can't easily spy on Object.defineProperty, we just check if it works
        const req = { query, params };
        const res = {};
        const next = (() => { });
        // To test if defineProperty was called, we can make the property non-configurable
        Object.defineProperty(req, 'query', {
            value: query,
            configurable: false,
            writable: true
        });
        // This should NOT throw if we skip defineProperty when not needed
        (0, globals_1.expect)(() => (0, sanitization_js_1.sanitizeInput)(req, res, next)).not.toThrow();
    });
});
