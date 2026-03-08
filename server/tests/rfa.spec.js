"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rfa_js_1 = require("../src/middleware/rfa.js");
describe('reason-for-access middleware', () => {
    it('blocks restricted without reason', () => {
        const mw = (0, rfa_js_1.requireReason)(['sensitivity:restricted']);
        const req = { headers: {} };
        const res = {
            status: (c) => ({ json: (x) => ({ c, x }) }),
        };
        const next = jest.fn();
        const out = mw(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(out).toBeDefined();
    });
});
