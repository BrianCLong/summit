"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadRuntimePolicy = loadRuntimePolicy;
const node_fs_1 = __importDefault(require("node:fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const verify_bundle_1 = require("./verify-bundle");
function emitPolicyBundleEvent(event) {
    const line = `${JSON.stringify(event)}\n`;
    node_fs_1.default.appendFileSync('summit/agents/policy/policy-events.jsonl', line, 'utf8');
}
function loadRuntimePolicy(env, runId) {
    if (env === 'prod') {
        const result = (0, verify_bundle_1.verifyBundle)('prod');
        if (!result.ok) {
            emitPolicyBundleEvent({
                type: 'POLICY_BUNDLE_VERIFIED',
                ts: new Date().toISOString(),
                allow: false,
                reason: result.errors.join('; '),
                run_id: runId,
                metadata: { env },
            });
            throw new Error(`prod bundle verification failed: ${result.errors.join('; ')}`);
        }
        emitPolicyBundleEvent({
            type: 'POLICY_BUNDLE_VERIFIED',
            ts: new Date().toISOString(),
            allow: true,
            reason: 'bundle verified',
            run_id: runId,
            metadata: { env },
        });
    }
    const raw = node_fs_1.default.readFileSync('summit/agents/policy/policy.yml', 'utf8');
    const policy = js_yaml_1.default.load(raw);
    if (!policy || typeof policy !== 'object') {
        throw new Error('policy.yml must be a YAML object');
    }
    return policy;
}
