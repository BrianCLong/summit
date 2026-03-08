"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hook_1 = require("../../src/hook");
describe('license hook', () => {
    it('denies restricted', () => {
        const r = (0, hook_1.canExport)([
            { id: 'ds1', name: 'Restricted', terms: { export: 'deny' } },
        ], 'ds1');
        expect(r.allowed).toBe(false);
    });
});
