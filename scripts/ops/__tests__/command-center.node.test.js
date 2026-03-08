"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const node_child_process_1 = require("node:child_process");
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_url_1 = require("node:url");
const node_os_1 = __importDefault(require("node:os"));
const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
const __dirname = node_path_1.default.dirname(__filename);
const ROOT_DIR = node_path_1.default.resolve(__dirname, '../../..');
const SCRIPT_PATH = node_path_1.default.join(ROOT_DIR, 'scripts/ops/command-center.ts');
const FIXTURES_DIR = node_path_1.default.join(ROOT_DIR, 'scripts/ops/__fixtures__');
const OUTPUT_FILE = node_path_1.default.join(ROOT_DIR, 'docs/ops/COMMAND_CENTER.md');
// Create a temporary directory for tests
const TMP_DIR = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), 'command-center-test-'));
// Helper to copy fixtures to temp dir
function setupTempFixtures(sourceDir, targetDir) {
    if (!node_fs_1.default.existsSync(targetDir)) {
        node_fs_1.default.mkdirSync(targetDir, { recursive: true });
    }
    node_fs_1.default.cpSync(sourceDir, targetDir, { recursive: true });
}
(0, node_test_1.test)('Command Center Generator (Offline Mode)', async (t) => {
    // Setup: Copy fixtures to a temp location to avoid modifying source
    setupTempFixtures(FIXTURES_DIR, TMP_DIR);
    t.after(() => {
        // Cleanup
        node_fs_1.default.rmSync(TMP_DIR, { recursive: true, force: true });
    });
    await t.test('generates report from fixtures', () => {
        // Run the script pointing to temp fixtures
        (0, node_child_process_1.execSync)(`npx tsx ${SCRIPT_PATH} --mode=offline --snapshotsDir=${TMP_DIR}`, {
            encoding: 'utf-8',
            cwd: ROOT_DIR
        });
        // Check if file exists
        node_assert_1.default.ok(node_fs_1.default.existsSync(OUTPUT_FILE), 'Output file should be created');
        // Check content
        const content = node_fs_1.default.readFileSync(OUTPUT_FILE, 'utf-8');
        node_assert_1.default.match(content, /# Command Center Report/, 'Should have title');
        node_assert_1.default.match(content, /## 1. Executive Summary/, 'Should have summary');
        node_assert_1.default.match(content, /fixture: green pr/, 'Should contain fixture PR');
        node_assert_1.default.match(content, /No P0 issues found/, 'Should report no P0s');
    });
    await t.test('exits non-zero on P0 if configured', () => {
        // Create P0 issue in the temp directory
        const p0IssuesPath = node_path_1.default.join(TMP_DIR, 'issues.json');
        node_fs_1.default.writeFileSync(p0IssuesPath, JSON.stringify([
            { number: 666, title: 'Critical Bug', labels: [{ name: 'P0' }], updatedAt: '', state: 'OPEN' }
        ]));
        try {
            (0, node_child_process_1.execSync)(`npx tsx ${SCRIPT_PATH} --mode=offline --snapshotsDir=${TMP_DIR} --failOnP0`, {
                encoding: 'utf-8',
                cwd: ROOT_DIR,
                stdio: 'pipe' // Capture output
            });
            node_assert_1.default.fail('Should have failed due to P0');
        }
        catch (e) {
            node_assert_1.default.equal(e.status, 1, 'Exit code should be 1');
            node_assert_1.default.match(e.stderr.toString(), /P0 issues detected/, 'Should log P0 detection');
        }
    });
});
