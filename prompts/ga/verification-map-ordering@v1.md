# Prompt: GA verification map ordering guardrail (v1)

## Objective

Enforce deterministic ordering for GA verification mapping so the verification map stays stable and auditable.

## Scope

- scripts/ga/verify-ga-surface.mjs
- docs/ga/verification-map.json
- agent-contract.json
- docs/roadmap/STATUS.json
- AGENT_ACTIVITY.md
- TASK_BACKLOG.md
- prompts/ga/verification-map-ordering@v1.md
- prompts/registry.yaml
- agents/examples/

## Requirements

- Add a guardrail that fails if verification-map entries are not sorted by feature name.
- Reorder the verification map to satisfy the guardrail.
- Update agent contract and roadmap status to reflect the guardrail.
- Log the task in AGENT_ACTIVITY and TASK_BACKLOG.
- Provide a Tier C verification artifact by running `make ga-verify`.

## Constraints

- Do not modify global Jest/pnpm configuration.
- Keep changes minimal and deterministic.
