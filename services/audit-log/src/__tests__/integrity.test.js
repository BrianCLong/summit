"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../index.js");
describe('audit log integrity', () => {
    test('tampering changes merkle root', () => {
        const rec1 = {
            user: 'u',
            action: 'a',
            resource: 'r',
            authorityId: 'id',
            reason: 'ok',
            timestamp: '1',
        };
        const hash1 = (0, index_js_1.computeHash)(rec1, '');
        const rec2 = {
            user: 'u2',
            action: 'a2',
            resource: 'r2',
            authorityId: 'id2',
            reason: 'ok2',
            timestamp: '2',
        };
        const hash2 = (0, index_js_1.computeHash)(rec2, hash1);
        const root = (0, index_js_1.merkleRoot)([hash1, hash2]);
        const tamperedHash2 = (0, index_js_1.computeHash)({ ...rec2, reason: 'bad' }, hash1);
        const tamperedRoot = (0, index_js_1.merkleRoot)([hash1, tamperedHash2]);
        expect(tamperedRoot).not.toBe(root);
    });
});
