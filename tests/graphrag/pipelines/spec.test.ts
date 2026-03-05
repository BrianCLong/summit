import { parsePipeline, validatePipeline } from "../../../src/graphrag/pipelines/contracts";
import { resolveOrder } from "../../../src/graphrag/pipelines/planner";
import type { DeclarativePipeline } from "../../../src/graphrag/pipelines/spec";

const basePipeline: DeclarativePipeline = {
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
    expect(() => validatePipeline(basePipeline)).not.toThrow();
  });

  it("rejects unknown top-level fields", () => {
    expect(() =>
      parsePipeline({
        ...basePipeline,
        rogue: true,
      })
    ).toThrow("Unknown pipeline field: rogue");
  });

  it("rejects cyclic pipeline dependencies", () => {
    const b: DeclarativePipeline = {
      ...basePipeline,
      id: "pipeline-b",
      dependencies: ["pipeline-c"],
    };
    const c: DeclarativePipeline = {
      ...basePipeline,
      id: "pipeline-c",
      dependencies: ["pipeline-b"],
    };

    expect(() => resolveOrder([b, c])).toThrow("Cyclic dependency detected");
  });
});
