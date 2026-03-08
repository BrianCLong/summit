"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const overlap_1 = require("../../src/overlap");
describe('overlap', () => {
    it('detects overlap', () => {
        expect((0, overlap_1.overlaps)(['a', 'b'], ['c', 'b'])).toBe(true);
        expect((0, overlap_1.overlaps)(['a'], ['b'])).toBe(false);
    });
});
