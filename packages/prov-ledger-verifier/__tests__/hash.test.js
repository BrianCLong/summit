"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hash_js_1 = require("../src/hash.js");
describe('hash utilities', () => {
    it('builds deterministic merkle roots', () => {
        const leaves = [
            (0, hash_js_1.hashLeaf)('evidence-1', 'hash-a'),
            (0, hash_js_1.hashLeaf)('evidence-2', 'hash-b'),
            (0, hash_js_1.hashLeaf)('evidence-3', 'hash-c'),
        ];
        const { root } = (0, hash_js_1.buildMerkleRoot)(leaves);
        expect(root).toBe('6051f0bf0f3c7c5b2531731f22a8633a3fe6b3d8a09f8914d565a2379b9073ab');
    });
    it('handles a single leaf', () => {
        const { root } = (0, hash_js_1.buildMerkleRoot)([(0, hash_js_1.hashLeaf)('only', 'abc')]);
        expect(root).toBe((0, hash_js_1.hashLeaf)('only', 'abc'));
    });
});
