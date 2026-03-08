import test from "node:test";
import assert from "node:assert/strict";

import { SkillRegistry } from "../../summit/agents/skills/registry.js";

test("SkillRegistry loads starter skills and supports lookup/list/register", () => {
  const registry = new SkillRegistry();

  assert.equal(registry.get("repo.read")?.name, "repo.read");
  assert.ok(registry.list().length >= 6);

  registry.register({
    name: "custom.audit",
    description: "Audit custom path",
    risk: "medium",
    scopes: ["repo"],
  });

  assert.match(registry.get("custom.audit")?.description ?? "", /Audit custom path/);
});
