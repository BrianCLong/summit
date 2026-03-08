"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const node_module_1 = require("node:module");
const require = (0, node_module_1.createRequire)(import.meta.url);
(0, globals_1.describe)('runCommandCheck', () => {
    (0, globals_1.test)('reports success for passing commands', () => {
        const { runCommandCheck, } = require('../../../scripts/ci/test-policy-runner.cjs');
        const result = runCommandCheck({
            name: 'echo-command',
            command: 'node -e "console.log(\'ok\')"',
            description: 'Test command',
            remediation: 'N/A',
        });
        (0, globals_1.expect)(result.passed).toBe(true);
        (0, globals_1.expect)(result.details[0]).toContain('succeeded');
    });
    (0, globals_1.test)('captures stderr for failing commands', () => {
        const { runCommandCheck, } = require('../../../scripts/ci/test-policy-runner.cjs');
        const result = runCommandCheck({
            name: 'failing-command',
            command: 'node -e "process.stderr.write(\'boom\'); process.exit(1)"',
            description: 'Test command',
            remediation: 'Investigate failure',
        });
        (0, globals_1.expect)(result.passed).toBe(false);
        (0, globals_1.expect)(result.details[0]).toContain('boom');
    });
});
