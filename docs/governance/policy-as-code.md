# Policy-as-Code Gates and Capability Intensity

This governance contract enforces deterministic policy checks and runtime intensity controls for
Summit agents.

## Skill registry model

Add skills to `summit/agents/skills/registry.yml` with explicit `risk`, `scopes`, and optional
`repo_paths`.

```yaml
skills:
  - name: docs.update
    risk: low
    scopes: [repo.write]
    repo_paths: [docs/]
```

Required fields:

- `name`: globally unique skill identifier.
- `risk`: `low`, `medium`, or `high`.
- `scopes`: explicit capability scopes (`repo.write`, `fs`, `net`, `secrets`, etc.).
- `repo_paths` (optional): allowed write prefixes for low-intensity write mode.

## Safe allow-rule pattern

Add rules in `summit/agents/policy/policy.yml`.

```yaml
default: deny
rules:
  - id: allow-prod-governance-release
    effect: allow
    env: [prod]
    agent_role: governance
    skills: [release.approve]
    scopes: [repo.write]
    annotations:
      approvals: [governance]
```

Guardrails enforced by semantics:

- High-risk skills in `prod` must be governance-only and include
  `annotations.approvals: ["governance"]`.
- Builder role cannot hold `secrets*` scopes in `prod`.
- `net` and `fs` scopes in `prod` are governance-only.
- Policy default must be `deny`.
- Rule IDs must be unique and stable.

## Approvals annotation

`annotations.approvals` is a string list used to prove governance sign-off.

- High-risk `prod` rules require `approvals` to include `governance`.
- Intensity level 3 requires the same approval annotation for medium/high-risk execution.

## AGENT_INTENSITY behavior

Capability intensity is deterministic and bounded to `[0..3]`:

- `0` → read-only (`repo.write`, `fs`, `net`, `secrets` denied).
- `1` → safe-write mode (`repo.write` only for low-risk skills with allowlisted `repo_paths`).
- `2` → normal mode; defer to policy evaluation (policy remains default-deny).
- `3` → aggressive mode; medium/high-risk execution requires
  `annotations.approvals: ["governance"]`.

Defaults:

- `dev`/`test`: intensity `1` when `AGENT_INTENSITY` is unset.
- `prod`: intensity `0` when unset.

Runtime emits deterministic events:

- `INTENSITY_EVALUATED` (always)
- `INTENSITY_DENIED` (when blocked)

Each event includes: `run_id`, `task_id`, `agent_name`, `skill`, `intensity`, `decision`,
`reason`, and `inputs_hash`.
