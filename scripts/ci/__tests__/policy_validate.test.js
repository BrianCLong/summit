"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("assert/strict"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const child_process_1 = require("child_process");
const __dirname = path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url));
const scriptPath = path_1.default.resolve(__dirname, "../policy_validate.ts");
const tempDir = path_1.default.resolve(__dirname, "../../temp_policy_test");
(0, node_test_1.describe)("policy_validate.ts script", () => {
    // Setup and cleanup
    if (!fs_1.default.existsSync(tempDir))
        fs_1.default.mkdirSync(tempDir);
    (0, node_test_1.it)("should generate artifacts for valid policy", () => {
        const policyFile = path_1.default.join(tempDir, "valid_policy.yaml");
        fs_1.default.writeFileSync(policyFile, "name: test\n");
        const env = {
            ...process.env,
            POLICY_FILE: policyFile,
            ARTIFACT_DIR: path_1.default.join(tempDir, "artifacts"),
            EVIDENCE_ID: "TEST-EVID-1"
        };
        // Execute the script using tsx
        try {
            (0, child_process_1.execSync)(`npx tsx ${scriptPath}`, { env, stdio: 'inherit' });
        }
        catch (e) {
            strict_1.default.fail("Script failed execution");
        }
        const reportPath = path_1.default.join(tempDir, "artifacts", "report.json");
        strict_1.default.ok(fs_1.default.existsSync(reportPath), "report.json should exist");
        const report = JSON.parse(fs_1.default.readFileSync(reportPath, 'utf-8'));
        strict_1.default.equal(report.ok, true);
        strict_1.default.equal(report.evidenceId, "TEST-EVID-1");
    });
    (0, node_test_1.it)("should fail for invalid policy", () => {
        const policyFile = path_1.default.join(tempDir, "invalid_policy.yaml");
        fs_1.default.writeFileSync(policyFile, "INVALID_POLICY");
        const env = {
            ...process.env,
            POLICY_FILE: policyFile,
            ARTIFACT_DIR: path_1.default.join(tempDir, "artifacts_fail"),
            EVIDENCE_ID: "TEST-EVID-2"
        };
        try {
            (0, child_process_1.execSync)(`npx tsx ${scriptPath}`, { env, stdio: 'pipe' }); // pipe to suppress error output
            strict_1.default.fail("Script should have failed");
        }
        catch (e) {
            // Expected failure
        }
        // Artifacts should still be written (the script writes them before exit(1))
        const reportPath = path_1.default.join(tempDir, "artifacts_fail", "report.json");
        strict_1.default.ok(fs_1.default.existsSync(reportPath), "report.json should exist even on failure");
        const report = JSON.parse(fs_1.default.readFileSync(reportPath, 'utf-8'));
        strict_1.default.equal(report.ok, false);
    });
    // Cleanup
    // fs.rmSync(tempDir, { recursive: true, force: true });
});
