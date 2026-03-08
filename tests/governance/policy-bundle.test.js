"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const vitest_1 = require("vitest");
const build_bundle_1 = require("../../summit/agents/policy/bundle/build-bundle");
const verify_bundle_1 = require("../../summit/agents/policy/bundle/verify-bundle");
const ORIGINAL_CWD = process.cwd();
const tempDirs = [];
function setupTempRepo() {
    const dir = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), 'policy-bundle-'));
    tempDirs.push(dir);
    process.chdir(dir);
    node_fs_1.default.mkdirSync('summit/agents/policy', { recursive: true });
    node_fs_1.default.mkdirSync('summit/agents/skills', { recursive: true });
    node_fs_1.default.writeFileSync('summit/agents/policy/policy.yml', 'version: 1\nsemantics:\n  allowed_actions: [invoke_skill]\nintensity:\n  min: 1\n  max: 5\n', 'utf8');
    node_fs_1.default.writeFileSync('summit/agents/skills/registry.snapshot.json', '{"snapshot_version":1,"skills":[]}', 'utf8');
    return dir;
}
(0, vitest_1.afterEach)(() => {
    process.chdir(ORIGINAL_CWD);
    for (const dir of tempDirs.splice(0, tempDirs.length)) {
        node_fs_1.default.rmSync(dir, { recursive: true, force: true });
    }
});
(0, vitest_1.describe)('policy bundle', () => {
    (0, vitest_1.it)('keeps deterministic hash stable across YAML key ordering', () => {
        const yamlA = 'a: 1\nb: { c: 2, d: 3 }\n';
        const yamlB = 'b:\n  d: 3\n  c: 2\na: 1\n';
        (0, vitest_1.expect)((0, build_bundle_1.canonicalPolicySha256)(yamlA)).toBe((0, build_bundle_1.canonicalPolicySha256)(yamlB));
    });
    (0, vitest_1.it)('fails verify when policy changes but bundle is stale', () => {
        setupTempRepo();
        (0, build_bundle_1.buildBundle)('prod', {
            createdAt: '2026-01-01T00:00:00.000Z',
            approvals: ['governance'],
            signatures: [{ type: 'sha256', signer: 'test', sig: 'abc' }],
        });
        node_fs_1.default.appendFileSync('summit/agents/policy/policy.yml', '\nnew_guardrail: enabled\n');
        const result = (0, verify_bundle_1.verifyBundle)('prod');
        (0, vitest_1.expect)(result.ok).toBe(false);
        (0, vitest_1.expect)(result.errors.join(' ')).toContain('policy_sha256 mismatch');
    });
    (0, vitest_1.it)('fails in prod when approvals are missing', () => {
        setupTempRepo();
        (0, build_bundle_1.buildBundle)('prod', {
            createdAt: '2026-01-01T00:00:00.000Z',
            approvals: [],
            signatures: [{ type: 'sha256', signer: 'test', sig: 'abc' }],
        });
        const result = (0, verify_bundle_1.verifyBundle)('prod');
        (0, vitest_1.expect)(result.ok).toBe(false);
        (0, vitest_1.expect)(result.errors.join(' ')).toContain('approvals containing "governance"');
    });
    (0, vitest_1.it)('fails in prod when signatures are empty', () => {
        setupTempRepo();
        (0, build_bundle_1.buildBundle)('prod', {
            createdAt: '2026-01-01T00:00:00.000Z',
            approvals: ['governance'],
            signatures: [],
        });
        const result = (0, verify_bundle_1.verifyBundle)('prod');
        (0, vitest_1.expect)(result.ok).toBe(false);
        (0, vitest_1.expect)(result.errors.join(' ')).toContain('at least one signature');
    });
    (0, vitest_1.it)('passes in dev/test without signatures requirement', () => {
        setupTempRepo();
        (0, build_bundle_1.buildBundle)('dev', { createdAt: '2026-01-01T00:00:00.000Z' });
        (0, build_bundle_1.buildBundle)('test', { createdAt: '2026-01-01T00:00:00.000Z' });
        (0, vitest_1.expect)((0, verify_bundle_1.verifyBundle)('dev').ok).toBe(true);
        (0, vitest_1.expect)((0, verify_bundle_1.verifyBundle)('test').ok).toBe(true);
    });
});
