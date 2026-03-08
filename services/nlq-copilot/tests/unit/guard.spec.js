"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const guard_1 = require("../../src/guard");
describe('guard', () => {
    it('blocks dangerous cypher', () => {
        expect(() => (0, guard_1.forbidDangerous)('MATCH (n) DETACH DELETE n')).toThrow('dangerous_query');
    });
    it('estimates rows from limit', () => {
        expect((0, guard_1.estimate)('MATCH (n) RETURN n LIMIT 25').rows).toBe(25);
    });
});
