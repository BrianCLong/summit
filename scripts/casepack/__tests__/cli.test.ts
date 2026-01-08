import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

describe("Case Pack CLI", () => {
  const testDir = "tests/fixtures/casepack/cli-test";

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it("should build and verify a case pack", () => {
    const scopeFile = path.join(testDir, "scope.json");
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(scopeFile, JSON.stringify({ selectors: [] }));

    // Build the case pack
    execSync(
      `node scripts/casepack/build.mjs --case test-case --scope ${scopeFile} --out ${testDir}`
    );

    // Verify the case pack
    const output = execSync(`node scripts/casepack/verify.mjs --path ${testDir}`).toString();
    expect(output).toContain("Case pack verified successfully");
  });
});
