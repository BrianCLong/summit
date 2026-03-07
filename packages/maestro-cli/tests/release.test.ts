import { ReleaseCommand } from "../src/commands/release";
import { writeFileSync, mkdirSync, rmSync, readFileSync } from "fs";
import { resolve } from "path";

describe("Maestro Release Dry-Run", () => {
  const testDir = resolve(process.cwd(), "temp-test-dir");
  const resultFilePath = resolve(process.cwd(), "maestro-release-dryrun-result.json");

  beforeAll(() => {
    // Create a temp directory for test files
    mkdirSync(testDir, { recursive: true });
    // Prevent process.exit from being called during tests
    process.env.NODE_ENV = "test";
  });

  afterAll(() => {
    // Cleanup the temp directory
    rmSync(testDir, { recursive: true, force: true });
    rmSync(resultFilePath, { force: true });
    delete process.env.NODE_ENV;
  });

  const createTestBundle = (name: string, content: object | string) => {
    const filePath = resolve(testDir, name);
    const contentString = typeof content === "string" ? content : JSON.stringify(content, null, 2);
    writeFileSync(filePath, contentString);
    return filePath;
  };

  const getResult = () => {
    return JSON.parse(readFileSync(resultFilePath, "utf-8"));
  };

  it("should return GO for a valid bundle", async () => {
    const bundlePath = createTestBundle("valid.json", {
      schemaVersion: "1.0.0",
      decision: "GO",
    });
    const command = new ReleaseCommand();
    await command.dryRun({ bundle: bundlePath, verbose: false });

    const result = getResult();
    expect(result.decision).toBe("GO");
    expect(result.reasons).toHaveLength(0);
  });

  it("should return NO-GO for invalid JSON", async () => {
    const bundlePath = createTestBundle(
      "invalid.json",
      '{ "schemaVersion": "1.0.0", "decision": "GO"'
    );
    const command = new ReleaseCommand();
    await command.dryRun({ bundle: bundlePath, verbose: false });

    const result = getResult();
    expect(result.decision).toBe("NO-GO");
    expect(result.reasons[0].code).toBe("BUNDLE_INVALID_JSON");
  });

  it("should return NO-GO for missing required field", async () => {
    const bundlePath = createTestBundle("missing-field.json", {
      decision: "GO",
    });
    const command = new ReleaseCommand();
    await command.dryRun({ bundle: bundlePath, verbose: false });

    const result = getResult();
    expect(result.decision).toBe("NO-GO");
    expect(result.reasons[0].code).toBe("BUNDLE_MISSING_FIELD");
  });

  it("should return NO-GO for incompatible schema version", async () => {
    const bundlePath = createTestBundle("incompatible-schema.json", {
      schemaVersion: "0.1.0",
      decision: "GO",
    });
    const command = new ReleaseCommand();
    await command.dryRun({ bundle: bundlePath, verbose: false });

    const result = getResult();
    expect(result.decision).toBe("NO-GO");
    expect(result.reasons[0].code).toBe("BUNDLE_SCHEMA_INCOMPATIBLE");
  });

  it("should passthrough blockedReasons from the bundle", async () => {
    const bundlePath = createTestBundle("blocked.json", {
      schemaVersion: "1.0.0",
      decision: "NO-GO",
      reasons: [{ code: "MANUAL_BLOCK", message: "Release manually blocked" }],
    });
    const command = new ReleaseCommand();
    await command.dryRun({ bundle: bundlePath, verbose: false });

    const result = getResult();
    expect(result.decision).toBe("NO-GO");
    expect(result.reasons[0].code).toBe("MANUAL_BLOCK");
  });
});
