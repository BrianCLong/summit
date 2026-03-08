"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const evaluate_js_1 = require("../../summit/agents/policy/evaluate.js");
const load_policy_js_1 = require("../../summit/agents/policy/load-policy.js");
const baseInvocation = {
    run_id: "r1",
    task_id: "t1",
    agent_name: "codex",
    agent_role: "builder",
    skill: "repo.write",
    inputs: { content: "hello" },
    scope: { repo_paths: ["client/src/App.tsx"] },
    env: "dev",
};
(0, node_test_1.default)("default-deny works", () => {
    const policy = { version: 1, default: "deny", rules: [] };
    const decision = (0, evaluate_js_1.evaluate)(baseInvocation, policy);
    strict_1.default.equal(decision.decision, "deny");
    strict_1.default.match(decision.reason, /default/);
});
(0, node_test_1.default)("allow rule works", () => {
    const policy = {
        version: 1,
        default: "deny",
        rules: [
            {
                id: "allow-codex",
                allow: true,
                when: {
                    agent_names: ["codex"],
                    roles: ["builder"],
                    skills: ["repo.write"],
                    envs: ["dev"],
                },
            },
        ],
    };
    const decision = (0, evaluate_js_1.evaluate)(baseInvocation, policy);
    strict_1.default.equal(decision.decision, "allow");
    strict_1.default.deepEqual(decision.matched_rules, ["allow-codex"]);
});
(0, node_test_1.default)("deny overrides allow when both match", () => {
    const policy = {
        version: 1,
        default: "deny",
        rules: [
            {
                id: "allow-codex",
                allow: true,
                when: { agent_names: ["codex"], skills: ["repo.write"], envs: ["dev"] },
            },
            {
                id: "deny-codex",
                allow: false,
                when: { roles: ["builder"], skills: ["repo.write"], envs: ["dev"] },
            },
        ],
    };
    const decision = (0, evaluate_js_1.evaluate)(baseInvocation, policy);
    strict_1.default.equal(decision.decision, "deny");
    strict_1.default.match(decision.reason, /deny-codex/);
});
(0, node_test_1.default)("repo_paths_glob constraints work", () => {
    const policy = {
        version: 1,
        default: "deny",
        rules: [
            {
                id: "allow-server-only",
                allow: true,
                when: {
                    agent_names: ["codex"],
                    roles: ["builder"],
                    skills: ["repo.write"],
                    repo_paths_glob: ["server/**"],
                    envs: ["dev"],
                },
            },
        ],
    };
    strict_1.default.equal((0, evaluate_js_1.evaluate)(baseInvocation, policy).decision, "deny");
    strict_1.default.equal((0, evaluate_js_1.evaluate)({ ...baseInvocation, scope: { repo_paths: ["server/src/index.ts"] } }, policy)
        .decision, "allow");
});
(0, node_test_1.default)("policy loader rejects invalid YAML via schema validation", () => {
    const tempFile = node_path_1.default.join(node_os_1.default.tmpdir(), `policy-invalid-${Date.now()}.yml`);
    node_fs_1.default.writeFileSync(tempFile, "version: 1\ndefault: allow\nrules: []\n", "utf8");
    strict_1.default.throws(() => (0, load_policy_js_1.loadPolicyFromFile)(tempFile), /Invalid policy file/);
    node_fs_1.default.unlinkSync(tempFile);
});
