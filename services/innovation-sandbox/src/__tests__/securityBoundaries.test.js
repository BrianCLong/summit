"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const SecureSandbox_js_1 = require("../sandbox/SecureSandbox.js");
const index_js_1 = require("../types/index.js");
(0, vitest_1.describe)('Sandbox security boundaries', () => {
    let sandbox;
    let config;
    (0, vitest_1.beforeEach)(() => {
        config = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Boundary Sandbox',
            isolationLevel: index_js_1.IsolationLevel.ENHANCED,
            quotas: {
                cpuMs: 5000,
                memoryMb: 128,
                wallClockMs: 10000,
                maxOutputBytes: 1048576,
                maxNetworkBytes: 0,
            },
            allowedModules: [],
            networkAllowlist: [],
            environmentVars: {},
            dataClassification: index_js_1.DataClassification.UNCLASSIFIED,
            autoDetectSensitive: true,
            createdAt: new Date(),
            ownerId: 'user-1',
            tenantId: 'tenant-1',
        };
        sandbox = new SecureSandbox_js_1.SecureSandbox(config);
    });
    (0, vitest_1.it)('blocks SSRF attempts against metadata endpoints', async () => {
        const submission = {
            sandboxId: config.id,
            code: `
        const url = "http://169.254.169.254/latest/meta-data";
        return url;
      `,
            language: 'javascript',
            entryPoint: 'main',
            inputs: {},
            metadata: {},
        };
        const result = await sandbox.execute(submission);
        (0, vitest_1.expect)(result.status).toBe('blocked');
        (0, vitest_1.expect)(result.sensitiveDataFlags.some(flag => flag.type === index_js_1.SensitiveDataType.SECURITY)).toBe(true);
    });
    (0, vitest_1.it)('blocks path traversal payloads', async () => {
        const submission = {
            sandboxId: config.id,
            code: 'return inputs.path;',
            language: 'javascript',
            entryPoint: 'main',
            inputs: { path: '../../etc/passwd' },
            metadata: {},
        };
        const result = await sandbox.execute(submission);
        (0, vitest_1.expect)(result.status).toBe('blocked');
        (0, vitest_1.expect)(result.sensitiveDataFlags.some(flag => flag.type === index_js_1.SensitiveDataType.SECURITY)).toBe(true);
    });
    (0, vitest_1.it)('blocks injection payloads', async () => {
        const submission = {
            sandboxId: config.id,
            code: 'return inputs.query;',
            language: 'javascript',
            entryPoint: 'main',
            inputs: { query: "' OR 1=1; DROP TABLE users; --" },
            metadata: {},
        };
        const result = await sandbox.execute(submission);
        (0, vitest_1.expect)(result.status).toBe('blocked');
        (0, vitest_1.expect)(result.sensitiveDataFlags.some(flag => flag.type === index_js_1.SensitiveDataType.SECURITY)).toBe(true);
    });
});
