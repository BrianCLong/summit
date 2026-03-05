# Summit Agents Skill Policy

## Skill registry and policies

- Skill definitions live in `summit/agents/skills/registry.ts`.
- Policy files live in `summit/agents/policy/` and default to `policy.example.yml` for dev/test.

## Add a new skill

1. Add a `SkillSpec` entry in `STARTER_SKILLS` (or register at startup) in `summit/agents/skills/registry.ts`.
2. Register the runtime handler in the orchestrator via `registerSkill(name, handler)`.

## Allow a skill for an agent

1. Add a rule in a policy YAML file under `summit/agents/policy/` with `allow: true` and `when.skills` including the skill name.
2. Scope access with `agent_names`, `roles`, `envs`, and optional `repo_paths_glob`, `dataset_ids`, and `connector_ids`.
3. Load the policy file in `AgentOrchestrator` using `policyPath`.
