import { describe, expect, it } from "vitest";
import { compareSchemas, SchemaRegistry, type SchemaDefinition } from "../src/index.js";

const base: SchemaDefinition = {
  name: "example",
  version: "v1",
  fields: {
    id: { type: "string", required: true },
    name: { type: "string", required: false },
  },
};

const additive: SchemaDefinition = {
  name: "example",
  version: "v2",
  fields: {
    ...base.fields,
    description: { type: "string", required: false },
  },
};

describe("schema compatibility", () => {
  it("allows additive optional fields by default", () => {
    const report = compareSchemas(base, additive);
    expect(report.compatible).toBe(true);
    expect(report.issues.some((issue) => issue.severity === "warning")).toBe(true);
  });

  it("flags removals as breaking with actionable reason", () => {
    const removal: SchemaDefinition = {
      name: "example",
      version: "v2",
      fields: { id: { type: "string", required: true } },
    };
    const report = compareSchemas(base, removal);
    expect(report.compatible).toBe(false);
    expect(report.issues[0].reason).toContain("Field removed");
  });

  it("requires migration document when breaking change approved", () => {
    const renamed: SchemaDefinition = {
      name: "example",
      version: "v2",
      fields: { id: { type: "number", required: true }, name: { type: "string" } },
    };
    const report = compareSchemas(base, renamed, {
      allowBreaking: true,
      migrationDocument: undefined,
    });
    expect(report.compatible).toBe(false);
  });

  it("loads registry from schema directory", async () => {
    const registry = await SchemaRegistry.fromDirectory("../schema");
    const reports = registry.checkLatest();
    const manifestReport = reports.find((r) => r.schema === "export-manifest");
    expect(manifestReport?.compatible).toBe(true);
  });
});
