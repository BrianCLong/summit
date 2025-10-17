# Contributing — Claude Skills

1. Create a new folder under `.claude/skills/<skill-id>`.
2. Copy an existing `skill.yaml` and update fields (id, triggers, permissions).
3. Add `instructions/`, `resources/`, `scripts/`, `tests/`, `policies/`, `observability/`, `provenance/`.
4. Update `.claude/registry.yaml` to include the new skill.
5. Open a PR; ensure **Claude Skills Verify** passes.
