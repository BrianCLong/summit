"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dsl_1 = require("../../src/dsl");
const compile_1 = require("../../src/compile");
describe('lac compiler', () => {
    it('dsl compiles to rego', () => {
        const rules = (0, dsl_1.parse)('permit role:DisclosureApprover export where license != restricted');
        const rego = (0, compile_1.toOPA)(rules);
        expect(rego).toMatch(/package export\.authz/);
        expect(rego).toMatch(/allow/);
    });
});
