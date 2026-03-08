"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const router_1 = require("./router");
describe("Hybrid Router", () => {
    test("should choose regex for function calls", () => {
        expect((0, router_1.chooseRetrievalMode)("myFunc(")).toBe("regex");
    });
    test("should choose hybrid for natural language", () => {
        expect((0, router_1.chooseRetrievalMode)("how does auth work?")).toBe("hybrid");
    });
});
