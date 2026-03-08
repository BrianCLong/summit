"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("node:fs/promises"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const index_js_1 = require("../../libs/context-shell/node/index.js");
describe('context shell', () => {
    async function makeTempDir() {
        return promises_1.default.mkdtemp(node_path_1.default.join(node_os_1.default.tmpdir(), 'context-shell-'));
    }
    it('blocks non-allowlisted commands', async () => {
        const root = await makeTempDir();
        const shell = (0, index_js_1.createContextShell)({
            root,
            evidence: { enabled: false },
            now: () => 1,
        });
        const result = await shell.bash('rm -rf .');
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toMatch(/Policy denied/);
    });
    it('denies access to .env paths', async () => {
        const root = await makeTempDir();
        await promises_1.default.writeFile(node_path_1.default.join(root, '.env'), 'SECRET=1', 'utf8');
        const shell = (0, index_js_1.createContextShell)({
            root,
            evidence: { enabled: false },
            now: () => 1,
        });
        const result = await shell.readFile('.env');
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toMatch(/path-denied:env-file/);
    });
    it('returns deterministic ls output', async () => {
        const root = await makeTempDir();
        await promises_1.default.writeFile(node_path_1.default.join(root, 'b.txt'), 'b', 'utf8');
        await promises_1.default.writeFile(node_path_1.default.join(root, 'a.txt'), 'a', 'utf8');
        const shell = (0, index_js_1.createContextShell)({
            root,
            evidence: { enabled: false },
            now: () => 5,
        });
        const result = await shell.bash('ls');
        expect(result.stdout).toBe('a.txt\nb.txt');
        expect(result.exitCode).toBe(0);
    });
    it('allows intercept hooks to rewrite paths and outputs', async () => {
        const root = await makeTempDir();
        await promises_1.default.writeFile(node_path_1.default.join(root, 'actual.txt'), 'hooked', 'utf8');
        const shell = (0, index_js_1.createContextShell)({
            root,
            evidence: { enabled: false },
            now: () => 10,
            hooks: {
                onBeforeCall: (call) => call.tool === 'ctx.readFile'
                    ? { ...call, path: 'actual.txt' }
                    : call,
                onAfterCall: (_call, result) => ({
                    ...result,
                    stdout: result.stdout.toUpperCase(),
                }),
            },
        });
        const result = await shell.readFile('ignored.txt');
        expect(result.stdout).toBe('HOOKED');
        expect(result.exitCode).toBe(0);
    });
});
