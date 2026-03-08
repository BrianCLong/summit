"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const plan_hash_js_1 = require("../plan-hash.js");
describe('plan-hash', () => {
    it('should strip dynamic keys', () => {
        const plan = {
            operatorType: 'Scan',
            rows: 100,
            dbHits: 50,
            arguments: { a: 1 },
            children: []
        };
        const expected = '{"arguments":{"a":1},"children":[],"operatorType":"Scan"}';
        expect((0, plan_hash_js_1.canonicalJson)(plan)).toBe(expected);
    });
    it('should sort children by operatorType and arguments', () => {
        const plan = {
            operatorType: 'Root',
            children: [
                { operatorType: 'B', arguments: { z: 1 } },
                { operatorType: 'A', arguments: { y: 2 } }
            ]
        };
        // children should be sorted A then B
        const json = (0, plan_hash_js_1.canonicalJson)(plan);
        const parsed = JSON.parse(json);
        expect(parsed.children[0].operatorType).toBe('A');
        expect(parsed.children[1].operatorType).toBe('B');
    });
    it('should sort children by arguments if operatorType is same', () => {
        const plan = {
            operatorType: 'Root',
            children: [
                { operatorType: 'A', arguments: { b: 2 } },
                { operatorType: 'A', arguments: { a: 1 } }
            ]
        };
        // arguments stringified: {"b":2} vs {"a":1}. "a" comes before "b" (alphabetical keys, then values)
        // stringify({"a":1}) is '{"a":1}'
        // stringify({"b":2}) is '{"b":2}'
        // '{"a":1}' < '{"b":2}'
        const json = (0, plan_hash_js_1.canonicalJson)(plan);
        const parsed = JSON.parse(json);
        expect(parsed.children[0].arguments.a).toBe(1);
        expect(parsed.children[1].arguments.b).toBe(2);
    });
    it('should produce stable fingerprint', () => {
        const plan1 = { operatorType: 'Scan', rows: 10, arguments: { x: 1 } };
        const plan2 = { operatorType: 'Scan', rows: 20, arguments: { x: 1 } }; // different rows, same plan
        expect((0, plan_hash_js_1.planFingerprint)(plan1)).toBe((0, plan_hash_js_1.planFingerprint)(plan2));
        const plan3 = { operatorType: 'Scan', rows: 10, arguments: { x: 2 } }; // different args
        expect((0, plan_hash_js_1.planFingerprint)(plan1)).not.toBe((0, plan_hash_js_1.planFingerprint)(plan3));
    });
});
