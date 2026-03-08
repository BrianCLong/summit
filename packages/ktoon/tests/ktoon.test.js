"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_js_1 = require("../src/index.js");
const sampleBookings = [
    { id: 1, status: 'confirmed', artist: { id: 'PGreBnRL', name: 'René Bourgeois' } },
    { id: 2, status: 'cancelled', artist: { id: 'ABCD1234', name: 'Some Artist' } }
];
(0, vitest_1.describe)('encodeKtoon', () => {
    (0, vitest_1.it)('builds key and value dictionaries when repetition occurs', () => {
        const doc = (0, index_js_1.encodeKtoon)(sampleBookings);
        (0, vitest_1.expect)(doc.keys).toBeDefined();
        (0, vitest_1.expect)(Object.values(doc.keys ?? {})).toContain('id');
        (0, vitest_1.expect)(doc.values).toBeDefined();
        (0, vitest_1.expect)((0, index_js_1.renderKtoon)(doc)).toContain('@vals');
    });
    (0, vitest_1.it)('optimizes uniform arrays into tables', () => {
        const doc = (0, index_js_1.encodeKtoon)(sampleBookings);
        (0, vitest_1.expect)(doc.body.type).toBe('table');
        if (doc.body.type === 'table') {
            (0, vitest_1.expect)(doc.body.columns).toEqual(['artist', 'id', 'status']);
            (0, vitest_1.expect)(doc.body.rows.length).toBe(2);
        }
    });
});
(0, vitest_1.describe)('patch application', () => {
    (0, vitest_1.it)('applies append and update patches on tables', () => {
        const base = (0, index_js_1.encodeKtoon)(sampleBookings).body;
        if (base.type !== 'table')
            throw new Error('expected table');
        base.primaryKey = 'id';
        const patched = (0, index_js_1.applyPatches)(base, [
            { op: 'append', path: base.name ?? 'table', rows: [[3, 'hold', { id: 'XYZ', name: 'New Artist' }]] },
            { op: 'update', path: base.name ?? 'table', key: 'id', rows: [{ id: 2, status: 'confirmed' }] }
        ]);
        if (patched.type !== 'table')
            throw new Error('expected table');
        (0, vitest_1.expect)(patched.rows).toHaveLength(3);
        const statusIdx = patched.columns.indexOf('status');
        const second = patched.rows.find((row) => row[patched.columns.indexOf('id')] === 2);
        (0, vitest_1.expect)(second?.[statusIdx]).toBe('confirmed');
    });
});
(0, vitest_1.describe)('rendering', () => {
    (0, vitest_1.it)('produces strict TOON output when requested', () => {
        const doc = (0, index_js_1.encodeKtoon)(sampleBookings, { mode: 'strict-toon' });
        const text = (0, index_js_1.renderKtoon)(doc, true);
        (0, vitest_1.expect)(text).not.toContain('@keys');
        (0, vitest_1.expect)(text).toContain('bookings');
    });
});
