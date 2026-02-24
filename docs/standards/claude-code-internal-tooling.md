# Claude-Code Internal Tooling Mapping (Summit MWS)

## Scope
This standard defines the minimal deterministic internal-tooling lane for Claude Code-style workflows inside Summit.

## Mapping
| Domain | Summit MWS mapping |
| --- | --- |
| Prompt structure | `agents/prompts/base_prompt.md` |
| Structured task template | `agents/prompts/tooling_task_template.md` |
| Agent scaffold | `agents/tooling_agent.py` |
| Task graph orchestration | `agents/task_graph.py` + `schemas/tooling/task_graph.schema.json` |
| Deterministic runner | `scripts/tooling/run_agent.py` |
| Artifact contract | `schemas/tooling/*.schema.json` |
| CI gate | `scripts/ci/tooling_agent_check.mjs`, `scripts/ci/tooling_prompt_lint.py`, `.github/workflows/tooling-agent.yml` |
| Monitoring | `scripts/monitoring/tooling-agent-drift.py` + `docs/monitoring/tooling-agent.md` |
| Performance harness | `scripts/tooling/profile_agent.py` |

## Guarantees
- Feature flag default-off behavior via `TOOLING_AGENT_ENABLED`.
- Deterministic outputs for `report.json`, `metrics.json`, `stamp.json`.
- Schema-validated and CI-enforced artifacts.
- Prompt-injection indicator detection and block semantics.

## Non-goals
- No external SaaS runtime integration.
- No production runtime refactor.
- No policy-engine bypasses.
