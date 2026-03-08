"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const canonicalize_1 = require("../../src/receipts/canonicalize");
const hash_1 = require("../../src/receipts/hash");
(0, globals_1.describe)('Receipt Integrity', () => {
    (0, globals_1.describe)('canonicalize', () => {
        (0, globals_1.it)('should be deterministic despite key ordering', () => {
            const obj1 = { a: 1, b: 2 };
            const obj2 = { b: 2, a: 1 };
            (0, globals_1.expect)((0, canonicalize_1.canonicalize)(obj1)).toBe((0, canonicalize_1.canonicalize)(obj2));
        });
        (0, globals_1.it)('should normalize whitespace in strings', () => {
            const obj1 = { id: ' 123 ' };
            const obj2 = { id: '123' };
            (0, globals_1.expect)((0, canonicalize_1.canonicalize)(obj1)).toBe((0, canonicalize_1.canonicalize)(obj2));
        });
        (0, globals_1.it)('should normalize whitespace in keys', () => {
            const obj1 = { ' key ': 'value' };
            const obj2 = { 'key': 'value' };
            (0, globals_1.expect)((0, canonicalize_1.canonicalize)(obj1)).toBe((0, canonicalize_1.canonicalize)(obj2));
        });
        (0, globals_1.it)('should handle nested objects', () => {
            const obj1 = { meta: { id: 1, type: ' A ' }, data: [1, 2] };
            const obj2 = { data: [1, 2], meta: { type: 'A', id: 1 } };
            (0, globals_1.expect)((0, canonicalize_1.canonicalize)(obj1)).toBe((0, canonicalize_1.canonicalize)(obj2));
        });
        (0, globals_1.it)('should differentiate arrays with different order', () => {
            const obj1 = { list: [1, 2] };
            const obj2 = { list: [2, 1] };
            (0, globals_1.expect)((0, canonicalize_1.canonicalize)(obj1)).not.toBe((0, canonicalize_1.canonicalize)(obj2));
        });
        (0, globals_1.it)('should handle dates (as strings)', () => {
            const d = new Date('2023-01-01T00:00:00.000Z');
            const obj1 = { date: d };
            // Date toJSON returns ISO string
            const obj2 = { date: '2023-01-01T00:00:00.000Z' };
            (0, globals_1.expect)((0, canonicalize_1.canonicalize)(obj1)).toBe((0, canonicalize_1.canonicalize)(obj2));
        });
    });
    (0, globals_1.describe)('calculateReceiptHash', () => {
        (0, globals_1.it)('should generate same hash for same semantic receipt', () => {
            const r1 = {
                id: 'rec_123',
                amount: 100.50,
                currency: 'USD',
                items: [{ id: 'item_1', price: 50.25 }, { id: 'item_2', price: 50.25 }],
                metadata: { source: '  stripe  ' }
            };
            const r2 = {
                metadata: { source: 'stripe' },
                currency: 'USD',
                items: [{ price: 50.25, id: 'item_1' }, { id: 'item_2', price: 50.25 }],
                amount: 100.50,
                id: 'rec_123'
            };
            const h1 = (0, hash_1.calculateReceiptHash)(r1);
            const h2 = (0, hash_1.calculateReceiptHash)(r2);
            (0, globals_1.expect)(h1).toBe(h2);
        });
        (0, globals_1.it)('should generate different hash for different receipt', () => {
            const r1 = { id: 'rec_1' };
            const r2 = { id: 'rec_2' };
            (0, globals_1.expect)((0, hash_1.calculateReceiptHash)(r1)).not.toBe((0, hash_1.calculateReceiptHash)(r2));
        });
        (0, globals_1.it)('should generate different hash for different array order', () => {
            const r1 = { items: [1, 2] };
            const r2 = { items: [2, 1] };
            (0, globals_1.expect)((0, hash_1.calculateReceiptHash)(r1)).not.toBe((0, hash_1.calculateReceiptHash)(r2));
        });
    });
});
