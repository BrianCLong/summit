# Summit IntelGraph Path Ahead

## Current Signals (from repo health review)

- **Issue backlog:** ~5,000 open issues require immediate triage to separate noise from actionable work.
- **Open PRs:** 103 open requests suggest merge queue/process tuning is needed.
- **Release cadence:** 422 releases with semantic versioning indicates strong automation; protect the golden path.
- **Stack posture:** Multi-LLM orchestration with production-grade security and data layers (PostgreSQL, Neo4j, TimescaleDB, Redis).

## Risks

- Signal-to-noise collapse from untriaged issues could mask critical defects or security concerns.
- PR backlog increases chance of drift against `main` and diverging API contracts.
- Documentation discoverability gaps can slow onboarding and handoffs.

## Path Ahead (Subagent-Aligned)

- **Issue Hygiene (Amp + partner agents):**
  - Enable an automated stale policy to quarantine issues >60 days inactive; auto-close after 7 additional days with transparent messaging.
  - Batch-label top 500 issues by severity (`critical`, `high`, `medium`, `low`) and domain (`backend`, `frontend`, `ops`, `ml`).
  - Surface security-tagged items to `security-council` for immediate review.
- **PR Flow (Jules + Maestro):**
  - Stand up a merge queue with required checks mirroring `pr-quality-gate.yml` to prevent serial blocking.
  - Auto-request reviews via CODEOWNERS and apply staleness rules for inactive PRs (>30 days).
  - Add lightweight speculative rebases in CI to reduce integration surprises.
- **Golden Path Guardrails (Codex + Ops subagents):**
  - Keep `make bootstrap && make up && make smoke` as the invariant acceptance bar for new environments.
  - Publish quickstart links to docs and runbooks directly in README for discoverability.
  - Expand coverage targets around changed areas (≥80%) and enforce via pre-merge gates.
- **Multi-LLM Orchestration Safety (Maestro + Orchestrator):**
  - Ensure policy-as-code enforcement for any LLM action; route ambiguity to governance instead of bypassing policy checks.
  - Capture provenance events for automated agent actions to keep human decision trails intact.

## Execution Windows

- **P0 (This week):** Deploy stale-issue workflow, label critical issues, and enable merge queue with required checks.
- **P1 (This month):** Publish README doc links, add CI guard for coverage thresholds, and roll out speculative rebase step.
- **P2 (This quarter):** Harden multi-LLM policy enforcement and extend provenance logging across orchestrated agents.

## Measures of Success

- Issue backlog reduced by ≥40% via staleness automation and triage labels within two weeks.
- PR median time-to-merge under 3 days with merge queue adoption.
- Golden path success rate ≥99% on fresh clones; coverage maintained at ≥80% for touched surfaces.
- Provenance events emitted for 100% of automated agent actions involving policy-sensitive flows.
