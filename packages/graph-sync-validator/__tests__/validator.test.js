"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
(0, vitest_1.describe)('GSV CLI', () => {
    (0, vitest_1.it)('should show help', () => {
        const output = (0, node_child_process_1.execSync)('npx tsx src/index.ts --help', { cwd: node_path_1.default.resolve(__dirname, '..') }).toString();
        (0, vitest_1.expect)(output).toContain('gsv');
        (0, vitest_1.expect)(output).toContain('attest-verify');
    });
    (0, vitest_1.it)('should generate a policy', () => {
        const provPath = node_path_1.default.resolve(__dirname, '../test-fixtures/provenance.json');
        const outPath = node_path_1.default.resolve(__dirname, '../test-fixtures/generated-policy.json');
        mkdirSync(node_path_1.default.dirname(provPath), { recursive: true });
        node_fs_1.default.writeFileSync(provPath, JSON.stringify({
            subject: [{ name: "artifact", digest: { sha256: "123" } }],
            predicate: { builder: { id: "test-builder" } }
        }));
        (0, node_child_process_1.execSync)(`npx tsx src/index.ts attest-policy-gen -p ${provPath} -o ${outPath}`, { cwd: node_path_1.default.resolve(__dirname, '..') });
        (0, vitest_1.expect)(node_fs_1.default.existsSync(outPath)).toBe(true);
        const policy = JSON.parse(node_fs_1.default.readFileSync(outPath, 'utf8'));
        (0, vitest_1.expect)(policy.builderId).toBe('test-builder');
    });
});
function mkdirSync(dir, options) {
    if (!node_fs_1.default.existsSync(dir))
        node_fs_1.default.mkdirSync(dir, options);
}
