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
const TEST_OUTPUT_DIR = 'tmp-test/evidence-pack-test';
(0, node_test_1.test)('Evidence Pack - Offline Mode', (t) => {
    // Cleanup
    if (node_fs_1.default.existsSync(TEST_OUTPUT_DIR)) {
        node_fs_1.default.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
    // Run the script in offline mode
    const scriptPath = node_path_1.default.resolve('scripts/security/evidence-pack.ts');
    const fixturesDir = node_path_1.default.resolve('scripts/security/fixtures');
    // Need to use tsx to run the TS script
    // Using relative path for fixturesDir to match how it might be called
    try {
        (0, node_child_process_1.execSync)(`npx tsx ${scriptPath} --mode=offline --fixturesDir=${fixturesDir} --outputDir=${TEST_OUTPUT_DIR}`, {
            stdio: 'inherit'
        });
    }
    catch (e) {
        node_assert_1.default.fail('Script execution failed');
    }
    // Find the generated pack (timestamped folder)
    const timestampDirs = node_fs_1.default.readdirSync(TEST_OUTPUT_DIR);
    node_assert_1.default.strictEqual(timestampDirs.length, 1, 'Should create exactly one timestamped directory');
    const packDir = node_path_1.default.join(TEST_OUTPUT_DIR, timestampDirs[0]);
    // Assert artifacts
    const artifactsDir = node_path_1.default.join(packDir, 'artifacts');
    node_assert_1.default.ok(node_fs_1.default.existsSync(node_path_1.default.join(artifactsDir, 'SECURITY.md')), 'Should copy SECURITY.md');
    node_assert_1.default.ok(node_fs_1.default.existsSync(node_path_1.default.join(artifactsDir, 'docs/compliance/EVIDENCE_INDEX.md')), 'Should copy deep artifact');
    // Assert outputs
    const outputsDir = node_path_1.default.join(packDir, 'outputs');
    node_assert_1.default.ok(node_fs_1.default.existsSync(node_path_1.default.join(outputsDir, 'baseline-report.json')), 'Should copy baseline-report.json');
    // Assert Index
    const indexJsonPath = node_path_1.default.join(packDir, 'index.json');
    node_assert_1.default.ok(node_fs_1.default.existsSync(indexJsonPath));
    const index = JSON.parse(node_fs_1.default.readFileSync(indexJsonPath, 'utf-8'));
    node_assert_1.default.strictEqual(index.meta.mode, 'offline');
    node_assert_1.default.ok(index.artifacts.some((a) => a.path.includes('SECURITY.md')));
    // Assert INDEX.md
    const indexMdPath = node_path_1.default.join(packDir, 'INDEX.md');
    node_assert_1.default.ok(node_fs_1.default.existsSync(indexMdPath));
    const mdContent = node_fs_1.default.readFileSync(indexMdPath, 'utf-8');
    node_assert_1.default.match(mdContent, /# Security Evidence Pack/);
    node_assert_1.default.match(mdContent, /SECURITY\.md/);
    // Cleanup
    node_fs_1.default.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
});
