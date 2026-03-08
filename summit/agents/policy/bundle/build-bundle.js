"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalPolicySha256 = canonicalPolicySha256;
exports.buildBundle = buildBundle;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const hash_1 = require("../../../../packages/dpec/src/hash");
const registry_snapshot_1 = require("../../skills/registry.snapshot");
function canonicalPolicySha256(policyYamlText) {
    const parsed = js_yaml_1.default.load(policyYamlText);
    return (0, hash_1.sha256)((0, hash_1.stableStringify)(parsed));
}
function loadSkillsSnapshot(skillsPath, env) {
    if (node_fs_1.default.existsSync(skillsPath)) {
        return JSON.parse(node_fs_1.default.readFileSync(skillsPath, 'utf8'));
    }
    if (env === 'prod') {
        throw new Error(`Missing skills snapshot at ${skillsPath}`);
    }
    return (0, registry_snapshot_1.writeSkillRegistrySnapshot)({}, skillsPath);
}
function buildBundle(env, options = {}) {
    const policyPath = options.policyPath ?? 'summit/agents/policy/policy.yml';
    const skillsPath = options.skillsSnapshotPath ?? 'summit/agents/skills/registry.snapshot.json';
    const outputPath = options.outputPath ?? `summit/agents/policy/policy-bundle.${env}.json`;
    const policyText = node_fs_1.default.readFileSync(policyPath, 'utf8');
    const policySha = canonicalPolicySha256(policyText);
    const skillsSnapshot = (0, registry_snapshot_1.buildSkillRegistrySnapshot)(loadSkillsSnapshot(skillsPath, env));
    const skillsSha = (0, hash_1.sha256)((0, hash_1.stableStringify)(skillsSnapshot));
    if (!node_fs_1.default.existsSync(skillsPath)) {
        node_fs_1.default.mkdirSync(node_path_1.default.dirname(skillsPath), { recursive: true });
        node_fs_1.default.writeFileSync(skillsPath, `${(0, hash_1.stableStringify)(skillsSnapshot)}\n`, 'utf8');
    }
    const bundle = {
        bundle_version: 1,
        policy_version: 1,
        created_at: options.createdAt ?? new Date().toISOString(),
        env,
        policy_sha256: policySha,
        skills_sha256: skillsSha,
        policy_path: policyPath,
        skills_path: skillsPath,
        approvals: options.approvals ?? [],
        signatures: options.signatures ?? [],
    };
    node_fs_1.default.mkdirSync(node_path_1.default.dirname(outputPath), { recursive: true });
    node_fs_1.default.writeFileSync(outputPath, `${(0, hash_1.stableStringify)(bundle)}\n`, 'utf8');
    return bundle;
}
if (import.meta.url === `file://${process.argv[1]}`) {
    const env = (process.argv[2] ?? 'dev');
    buildBundle(env);
}
