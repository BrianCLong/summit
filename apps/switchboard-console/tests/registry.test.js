"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const loader_js_1 = require("../src/registry/loader.js");
const validator_js_1 = require("../src/registry/validator.js");
(0, vitest_1.describe)('Registry Validation', () => {
    const testDir = node_path_1.default.join(process.cwd(), 'tests', 'fixtures', 'registry-test');
    (0, vitest_1.beforeEach)(async () => {
        await (0, promises_1.mkdir)(testDir, { recursive: true });
    });
    (0, vitest_1.afterEach)(async () => {
        await (0, promises_1.rm)(testDir, { recursive: true, force: true });
    });
    (0, vitest_1.it)('passes a valid JSON registry file', async () => {
        const filePath = node_path_1.default.join(testDir, 'valid.json');
        const content = {
            version: '1.0.0',
            tools: [{ tool_id: 't1', capability: ['c1'] }],
            servers: [{ server_id: 's1', endpoint: 'http://h:1', transport: 'http', capability: ['c1'] }]
        };
        await (0, promises_1.writeFile)(filePath, JSON.stringify(content));
        const sources = await (0, loader_js_1.loadRegistrySources)(filePath);
        const result = (0, validator_js_1.validateRegistrySources)(sources);
        (0, vitest_1.expect)(result.valid).toBe(true);
        (0, vitest_1.expect)(result.stats.tools).toBe(1);
        (0, vitest_1.expect)(result.stats.servers).toBe(1);
    });
    (0, vitest_1.it)('passes a valid YAML registry file', async () => {
        const filePath = node_path_1.default.join(testDir, 'valid.yaml');
        const content = `
version: 1.0.0
tools:
  - tool_id: t1
    capability: [c1]
servers:
  - server_id: s1
    endpoint: http://h:1
    transport: http
    capability: [c1]
`;
        await (0, promises_1.writeFile)(filePath, content);
        const sources = await (0, loader_js_1.loadRegistrySources)(filePath);
        const result = (0, validator_js_1.validateRegistrySources)(sources);
        (0, vitest_1.expect)(result.valid).toBe(true);
    });
    (0, vitest_1.it)('fails on invalid schema (missing required field)', async () => {
        const filePath = node_path_1.default.join(testDir, 'invalid.json');
        const content = {
            version: '1.0.0',
            tools: [{ capability: ['c1'] }] // missing tool_id
        };
        await (0, promises_1.writeFile)(filePath, JSON.stringify(content));
        const sources = await (0, loader_js_1.loadRegistrySources)(filePath);
        const result = (0, validator_js_1.validateRegistrySources)(sources);
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.errors.some(e => e.message.includes('tool_id'))).toBe(true);
    });
    (0, vitest_1.it)('fails on duplicate tool_id across files', async () => {
        await (0, promises_1.writeFile)(node_path_1.default.join(testDir, 'f1.json'), JSON.stringify({
            version: '1.0.0',
            tools: [{ tool_id: 'dup', capability: ['c1'] }]
        }));
        await (0, promises_1.writeFile)(node_path_1.default.join(testDir, 'f2.json'), JSON.stringify({
            version: '1.0.0',
            tools: [{ tool_id: 'dup', capability: ['c2'] }]
        }));
        const sources = await (0, loader_js_1.loadRegistrySources)(testDir);
        const result = (0, validator_js_1.validateRegistrySources)(sources);
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.errors.some(e => e.message.includes('Duplicate tool ID'))).toBe(true);
    });
    (0, vitest_1.it)('fails on duplicate tool_id in same file', async () => {
        const filePath = node_path_1.default.join(testDir, 'dup_internal.json');
        const content = {
            version: '1.0.0',
            tools: [
                { tool_id: 'dup', capability: ['c1'] },
                { tool_id: 'dup', capability: ['c2'] }
            ]
        };
        await (0, promises_1.writeFile)(filePath, JSON.stringify(content));
        const sources = await (0, loader_js_1.loadRegistrySources)(filePath);
        const result = (0, validator_js_1.validateRegistrySources)(sources);
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.errors.some(e => e.message.includes('Duplicate tool_id: dup'))).toBe(true);
    });
    (0, vitest_1.it)('fails on missing referenced server_id', async () => {
        const filePath = node_path_1.default.join(testDir, 'missing_ref.json');
        const content = {
            version: '1.0.0',
            tools: [{ tool_id: 't1', capability: ['c1'], server_id: 'non-existent' }],
            servers: []
        };
        await (0, promises_1.writeFile)(filePath, JSON.stringify(content));
        const sources = await (0, loader_js_1.loadRegistrySources)(filePath);
        const result = (0, validator_js_1.validateRegistrySources)(sources);
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.errors.some(e => e.message.includes('Referenced server_id not found'))).toBe(true);
    });
});
