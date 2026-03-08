import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import type { SkillInvocation } from "../../summit/agents/skills/types.js";
import { evaluate } from "../../summit/agents/policy/evaluate.js";
import { loadPolicyFromFile, type SkillPolicy } from "../../summit/agents/policy/load-policy.js";

const baseInvocation: SkillInvocation = {
  run_id: "r1",
  task_id: "t1",
  agent_name: "codex",
  agent_role: "builder",
  skill: "repo.write",
  inputs: { content: "hello" },
  scope: { repo_paths: ["client/src/App.tsx"] },
  env: "dev",
};

test("default-deny works", () => {
  const policy: SkillPolicy = { version: 1, default: "deny", rules: [] };
  const decision = evaluate(baseInvocation, policy);
  assert.equal(decision.decision, "deny");
  assert.match(decision.reason, /default/);
});

test("allow rule works", () => {
  const policy: SkillPolicy = {
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

  const decision = evaluate(baseInvocation, policy);
  assert.equal(decision.decision, "allow");
  assert.deepEqual(decision.matched_rules, ["allow-codex"]);
});

test("deny overrides allow when both match", () => {
  const policy: SkillPolicy = {
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

  const decision = evaluate(baseInvocation, policy);
  assert.equal(decision.decision, "deny");
  assert.match(decision.reason, /deny-codex/);
});

test("repo_paths_glob constraints work", () => {
  const policy: SkillPolicy = {
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

  assert.equal(evaluate(baseInvocation, policy).decision, "deny");
  assert.equal(
    evaluate({ ...baseInvocation, scope: { repo_paths: ["server/src/index.ts"] } }, policy)
      .decision,
    "allow"
  );
});

test("policy loader rejects invalid YAML via schema validation", () => {
  const tempFile = path.join(os.tmpdir(), `policy-invalid-${Date.now()}.yml`);
  fs.writeFileSync(tempFile, "version: 1\ndefault: allow\nrules: []\n", "utf8");
  assert.throws(() => loadPolicyFromFile(tempFile), /Invalid policy file/);
  fs.unlinkSync(tempFile);
});
