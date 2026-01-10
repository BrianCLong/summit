# Human Owner Guide

This guide is the control surface for directing Summit's agent swarm. Use it to shift strategy, reprioritize work, set "human-only" guardrails, and track agent activity without touching code.

## Steering the strategy

- **Change emphasis** by editing `TASK_BACKLOG.md` priorities (High/Medium/Low) and the `mode` field at the top. Set `mode: exploration` to encourage refactors and experiments; set `mode: exploitation` to finish existing work and debt.
- **Align prompts** by updating `.agentic-prompts/*.md` scopes and constraints. Keep edits small and explicit (≤5 lines) so agents inherit them on the next task pickup.
- **Set agent roles** by naming an `agent_owner` per task in `TASK_BACKLOG.md` (e.g., `Jules` for build, `Codex` for docs/tests). Use the `human_owner` column to stay in the loop.
- **Announce priorities** in the `Notes` column (e.g., "Blockers cleared, pull now" or "Hold for human review"). Agents read this file as the source of truth.

### Example edits that change behavior

- Promote a task: change `priority` from `Medium` to `High` and move the row higher in `TASK_BACKLOG.md`.
- Switch modes: set `mode: exploitation` at the top of `TASK_BACKLOG.md` to tell agents to finish in-flight work before starting new ideas.
- Create a human-only zone: add a row under "Restricted Areas" below and include the path in `agent-contract.json`'s `restrictedAreas` plus the guardrail label.
- Add a temporary freeze: set `status` to `blocked` with a short reason; agents will skip it until unblocked.

## Task backlog controls

- **File of record:** `TASK_BACKLOG.md`.
- **Promote/demote:** Adjust the `priority` column and reorder rows. Agents pick the highest-priority ready tasks first.
- **Agent assignment:** Fill `agent_owner` with `Jules`, `Codex`, or another delegate; leave blank for manual pickup.
- **Off-limits:** Use the `restricted` column when a task must be human-only; mirror the path in `agent-contract.json` and the guardrail workflow.

## Guardrails and overrides

- **Restricted areas** live in `agent-contract.json` under `restrictedAreas` and are enforced by `.github/workflows/agent-guardrails.yml`.
- **Default behavior:** Any PR touching restricted paths fails unless a human adds the `restricted-area-override` label **or** the PR body contains `"restricted_override": true` inside the agent metadata block.
- **Human-only tasks:** Mark them in `TASK_BACKLOG.md` and log them in `AGENT_ACTIVITY.md` with status `human-only`. Agents will not pick them up.

### Restricted areas (edit to adjust)

- `secrets/` — credentials, secret material.
- `security-hardening/` and `security/` — defense-in-depth policies.
- `trust/` — trust store and attestation data.
- `sealed-secrets/` — sealed secret manifests.
- `terraform/prod/` — production infrastructure definitions.

## Observability and status

- **Ledger:** `AGENT_ACTIVITY.md` records recent task IDs, branches/PRs, agent responsible, and current status.
- **Backlog:** `TASK_BACKLOG.md` is the single queue; keep it small (≤12 items) and prioritized.
- **Ops handbook:** `docs/AGENT_OPS_HANDBOOK.md` references these controls for runbook-style operations.

## Exploration vs. exploitation

Set the backlog `mode` to influence behavior:

- `mode: exploration` — agents should propose experiments, refactors, or research spikes. Expect more drafts and design notes.
- `mode: exploitation` — agents should land currently planned work, reduce debt, and avoid new surfaces.

## Override checklist for humans

1. Decide if a restricted-path change is required.
2. Add the `restricted-area-override` label **or** set `"restricted_override": true` inside the PR's agent metadata block.
3. Ensure PR metadata matches the declared scope in `agent-contract.json` and `TASK_BACKLOG.md`.
4. Update `AGENT_ACTIVITY.md` with the task ID, branch, status, and agent.
5. After merge, remove temporary overrides and reset the backlog mode if it was changed for the task.
