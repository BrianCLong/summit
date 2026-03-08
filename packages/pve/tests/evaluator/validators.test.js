"use strict";
/**
 * Validators Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const PRDiffValidator_js_1 = require("../../src/evaluator/validators/PRDiffValidator.js");
const SchemaDriftValidator_js_1 = require("../../src/evaluator/validators/SchemaDriftValidator.js");
const TSConfigValidator_js_1 = require("../../src/evaluator/validators/TSConfigValidator.js");
const AgentOutputValidator_js_1 = require("../../src/evaluator/validators/AgentOutputValidator.js");
const SecurityScanValidator_js_1 = require("../../src/evaluator/validators/SecurityScanValidator.js");
(0, vitest_1.describe)('PRDiffValidator', () => {
    const validator = new PRDiffValidator_js_1.PRDiffValidator();
    (0, vitest_1.it)('should pass for valid PR', async () => {
        const context = {
            type: 'pr_diff',
            input: {
                type: 'pr_diff',
                base: 'main',
                head: 'feature',
                files: [
                    {
                        path: 'src/index.ts',
                        status: 'modified',
                        additions: 10,
                        deletions: 5,
                    },
                ],
                pr: {
                    title: 'Add new feature',
                    body: 'This PR adds a new feature that does something useful.',
                    author: 'developer',
                    isDraft: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
            },
        };
        const results = await validator.validate(context);
        const errors = results.filter((r) => !r.allowed && r.severity === 'error');
        (0, vitest_1.expect)(errors).toHaveLength(0);
    });
    (0, vitest_1.it)('should detect forbidden files', async () => {
        const context = {
            type: 'pr_diff',
            input: {
                type: 'pr_diff',
                base: 'main',
                head: 'feature',
                files: [
                    {
                        path: '.env',
                        status: 'added',
                        additions: 5,
                        deletions: 0,
                    },
                ],
            },
        };
        const results = await validator.validate(context);
        const forbidden = results.filter((r) => r.policy === 'pve.pr.forbidden_file' && !r.allowed);
        (0, vitest_1.expect)(forbidden.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('should detect secrets in patches', async () => {
        const context = {
            type: 'pr_diff',
            input: {
                type: 'pr_diff',
                base: 'main',
                head: 'feature',
                files: [
                    {
                        path: 'src/config.ts',
                        status: 'modified',
                        additions: 1,
                        deletions: 0,
                        patch: '+const apiKey = "AKIAIOSFODNN7EXAMPLE";',
                    },
                ],
            },
        };
        const results = await validator.validate(context);
        const sensitive = results.filter((r) => r.policy === 'pve.pr.sensitive_content' && !r.allowed);
        (0, vitest_1.expect)(sensitive.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('should warn about large PRs', async () => {
        const context = {
            type: 'pr_diff',
            input: {
                type: 'pr_diff',
                base: 'main',
                head: 'feature',
                files: Array(60).fill({
                    path: 'src/file.ts',
                    status: 'modified',
                    additions: 10,
                    deletions: 5,
                }),
            },
        };
        const results = await validator.validate(context);
        const fileCount = results.find((r) => r.policy === 'pve.pr.max_files');
        (0, vitest_1.expect)(fileCount?.allowed).toBe(false);
    });
});
(0, vitest_1.describe)('SchemaDriftValidator', () => {
    const validator = new SchemaDriftValidator_js_1.SchemaDriftValidator();
    (0, vitest_1.it)('should pass for compatible changes', async () => {
        const context = {
            type: 'schema_drift',
            input: {
                type: 'schema_drift',
                schemaType: 'json_schema',
                previous: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                    },
                    required: ['id'],
                },
                current: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                    },
                    required: ['id'],
                },
            },
        };
        const results = await validator.validate(context);
        const breaking = results.filter((r) => r.policy === 'pve.schema.breaking_change' && !r.allowed);
        (0, vitest_1.expect)(breaking).toHaveLength(0);
    });
    (0, vitest_1.it)('should detect breaking changes', async () => {
        const context = {
            type: 'schema_drift',
            input: {
                type: 'schema_drift',
                schemaType: 'json_schema',
                previous: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                    },
                    required: ['id', 'name'],
                },
                current: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                    },
                    required: ['id'],
                },
            },
        };
        const results = await validator.validate(context);
        // Should detect field removal
        (0, vitest_1.expect)(results.some((r) => r.policy.includes('schema') && !r.allowed)).toBe(true);
    });
});
(0, vitest_1.describe)('TSConfigValidator', () => {
    const validator = new TSConfigValidator_js_1.TSConfigValidator();
    (0, vitest_1.it)('should pass for valid config', async () => {
        const context = {
            type: 'tsconfig_integrity',
            input: {
                type: 'tsconfig_integrity',
                config: {
                    compilerOptions: {
                        target: 'ES2022',
                        module: 'ESNext',
                        moduleResolution: 'bundler',
                        esModuleInterop: true,
                        skipLibCheck: true,
                        resolveJsonModule: true,
                        strict: true,
                    },
                },
                filePath: 'tsconfig.json',
            },
        };
        const results = await validator.validate(context);
        const errors = results.filter((r) => !r.allowed && r.severity === 'error');
        (0, vitest_1.expect)(errors).toHaveLength(0);
    });
    (0, vitest_1.it)('should warn about missing options', async () => {
        const context = {
            type: 'tsconfig_integrity',
            input: {
                type: 'tsconfig_integrity',
                config: {
                    compilerOptions: {
                        target: 'ES5',
                    },
                },
                filePath: 'tsconfig.json',
            },
        };
        const results = await validator.validate(context);
        const warnings = results.filter((r) => !r.allowed);
        (0, vitest_1.expect)(warnings.length).toBeGreaterThan(0);
    });
});
(0, vitest_1.describe)('AgentOutputValidator', () => {
    const validator = new AgentOutputValidator_js_1.AgentOutputValidator();
    (0, vitest_1.it)('should pass for valid output', async () => {
        const context = {
            type: 'agent_output',
            input: {
                type: 'agent_output',
                agentId: 'claude-1',
                agentType: 'claude',
                output: {
                    outputType: 'code',
                    files: [
                        {
                            path: 'src/feature.ts',
                            content: 'export function feature() { return true; }',
                            action: 'create',
                        },
                    ],
                },
            },
        };
        const results = await validator.validate(context);
        const errors = results.filter((r) => !r.allowed && r.severity === 'error');
        (0, vitest_1.expect)(errors).toHaveLength(0);
    });
    (0, vitest_1.it)('should detect forbidden paths', async () => {
        const context = {
            type: 'agent_output',
            input: {
                type: 'agent_output',
                agentId: 'claude-1',
                agentType: 'claude',
                output: {
                    outputType: 'code',
                    files: [
                        {
                            path: '.env',
                            content: 'API_KEY=secret',
                            action: 'create',
                        },
                    ],
                },
            },
        };
        const results = await validator.validate(context);
        const forbidden = results.filter((r) => r.policy === 'pve.agent.forbidden_path' && !r.allowed);
        (0, vitest_1.expect)(forbidden.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('should detect hardcoded secrets', async () => {
        const context = {
            type: 'agent_output',
            input: {
                type: 'agent_output',
                agentId: 'claude-1',
                agentType: 'claude',
                output: {
                    outputType: 'code',
                    files: [
                        {
                            path: 'src/config.ts',
                            content: 'const password = "supersecret123";',
                            action: 'create',
                        },
                    ],
                },
            },
        };
        const results = await validator.validate(context);
        const secrets = results.filter((r) => r.policy === 'pve.agent.hardcoded_secret' && !r.allowed);
        (0, vitest_1.expect)(secrets.length).toBeGreaterThan(0);
    });
});
(0, vitest_1.describe)('SecurityScanValidator', () => {
    const validator = new SecurityScanValidator_js_1.SecurityScanValidator();
    (0, vitest_1.it)('should detect AWS keys', async () => {
        const context = {
            type: 'security_scan',
            input: {
                type: 'security_scan',
                scanType: 'secrets',
                content: 'const key = "AKIAIOSFODNN7EXAMPLE";',
                filePaths: ['src/config.ts'],
            },
        };
        const results = await validator.validate(context);
        const secrets = results.filter((r) => r.policy.includes('secret') && !r.allowed);
        (0, vitest_1.expect)(secrets.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('should detect GitHub tokens', async () => {
        const context = {
            type: 'security_scan',
            input: {
                type: 'security_scan',
                scanType: 'secrets',
                content: 'const token = "ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890";',
                filePaths: ['src/github.ts'],
            },
        };
        const results = await validator.validate(context);
        const secrets = results.filter((r) => r.policy.includes('secret') && !r.allowed);
        (0, vitest_1.expect)(secrets.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('should detect SQL injection patterns', async () => {
        const context = {
            type: 'security_scan',
            input: {
                type: 'security_scan',
                scanType: 'sast',
                content: 'db.query(`SELECT * FROM users WHERE id = ${req.params.id}`);',
                filePaths: ['src/db.ts'],
            },
        };
        const results = await validator.validate(context);
        const sast = results.filter((r) => r.policy.includes('sast') && !r.allowed);
        (0, vitest_1.expect)(sast.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('should pass for clean code', async () => {
        const context = {
            type: 'security_scan',
            input: {
                type: 'security_scan',
                scanType: 'secrets',
                content: 'const config = { apiUrl: process.env.API_URL };',
                filePaths: ['src/config.ts'],
            },
        };
        const results = await validator.validate(context);
        const issues = results.filter((r) => !r.allowed && r.severity === 'error');
        (0, vitest_1.expect)(issues).toHaveLength(0);
    });
});
