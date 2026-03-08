"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const fuzzRunner_1 = require("../../tooling/fuzz/fuzzRunner");
describe('fuzz harness', () => {
    const artifactRoot = node_path_1.default.join(process.cwd(), 'artifacts', 'fuzz');
    afterEach(() => {
        if (node_fs_1.default.existsSync(artifactRoot)) {
            for (const file of node_fs_1.default.readdirSync(artifactRoot)) {
                node_fs_1.default.unlinkSync(node_path_1.default.join(artifactRoot, file));
            }
        }
    });
    it('captures crashes and persists artifacts deterministically', async () => {
        const seeds = ['safe', 'boom'];
        const targets = [
            {
                name: 'dummy-parser',
                seeds,
                iterations: 5,
                timeoutMs: 10,
                handler: (input) => {
                    if (input.includes('boom')) {
                        throw new Error('intentional crash');
                    }
                },
            },
        ];
        const results = await (0, fuzzRunner_1.runFuzzTargets)(targets, 7);
        expect(results).toHaveLength(1);
        const [result] = results;
        expect(result.failures.length).toBeGreaterThanOrEqual(1);
        const failure = result.failures[0];
        expect(node_fs_1.default.existsSync(failure.artifactPath)).toBe(true);
        const persisted = node_fs_1.default.readFileSync(failure.artifactPath, 'utf8');
        expect(persisted.includes('boom')).toBe(true);
    });
    it('halts handlers that hang', async () => {
        const targets = [
            {
                name: 'hang-prone',
                seeds: ['idle'],
                iterations: 1,
                timeoutMs: 5,
                handler: async () => new Promise((resolve) => setTimeout(resolve, 20)),
            },
        ];
        const results = await (0, fuzzRunner_1.runFuzzTargets)(targets, 1);
        expect(results[0].failures).toHaveLength(1);
        expect(results[0].failures[0].error).toContain('Timeout');
    });
});
