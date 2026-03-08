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
const config_ts_1 = require("../src/config.ts");
(0, node_test_1.test)('loads a valid config', () => {
    const tmpDir = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), 'gate-config-'));
    const configPath = node_path_1.default.join(tmpDir, 'config.json');
    node_fs_1.default.writeFileSync(configPath, JSON.stringify({
        workflowGate: {
            workflowGlobs: ['.github/workflows/test.yml'],
            enforcePinnedActions: true,
            enforceMinimumPermissions: { contents: 'read' }
        },
        imageGate: {
            stageImages: [
                {
                    name: 'ghcr.io/example/app@sha256:9d13b3c4a2b1d4f996bb77dd2f1373b8e6e0dffcb31d4660b9e6f29a3f2a1e5e',
                    digest: 'sha256:9d13b3c4a2b1d4f996bb77dd2f1373b8e6e0dffcb31d4660b9e6f29a3f2a1e5e',
                    signaturePath: 'sig',
                    provenancePath: 'prov'
                }
            ]
        },
        secretScan: { paths: ['security'] },
        policyGate: {
            inputPath: 'policies/input.json',
            denyWildcardIam: true,
            allowPublicEndpoints: false
        }
    }, null, 2));
    const config = (0, config_ts_1.loadConfig)(configPath);
    node_assert_1.default.ok(config.workflowGate.workflowGlobs.includes('.github/workflows/test.yml'));
    node_assert_1.default.strictEqual(config.imageGate.stageImages.length, 1);
});
(0, node_test_1.test)('throws for missing required sections', () => {
    const tmpDir = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), 'gate-config-'));
    const configPath = node_path_1.default.join(tmpDir, 'config.json');
    node_fs_1.default.writeFileSync(configPath, JSON.stringify({ workflowGate: { workflowGlobs: [] } }));
    node_assert_1.default.throws(() => (0, config_ts_1.loadConfig)(configPath));
});
