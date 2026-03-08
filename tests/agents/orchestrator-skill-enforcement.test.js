"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const agent_orchestrator_js_1 = require("../../summit/agents/orchestrator/agent-orchestrator.js");
const policy = {
    version: 1,
    default: "deny",
    rules: [
        {
            id: "allow-codex-tests",
            allow: true,
            when: {
                agent_names: ["codex"],
                roles: ["builder"],
                skills: ["tests.run"],
                envs: ["dev"],
            },
        },
    ],
};
const invocation = {
    run_id: "run-1",
    task_id: "task-1",
    agent_name: "codex",
    agent_role: "builder",
    skill: "tests.run",
    inputs: { suite: "unit" },
    scope: { repo_paths: ["server/src/index.ts"] },
    env: "dev",
};
(0, node_test_1.default)("orchestrator logs SKILL_ALLOWED and execution events deterministically", async () => {
    const events = [];
    const orchestrator = new agent_orchestrator_js_1.AgentOrchestrator({ policy, eventSink: (e) => events.push(e) });
    orchestrator.registerSkill("tests.run", async () => ({ ok: true }));
    const output = await orchestrator.invokeSkill(invocation);
    strict_1.default.deepEqual(output, { ok: true });
    strict_1.default.deepEqual(events.map((e) => e.type), ["SKILL_ALLOWED", "SKILL_EXEC_STARTED", "SKILL_EXEC_FINISHED"]);
    strict_1.default.ok(events.every((e) => e.inputs_hash.length === 64));
    strict_1.default.equal(events[2]?.outputs_hash?.length, 64);
});
(0, node_test_1.default)("orchestrator logs SKILL_DENIED deterministically for blocked invocation", async () => {
    const events = [];
    const orchestrator = new agent_orchestrator_js_1.AgentOrchestrator({ policy, eventSink: (e) => events.push(e) });
    await strict_1.default.rejects(orchestrator.invokeSkill({ ...invocation, skill: "release.approve", task_id: "task-2" }), /Skill invocation denied/);
    strict_1.default.equal(events.length, 1);
    strict_1.default.equal(events[0]?.type, "SKILL_DENIED");
    strict_1.default.equal(events[0]?.decision, "deny");
});
