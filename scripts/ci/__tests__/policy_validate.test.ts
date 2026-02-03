import { describe, it } from "node:test";
import assert from "assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.resolve(__dirname, "../policy_validate.ts");
const tempDir = path.resolve(__dirname, "../../temp_policy_test");

describe("policy_validate.ts script", () => {
    // Setup and cleanup
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

    it("should generate artifacts for valid policy", () => {
        const policyFile = path.join(tempDir, "valid_policy.yaml");
        fs.writeFileSync(policyFile, "name: test\n");

        const env = {
            ...process.env,
            POLICY_FILE: policyFile,
            ARTIFACT_DIR: path.join(tempDir, "artifacts"),
            EVIDENCE_ID: "TEST-EVID-1"
        };

        // Execute the script using tsx
        try {
            execSync(`npx tsx ${scriptPath}`, { env, stdio: 'inherit' });
        } catch (e) {
            assert.fail("Script failed execution");
        }

        const reportPath = path.join(tempDir, "artifacts", "report.json");
        assert.ok(fs.existsSync(reportPath), "report.json should exist");

        const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
        assert.equal(report.ok, true);
        assert.equal(report.evidenceId, "TEST-EVID-1");
    });

    it("should fail for invalid policy", () => {
        const policyFile = path.join(tempDir, "invalid_policy.yaml");
        fs.writeFileSync(policyFile, "INVALID_POLICY");

        const env = {
            ...process.env,
            POLICY_FILE: policyFile,
            ARTIFACT_DIR: path.join(tempDir, "artifacts_fail"),
            EVIDENCE_ID: "TEST-EVID-2"
        };

        try {
            execSync(`npx tsx ${scriptPath}`, { env, stdio: 'pipe' }); // pipe to suppress error output
            assert.fail("Script should have failed");
        } catch (e) {
            // Expected failure
        }

        // Artifacts should still be written (the script writes them before exit(1))
        const reportPath = path.join(tempDir, "artifacts_fail", "report.json");
        assert.ok(fs.existsSync(reportPath), "report.json should exist even on failure");

        const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
        assert.equal(report.ok, false);
    });

    // Cleanup
    // fs.rmSync(tempDir, { recursive: true, force: true });
});
