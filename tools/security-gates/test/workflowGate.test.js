"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const node_test_1 = require("node:test");
const workflowGate_ts_1 = require("../src/workflowGate.ts");
function writeWorkflow(tmpDir, fileName, contents) {
    const filePath = node_path_1.default.join(tmpDir, fileName);
    node_fs_1.default.writeFileSync(filePath, contents);
    return filePath;
}
(0, node_test_1.test)('fails when actions are not pinned and permissions are missing', async () => {
    const tmpDir = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), 'workflow-gate-'));
    writeWorkflow(tmpDir, 'deploy.yml', `name: Deploy
permissions: {}
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`);
    const config = {
        workflowGlobs: ['**/*.yml'],
        enforcePinnedActions: true,
        enforceMinimumPermissions: { contents: 'read', 'id-token': 'write' }
    };
    const result = await (0, workflowGate_ts_1.enforceWorkflowGate)(tmpDir, config);
    node_assert_1.default.strictEqual(result.ok, false);
    node_assert_1.default.ok(result.details.join(' ').includes('unpinned actions'));
    node_assert_1.default.ok(result.details.join(' ').includes('permissions'));
});
(0, node_test_1.test)('passes when actions are pinned and permissions are minimal', async () => {
    const tmpDir = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), 'workflow-gate-'));
    writeWorkflow(tmpDir, 'deploy.yml', `name: Deploy
permissions:
  contents: read
  id-token: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@b4ffde65f46336ab0f624c56b08a5bd31857c6d3
`);
    const config = {
        workflowGlobs: ['**/*.yml'],
        enforcePinnedActions: true,
        enforceMinimumPermissions: { contents: 'read', 'id-token': 'write' }
    };
    const result = await (0, workflowGate_ts_1.enforceWorkflowGate)(tmpDir, config);
    node_assert_1.default.strictEqual(result.ok, true);
});
