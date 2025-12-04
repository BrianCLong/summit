# Summit Prompt Index

Single source of truth for prompts used across agents and flows.

## Core

- `extrapolative-dev.md` – Universal maximal extrapolative dev prompt for builders.
- `executor-orchestration.md` – Core flow orchestration prompt for Executor.

## Recapture

- `codex-recapture.md` – Codex PR recapture and reintegration prompt.

## Review

- `pr-reviewer.md` – Reviewer prompt for PR analysis and verdicts.

## Predictive

- `predictive-core.md` – Predictive analytics and prioritization prompt.

## Psyops

- `psyops-core.md` – Narrative / threat modeling and hardening prompt.

---

### Usage

Each agent’s `prompt.md` **may embed or reference** these modular prompts.

- Builders → import `extrapolative-dev.md`
- Codex → import `codex-recapture.md`
- Reviewer → import `pr-reviewer.md`
- Predictive → import `predictive-core.md`
- Psyops → import `psyops-core.md`
