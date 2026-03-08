import test from "node:test";
import assert from "node:assert/strict";

import type { SkillInvocation } from "../../summit/agents/skills/types.js";
import {
  AgentOrchestrator,
  type AgentEvent,
} from "../../summit/agents/orchestrator/agent-orchestrator.js";
import type { SkillPolicy } from "../../summit/agents/policy/load-policy.js";

const policy: SkillPolicy = {
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

const invocation: SkillInvocation = {
  run_id: "run-1",
  task_id: "task-1",
  agent_name: "codex",
  agent_role: "builder",
  skill: "tests.run",
  inputs: { suite: "unit" },
  scope: { repo_paths: ["server/src/index.ts"] },
  env: "dev",
};

test("orchestrator logs SKILL_ALLOWED and execution events deterministically", async () => {
  const events: AgentEvent[] = [];
  const orchestrator = new AgentOrchestrator({ policy, eventSink: (e) => events.push(e) });
  orchestrator.registerSkill("tests.run", async () => ({ ok: true }));

  const output = await orchestrator.invokeSkill(invocation);

  assert.deepEqual(output, { ok: true });
  assert.deepEqual(
    events.map((e) => e.type),
    ["SKILL_ALLOWED", "SKILL_EXEC_STARTED", "SKILL_EXEC_FINISHED"]
  );
  assert.ok(events.every((e) => e.inputs_hash.length === 64));
  assert.equal(events[2]?.outputs_hash?.length, 64);
});

test("orchestrator logs SKILL_DENIED deterministically for blocked invocation", async () => {
  const events: AgentEvent[] = [];
  const orchestrator = new AgentOrchestrator({ policy, eventSink: (e) => events.push(e) });

  await assert.rejects(
    orchestrator.invokeSkill({ ...invocation, skill: "release.approve", task_id: "task-2" }),
    /Skill invocation denied/
  );

  assert.equal(events.length, 1);
  assert.equal(events[0]?.type, "SKILL_DENIED");
  assert.equal(events[0]?.decision, "deny");
});
