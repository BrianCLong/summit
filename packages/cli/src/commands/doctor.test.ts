import { mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { formatDoctorResults, runDoctorChecks } from "./doctor.js";

const stripAnsi = (value: string): string => value.replace(/\u001b\[[0-9;]*m/g, "");

const originalEnv = { ...process.env };
let originalHome: string | undefined;

const useTempHome = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "summit-cli-"));
  process.env.HOME = dir;
  process.env.USERPROFILE = dir;
  return dir;
};

describe("doctor command", () => {
  beforeEach(() => {
    originalHome = process.env.HOME;
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    if (originalHome) {
      process.env.HOME = originalHome;
      process.env.USERPROFILE = originalHome;
    }
  });

  it("reports pass status when environment is healthy", async () => {
    useTempHome();
    process.env.SUMMIT_API_URL = "https://api.summit.local";
    process.env.SUMMIT_API_KEY = "test-key";
    process.env.SUMMIT_TENANT_ID = "tenant-123";

    const { results, exitCode } = await runDoctorChecks();
    const output = stripAnsi(formatDoctorResults(results));

    expect(exitCode).toBe(0);
    expect(results.every((result) => result.status === "PASS")).toBe(true);
    expect(output).toContain("PASS");
    expect(output).toContain("Schema file baseline.graphql");
  });

  it("returns non-zero exit when critical settings are missing", async () => {
    useTempHome();
    delete process.env.SUMMIT_API_URL;
    delete process.env.SUMMIT_API_KEY;
    delete process.env.SUMMIT_TENANT_ID;

    const { results, exitCode } = await runDoctorChecks();
    const output = stripAnsi(formatDoctorResults(results));

    expect(exitCode).toBe(1);
    expect(results.some((result) => result.critical && result.status === "FAIL")).toBe(true);
    expect(output).toMatch(/FAIL/);
  });
});
