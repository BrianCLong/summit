"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("fs/promises"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const vitest_1 = require("vitest");
const index_js_1 = require("../index.js");
const __dirname = path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url));
const repoRoot = path_1.default.resolve(__dirname, '../../../../');
const fixtureDir = path_1.default.join(repoRoot, 'docs/agents/registry');
async function createTempDir() {
    return promises_1.default.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'agent-registry-'));
}
(0, vitest_1.describe)('agent registry loader', () => {
    (0, vitest_1.it)('loads agents in deterministic order', async () => {
        const { agents, errors } = await (0, index_js_1.loadAgentRegistry)(fixtureDir);
        (0, vitest_1.expect)(errors).toEqual([]);
        (0, vitest_1.expect)(agents.map((agent) => agent.id)).toEqual([
            'decision-critic',
            'maestro-orchestrator',
            'sop-compiler',
        ]);
        (0, vitest_1.expect)(agents.find((agent) => agent.id === 'maestro-orchestrator')?.data_access).toBe('internal');
    });
    (0, vitest_1.it)('reports invalid YAML', async () => {
        const dir = await createTempDir();
        await promises_1.default.writeFile(path_1.default.join(dir, 'bad.yaml'), 'id: [unclosed');
        const { errors } = await (0, index_js_1.loadAgentRegistry)(dir);
        (0, vitest_1.expect)(errors.length).toBe(1);
        (0, vitest_1.expect)(errors[0]?.message).toContain('YAML parse failed');
    });
    (0, vitest_1.it)('reports schema violations with field path', async () => {
        const dir = await createTempDir();
        await promises_1.default.writeFile(path_1.default.join(dir, 'invalid.yaml'), [
            'id: invalid agent',
            'version: 0.1.0',
            'description: Missing required fields',
            'role: specialist',
            'inputs: []',
            'outputs: []',
        ].join('\n'));
        const { errors } = await (0, index_js_1.loadAgentRegistry)(dir);
        (0, vitest_1.expect)(errors.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(errors.some((error) => error.path === 'id')).toBe(true);
    });
    (0, vitest_1.it)('detects duplicate agent ids', async () => {
        const dir = await createTempDir();
        const payload = [
            'id: duplicate-agent',
            'name: Duplicate Agent',
            'version: 0.1.0',
            'description: Duplicate',
            'role: executor',
            'inputs: []',
            'outputs: []',
        ].join('\n');
        await promises_1.default.writeFile(path_1.default.join(dir, 'one.yaml'), payload);
        await promises_1.default.writeFile(path_1.default.join(dir, 'two.yaml'), payload);
        const { errors } = await (0, index_js_1.loadAgentRegistry)(dir);
        (0, vitest_1.expect)(errors.some((error) => error.message.includes('Duplicate agent id'))).toBe(true);
    });
    (0, vitest_1.it)('serializes JSON with stable key ordering', () => {
        const output = (0, index_js_1.stableStringify)({ b: 1, a: { d: 2, c: 3 } });
        (0, vitest_1.expect)(output).toBe('{\n  \"a\": {\n    \"c\": 3,\n    \"d\": 2\n  },\n  \"b\": 1\n}');
    });
});
