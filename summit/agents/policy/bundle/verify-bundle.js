"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyBundle = verifyBundle;
const node_fs_1 = __importDefault(require("node:fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const hash_1 = require("../../../../packages/dpec/src/hash");
function loadBundle(env, bundlePath) {
    const target = bundlePath ?? `summit/agents/policy/policy-bundle.${env}.json`;
    return JSON.parse(node_fs_1.default.readFileSync(target, 'utf8'));
}
function verifyBundle(env, bundlePath) {
    const errors = [];
    const target = bundlePath ?? `summit/agents/policy/policy-bundle.${env}.json`;
    if (!node_fs_1.default.existsSync(target)) {
        return { ok: false, errors: [`Missing bundle file: ${target}`] };
    }
    const bundle = loadBundle(env, target);
    if (bundle.bundle_version !== 1) {
        errors.push(`Unsupported bundle_version=${bundle.bundle_version}`);
    }
    if (bundle.policy_version !== 1) {
        errors.push(`Unsupported policy_version=${bundle.policy_version}`);
    }
    if (!node_fs_1.default.existsSync(bundle.policy_path)) {
        errors.push(`Policy path not found: ${bundle.policy_path}`);
    }
    else {
        const policyText = node_fs_1.default.readFileSync(bundle.policy_path, 'utf8');
        const policyHash = (0, hash_1.sha256)((0, hash_1.stableStringify)(js_yaml_1.default.load(policyText)));
        if (policyHash !== bundle.policy_sha256) {
            errors.push('policy_sha256 mismatch');
        }
    }
    if (!node_fs_1.default.existsSync(bundle.skills_path)) {
        errors.push(`Skills snapshot path not found: ${bundle.skills_path}`);
    }
    else {
        const snapshot = JSON.parse(node_fs_1.default.readFileSync(bundle.skills_path, 'utf8'));
        const skillsHash = (0, hash_1.sha256)((0, hash_1.stableStringify)(snapshot));
        if (skillsHash !== bundle.skills_sha256) {
            errors.push('skills_sha256 mismatch');
        }
    }
    if (env === 'prod') {
        if (!bundle.approvals.includes('governance')) {
            errors.push('prod bundle requires approvals containing "governance"');
        }
        if (!Array.isArray(bundle.signatures) || bundle.signatures.length === 0) {
            errors.push('prod bundle requires at least one signature');
        }
        else {
            for (const [index, sig] of bundle.signatures.entries()) {
                if (!sig || sig.type !== 'sha256' || !sig.signer || !sig.sig) {
                    errors.push(`invalid signature at index ${index}`);
                }
            }
        }
    }
    return { ok: errors.length === 0, errors };
}
if (import.meta.url === `file://${process.argv[1]}`) {
    const env = (process.argv[2] ?? 'dev');
    const result = verifyBundle(env);
    if (!result.ok) {
        console.error(result.errors.join('\n'));
        process.exit(1);
    }
    console.log(`Bundle verification passed for ${env}`);
}
