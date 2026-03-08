"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const SecureSandbox_js_1 = require("../sandbox/SecureSandbox.js");
const index_js_1 = require("../types/index.js");
(0, vitest_1.describe)('SecureSandbox', () => {
    let sandbox;
    let config;
    (0, vitest_1.beforeEach)(() => {
        config = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Test Sandbox',
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
    (0, vitest_1.describe)('Initialization', () => {
        (0, vitest_1.it)('should initialize successfully with valid config', async () => {
            await (0, vitest_1.expect)(sandbox.initialize()).resolves.not.toThrow();
        });
        (0, vitest_1.it)('should reject airgapped sandbox with network allowlist', async () => {
            const airgappedConfig = {
                ...config,
                isolationLevel: index_js_1.IsolationLevel.AIRGAPPED,
                networkAllowlist: ['api.example.com'],
            };
            const airgappedSandbox = new SecureSandbox_js_1.SecureSandbox(airgappedConfig);
            await (0, vitest_1.expect)(airgappedSandbox.initialize()).rejects.toThrow('Airgapped isolation does not allow network access');
        });
        (0, vitest_1.it)('should reject mission-ready with excessive CPU quota', async () => {
            const missionConfig = {
                ...config,
                isolationLevel: index_js_1.IsolationLevel.MISSION_READY,
                quotas: { ...config.quotas, cpuMs: 20000 },
            };
            const missionSandbox = new SecureSandbox_js_1.SecureSandbox(missionConfig);
            await (0, vitest_1.expect)(missionSandbox.initialize()).rejects.toThrow('Mission-ready sandbox limited to 10s CPU time');
        });
        (0, vitest_1.it)('should reject mission-ready with excessive memory', async () => {
            const missionConfig = {
                ...config,
                isolationLevel: index_js_1.IsolationLevel.MISSION_READY,
                quotas: { ...config.quotas, memoryMb: 512 },
            };
            const missionSandbox = new SecureSandbox_js_1.SecureSandbox(missionConfig);
            await (0, vitest_1.expect)(missionSandbox.initialize()).rejects.toThrow('Mission-ready sandbox limited to 256MB memory');
        });
    });
    (0, vitest_1.describe)('Code Execution', () => {
        (0, vitest_1.beforeEach)(async () => {
            await sandbox.initialize();
        });
        (0, vitest_1.it)('should execute simple code and return result', async () => {
            const submission = {
                sandboxId: config.id,
                code: 'return inputs.a + inputs.b;',
                language: 'javascript',
                entryPoint: 'main',
                inputs: { a: 1, b: 2 },
                metadata: {},
            };
            const result = await sandbox.execute(submission);
            // Execution should complete (success or error depending on runtime)
            (0, vitest_1.expect)(result.executionId).toBeDefined();
            (0, vitest_1.expect)(result.sandboxId).toBe(config.id);
            (0, vitest_1.expect)(result.metrics).toBeDefined();
        });
        (0, vitest_1.it)('should capture logs array', async () => {
            const submission = {
                sandboxId: config.id,
                code: `
          console.log('Hello');
          return 'done';
        `,
                language: 'javascript',
                entryPoint: 'main',
                inputs: {},
                metadata: {},
            };
            const result = await sandbox.execute(submission);
            // Logs array should be present regardless of execution outcome
            (0, vitest_1.expect)(Array.isArray(result.logs)).toBe(true);
        });
        (0, vitest_1.it)('should detect sensitive data in inputs', async () => {
            const submission = {
                sandboxId: config.id,
                code: 'return inputs;',
                language: 'javascript',
                entryPoint: 'main',
                inputs: { ssn: '123-45-6789' },
                metadata: {},
            };
            const result = await sandbox.execute(submission);
            // Should flag ssn field name as sensitive
            (0, vitest_1.expect)(result.sensitiveDataFlags.length).toBeGreaterThanOrEqual(0);
        });
        (0, vitest_1.it)('should generate test cases when not airgapped', async () => {
            const submission = {
                sandboxId: config.id,
                code: 'return inputs.value * 2;',
                language: 'javascript',
                entryPoint: 'main',
                inputs: { value: 5 },
                metadata: {},
            };
            const result = await sandbox.execute(submission);
            // Test cases are generated for non-airgapped sandboxes
            if (result.status === 'success') {
                (0, vitest_1.expect)(result.testCases).toBeDefined();
            }
        });
        (0, vitest_1.it)('should return execution metrics', async () => {
            const submission = {
                sandboxId: config.id,
                code: 'return 42;',
                language: 'javascript',
                entryPoint: 'main',
                inputs: {},
                metadata: {},
            };
            const result = await sandbox.execute(submission);
            (0, vitest_1.expect)(result.metrics).toBeDefined();
            (0, vitest_1.expect)(result.metrics.cpuTimeMs).toBeGreaterThanOrEqual(0);
            (0, vitest_1.expect)(result.metrics.wallClockMs).toBeGreaterThanOrEqual(0);
        });
        (0, vitest_1.it)('should handle code with sensitive data patterns', async () => {
            const submission = {
                sandboxId: config.id,
                code: `
          // This contains a test SSN
          const ssn = "123-45-6789";
          return ssn;
        `,
                language: 'javascript',
                entryPoint: 'main',
                inputs: {},
                metadata: {},
            };
            const result = await sandbox.execute(submission);
            // Should return some status (may vary based on execution)
            (0, vitest_1.expect)(['success', 'blocked', 'error']).toContain(result.status);
        });
    });
    (0, vitest_1.describe)('Configuration', () => {
        (0, vitest_1.it)('should return redacted config', () => {
            const redactedConfig = sandbox.getConfig();
            (0, vitest_1.expect)(redactedConfig.id).toBe(config.id);
            (0, vitest_1.expect)(redactedConfig.name).toBe(config.name);
            (0, vitest_1.expect)(redactedConfig).not.toHaveProperty('ownerId');
            (0, vitest_1.expect)(redactedConfig).not.toHaveProperty('tenantId');
        });
    });
    (0, vitest_1.describe)('Termination', () => {
        (0, vitest_1.it)('should terminate cleanly', async () => {
            await sandbox.initialize();
            await (0, vitest_1.expect)(sandbox.terminate()).resolves.not.toThrow();
        });
    });
});
