"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Jest test scaffold for ABAC helpers
const abac_js_1 = require("../abac.js");
describe('ABAC filterFields', () => {
    it('passes through when no fields provided', () => {
        const v = { id: '1', kind: 'Account', props: { name: 'A', ssn: 'x' } };
        expect((0, abac_js_1.filterFields)(v, [])).toEqual(v);
    });
    it('picks allowed top-level and nested fields', () => {
        const v = {
            id: '1',
            kind: 'Account',
            props: { name: 'A', ssn: 'x' },
            secret: 'no',
        };
        const out = (0, abac_js_1.filterFields)(v, ['id', 'kind', 'props:name']);
        expect(out).toEqual({ id: '1', kind: 'Account', props: { name: 'A' } });
    });
});
