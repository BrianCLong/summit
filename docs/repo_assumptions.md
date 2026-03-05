# Repo Reality Check: Agent Markdown Adapter Initiative

## Objective
This file records validated repository realities for implementing the Agent-Optimized Content Adapter for Markdown-oriented agent endpoints.

## Validation Snapshot

### Confirmed paths and conventions
- Adapter-oriented documentation already exists under `docs/adapters/` and can host related architecture references.
- Evidence-oriented documentation exists under `docs/evidence/` and `docs/evidence/schema/`, indicating an established evidence contract surface.
- Security documentation and policy references are available under `docs/security/*` and `docs/governance/*`.
- Operational and runbook materials are maintained under `docs/ops/`-adjacent and `docs/governance/runbooks/` structures.

### Assumptions retired
The earlier assumption set (`/adapters`, `/core`, `/evidence`, `/ci`, `/scripts`) is superseded by observed monorepo topology:
- Source code spans multiple roots (`src/`, `mcp/`, `pipelines/`, `services/`, `packages/`, and others).
- Documentation-first specification is required before selecting the final implementation zone.

## Implementation Placement Decision
For this initiative, the canonical specification and policy mapping are introduced first in docs:
- Primary spec: `docs/standards/agent-markdown.md`
- Reality-check and rollout anchor: `docs/repo_assumptions.md`

Code placement for the first executable adapter is intentionally constrained pending owner confirmation of the preferred runtime plane (`pipelines/`, `src/hybrid/adapters/`, or `mcp/summit_server/`).

## Validation Checklist Results

| Checklist Item | Result | Notes |
|---|---|---|
| Confirm evidence schema file path | PASS | Evidence schema docs confirmed under `docs/evidence/schema/`. |
| Confirm CI check naming conventions | DEFERRED | Exact job names must be read from CI workflow files before hard-coding gate IDs. |
| Confirm adapter registration mechanism | DEFERRED | Multiple runtime planes exist; registration point must be selected by domain owner. |
| Confirm artifact directory naming pattern | PASS | Existing repository uses `artifacts/` conventions in governance and CI outputs. |

## Enforced Guardrails for Phase 1
- Feature flag defaults OFF.
- Deterministic artifact policy enforced (`report.json`, `metrics.json`, `stamp.json` with stable ordering and hashable payloads).
- Deny-by-default on ambiguous content type, invalid UTF-8, and oversize payloads.
- No scraping engine rewrite, no CI redesign, and no HTML parser refactor.

## Next Binding Action
Create the Phase 1 implementation issue using `docs/standards/agent-markdown.md` as the normative contract, then bind one runtime plane for adapter registration with owner sign-off.
