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
const policyGate_ts_1 = require("../src/policyGate.ts");
(0, node_test_1.test)('flags wildcard IAM statements and public endpoints', async () => {
    const tmpDir = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), 'policy-gate-'));
    const inputPath = node_path_1.default.join(tmpDir, 'input.json');
    node_fs_1.default.writeFileSync(inputPath, JSON.stringify({
        iamRoles: [
            {
                name: 'bad-role',
                statements: [{ action: '*', resource: '*', effect: 'allow' }]
            }
        ],
        exposures: { publicEndpoints: ['https://public.example.com'] }
    }));
    const config = {
        inputPath,
        denyWildcardIam: true,
        allowPublicEndpoints: false
    };
    const result = await (0, policyGate_ts_1.enforcePolicyGate)('/', config);
    node_assert_1.default.strictEqual(result.ok, false);
    node_assert_1.default.ok(result.details.join(' ').includes('wildcard'));
    node_assert_1.default.ok(result.details.join(' ').includes('Public endpoints'));
});
(0, node_test_1.test)('passes with clean input', async () => {
    const tmpDir = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), 'policy-gate-'));
    const inputPath = node_path_1.default.join(tmpDir, 'input.json');
    node_fs_1.default.writeFileSync(inputPath, JSON.stringify({
        iamRoles: [
            {
                name: 'good-role',
                statements: [{ action: 's3:GetObject', resource: 'arn:aws:s3:::bucket/*', effect: 'allow' }]
            }
        ],
        exposures: { publicEndpoints: [] }
    }));
    const config = {
        inputPath,
        denyWildcardIam: true,
        allowPublicEndpoints: false
    };
    const result = await (0, policyGate_ts_1.enforcePolicyGate)('/', config);
    node_assert_1.default.strictEqual(result.ok, true);
});
