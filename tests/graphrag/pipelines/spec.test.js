"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const contracts_1 = require("../../../src/graphrag/pipelines/contracts");
const planner_1 = require("../../../src/graphrag/pipelines/planner");
const basePipeline = {
    id: "pipeline-a",
    version: "1.0.0",
    datasets: [
        {
            name: "users",
            source: "s3://raw/users.parquet",
            schema: { id: "string" },
        },
    ],
    dependencies: [],
    materialization: "batch",
};
describe("declarative pipeline contracts", () => {
    it("accepts a valid pipeline", () => {
        expect(() => (0, contracts_1.validatePipeline)(basePipeline)).not.toThrow();
    });
    it("rejects unknown top-level fields", () => {
        expect(() => (0, contracts_1.parsePipeline)({
            ...basePipeline,
            rogue: true,
        })).toThrow("Unknown pipeline field: rogue");
    });
    it("rejects cyclic pipeline dependencies", () => {
        const b = {
            ...basePipeline,
            id: "pipeline-b",
            dependencies: ["pipeline-c"],
        };
        const c = {
            ...basePipeline,
            id: "pipeline-c",
            dependencies: ["pipeline-b"],
        };
        expect(() => (0, planner_1.resolveOrder)([b, c])).toThrow("Cyclic dependency detected");
    });
});
