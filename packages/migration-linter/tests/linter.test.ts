import path from "node:path";
import { describe, expect, it } from "vitest";
import { lintMigrations } from "../src/linter.js";

const fixtures = (file: string) => path.join(__dirname, "fixtures", file).replace(/\\/g, "/");

describe("migration linter", () => {
  it("allows additive nullable changes", async () => {
    const findings = await lintMigrations({
      patterns: [fixtures("safe_add_nullable.sql")],
    });
    expect(findings).toHaveLength(0);
  });

  it("blocks destructive changes", async () => {
    const findings = await lintMigrations({
      patterns: [fixtures("unsafe_drop_column.sql")],
    });
    expect(findings.some((f) => f.rule === "drop-column")).toBe(true);
  });

  it("allows explicitly approved destructive changes", async () => {
    const findings = await lintMigrations({
      patterns: [fixtures("unsafe_with_override.sql")],
    });
    expect(findings).toHaveLength(0);
  });
});
