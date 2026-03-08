"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
const vitest_1 = require("vitest");
const runner_1 = require("../../src/workflows/runner");
(0, vitest_1.describe)('connector policy deny-by-default', () => {
    (0, vitest_1.test)('blocks live mode when network deny', () => {
        const outRoot = (0, node_fs_1.mkdtempSync)((0, node_path_1.join)((0, node_os_1.tmpdir)(), 'mws-policy-'));
        const bundle = (0, runner_1.runWorkflowSpec)({
            inputs: { case_id: 'mws_case1' },
            evidence: { evid_prefix: 'EVID', out_dir: outRoot },
            policy: { network: 'deny', connectors: { allowlist: [] } },
            steps: [{ id: 'live_reverse', type: 'reverse_image', mode: 'live', connector: 'reverse_image' }],
        }, '20260226');
        (0, vitest_1.expect)(bundle.steps[0].status).toBe('blocked');
        (0, vitest_1.expect)(bundle.steps[0].reason).toContain('policy.network=deny');
        (0, node_fs_1.rmSync)(outRoot, { recursive: true, force: true });
    });
});
