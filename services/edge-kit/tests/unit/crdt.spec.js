"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crdt_1 = require("../../src/crdt");
describe('crdt', () => {
    it('lww merge prefers newer', () => {
        const a = { x: { value: 1, ts: 1 } };
        const b = { x: { value: 2, ts: 2 } };
        expect((0, crdt_1.merge)(a, b).x.value).toBe(2);
    });
});
