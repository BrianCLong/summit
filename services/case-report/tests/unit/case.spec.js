"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const resolvers_1 = require("../../src/resolvers");
describe('case resolvers', () => {
    it('case_open returns id', () => {
        const r = resolvers_1.resolvers.Mutation.case_open({}, { title: 'T', sla: 'P2D' });
        expect(r.id).toMatch(/^c_/);
    });
});
