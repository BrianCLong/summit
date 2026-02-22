# Prompt: implement/context-shell@v1

## Mission

Deliver a Summit-native Context Shell with policy-gated execution, evidence logging, deterministic outputs, and Maestro tool integration.

## Scope

- libs/context-shell
- server/src/maestro/tools
- server/src/maestro/engine
- docs/runbooks
- docs/roadmap/STATUS.json
- jest.config.cjs
- jest.projects.cjs
- agents/examples
- prompts/registry.yaml

## Constraints

- No arbitrary binary execution.
- All tool calls emit evidence events.
- Deterministic behavior in CI (timezone/locale safe).
- Write operations require justification and patch format.

## Required Outputs

- Context Shell API with `ctx.bash`, `ctx.readFile`, `ctx.writeFile` tools.
- Allowlist policy + denylist path safety.
- Evidence JSONL writer.
- Maestro tool adapter registration.
- Runbook documentation and tests.
