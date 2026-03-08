"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const compiler_1 = require("../../../../src/agents/ael/governance/compiler");
describe("AEL governance compiler", () => {
    test("deny-by-default fixture blocks missing approval", () => {
        const constraints = (0, compiler_1.compileConstraints)();
        const c = constraints.find(x => x.id.includes("NO-PROD-WRITE"));
        expect(c.allow({})).toBe(false);
    });
    test("positive fixture allows with approval token", () => {
        const constraints = (0, compiler_1.compileConstraints)();
        const c = constraints.find(x => x.id.includes("NO-PROD-WRITE"));
        expect(c.allow({ approval: "APPROVED" })).toBe(true);
    });
});
