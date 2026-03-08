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
const secretScan_ts_1 = require("../src/secretScan.ts");
(0, node_test_1.test)('detects high-risk secrets', async () => {
    const tmpDir = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), 'secret-scan-'));
    const secretFile = node_path_1.default.join(tmpDir, 'secret.txt');
    node_fs_1.default.writeFileSync(secretFile, 'AWS key: AKIA1234567890ABCD12');
    const config = {
        paths: [tmpDir],
        excludedGlobs: []
    };
    const result = await (0, secretScan_ts_1.scanForSecrets)('/', config);
    node_assert_1.default.strictEqual(result.ok, false);
    node_assert_1.default.ok(result.details[0].includes('AKIA'));
});
(0, node_test_1.test)('returns clean when no secrets found', async () => {
    const tmpDir = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), 'secret-scan-'));
    node_fs_1.default.writeFileSync(node_path_1.default.join(tmpDir, 'clean.txt'), 'just metadata');
    const config = {
        paths: [tmpDir],
        excludedGlobs: []
    };
    const result = await (0, secretScan_ts_1.scanForSecrets)('/', config);
    node_assert_1.default.strictEqual(result.ok, true);
});
