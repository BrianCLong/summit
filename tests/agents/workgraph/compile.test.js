"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const compile_1 = require("../../../src/agents/workgraph/compile");
describe("WorkGraph Compiler", () => {
    it("should deterministically compile a spec into a WorkGraph", () => {
        // Read the golden fixture
        const specPath = (0, path_1.join)(process.cwd(), "tests/fixtures/specs/todo-app/spec.md");
        const specContent = (0, fs_1.readFileSync)(specPath, "utf-8");
        // Compile
        const workGraph = (0, compile_1.compileWorkGraph)(specContent);
        // Assert determinism & correct parsing
        expect(workGraph).toMatchSnapshot();
        // Specific assertions
        expect(workGraph.tickets).toHaveLength(4);
        // TICKET-001
        const t1 = workGraph.tickets.find(t => t.id === "TICKET-001");
        expect(t1).toBeDefined();
        expect(t1?.title).toBe("Setup Project");
        expect(t1?.owners).toEqual(["package.json", "tsconfig.json"]);
        expect(t1?.deps).toEqual([]);
        expect(t1?.evidence).toEqual(["EVID:setup:001"]);
        // TICKET-002
        const t2 = workGraph.tickets.find(t => t.id === "TICKET-002");
        expect(t2).toBeDefined();
        expect(t2?.deps).toEqual(["TICKET-001"]);
    });
});
