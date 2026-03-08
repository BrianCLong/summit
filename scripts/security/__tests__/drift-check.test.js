"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const node_crypto_1 = __importDefault(require("node:crypto"));
const TEST_ROOT = 'tmp-test/drift-check-test';
const EVIDENCE_ROOT = node_path_1.default.join(TEST_ROOT, 'evidence/security');
const MOCK_ARTIFACT_PATH = node_path_1.default.join(TEST_ROOT, 'MOCK_ARTIFACT.md');
// Helper to run drift check with modified CWD or by mocking fs (harder with execSync)
// Instead, we will generate a real evidence pack (offline) pointing to a temp dir,
// then modify a file, then run drift check pointing to that same temp dir.
// But drift check looks at 'evidence/security' in CWD.
// So we need to run these tests in a sandbox CWD or monkey-patch the path in the script.
// For simplicity, I made the script check 'evidence/security'. I can create a symlink or
// temporary structure.
// Actually, I can just use the drift script's logic by importing it?
// No, it's a script.
// I will create the directory structure `evidence/security` inside `tmp-test/drift-check-test`
// and run the script from `tmp-test/drift-check-test`.
(0, node_test_1.test)('Drift Check', (t) => {
    // Setup
    if (node_fs_1.default.existsSync(TEST_ROOT))
        node_fs_1.default.rmSync(TEST_ROOT, { recursive: true, force: true });
    node_fs_1.default.mkdirSync(TEST_ROOT, { recursive: true });
    // Create a mock artifact
    node_fs_1.default.writeFileSync(MOCK_ARTIFACT_PATH, 'original content');
    // Create an evidence pack manually to simulate "previous state"
    const timestamp = '20250101-000000';
    const packDir = node_path_1.default.join(EVIDENCE_ROOT, timestamp);
    node_fs_1.default.mkdirSync(node_path_1.default.join(packDir, 'artifacts'), { recursive: true });
    // Create the artifact in the pack (not strictly needed for drift check if we only check path exists,
    // but the script checks if file exists at `artifact.path` relative to root)
    // The `artifact.path` in index.json should be relative to repo root.
    // When running from TEST_ROOT, "MOCK_ARTIFACT.md" is the relative path.
    // Calculate SHA of original
    const hash = node_crypto_1.default.createHash('sha256').update('original content').digest('hex');
    const index = {
        meta: {},
        artifacts: [
            { path: 'MOCK_ARTIFACT.md', sha256: hash }
        ]
    };
    node_fs_1.default.writeFileSync(node_path_1.default.join(packDir, 'index.json'), JSON.stringify(index));
    // Script path
    const scriptPath = node_path_1.default.resolve('scripts/security/drift-check.ts');
    // 1. Run Drift Check - Should Pass
    try {
        (0, node_child_process_1.execSync)(`npx tsx ${scriptPath}`, { cwd: TEST_ROOT, stdio: 'pipe' });
        node_assert_1.default.ok(true, 'Drift check passed with matching content');
    }
    catch (e) {
        node_assert_1.default.fail('Drift check failed unexpectedly');
    }
    // 2. Modify Artifact
    node_fs_1.default.writeFileSync(MOCK_ARTIFACT_PATH, 'modified content');
    // 3. Run Drift Check - Should Fail
    try {
        (0, node_child_process_1.execSync)(`npx tsx ${scriptPath}`, { cwd: TEST_ROOT, stdio: 'pipe' });
        node_assert_1.default.fail('Drift check should have failed');
    }
    catch (e) {
        node_assert_1.default.strictEqual(e.status, 1, 'Exit code should be 1');
        // We can't easily check stdout with execSync throwing, strictly speaking.
        // But the exit code confirms failure.
    }
    // Cleanup
    node_fs_1.default.rmSync(TEST_ROOT, { recursive: true, force: true });
});
