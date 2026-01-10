# Optimization Loop Registry

## Overview

This registry enumerates approved autonomous optimization loops, their governance constraints, and operational boundaries. Each loop is independently authorized and must respect the isolation, budget, and rollback rules defined here.

## Loop Entries

### L-A1: Prompt Compaction Iteration (Class A — Cost Efficiency)

- **Objective function:** Minimize average tokens per served prompt while maintaining ≥98% task success parity versus baseline.
- **Scope:** Prompt templates for analytics copilot flows in `server` and `apps/web` (read-only evaluation of outcomes; writes limited to prompt template configs).
- **Allowed actions:**
  - Rewrite prompts using approved compression patterns.
  - Swap to pre-approved prompt fragments stored in the prompt registry.
  - Enable/disable deterministic truncation rules.
- **Hard caps:**
  - Max 2% latency increase per release window.
  - Max 5% relative error rate increase compared to baseline or last approved version.
  - Token floor: never below 45% of original template length.
- **Signals required:** Token usage per flow, task success rate, human rating deltas, regression tests for semantics.
- **Rollback strategy:** Maintain template version history; rollback to last green hash with automatic propagation via config deploy. Post-rollback verification runs semantic regression suite.

### L-B1: Retry Backoff Tuning (Class B — Reliability)

- **Objective function:** Minimize error surface area (timeouts, 5xx) with stable P95 latency; optimize retry success yield per cost.
- **Scope:** Service-to-service calls within `server` and worker queues; no cross-tenant reach.
- **Allowed actions:**
  - Adjust retry counts within 1–4.
  - Adjust exponential backoff coefficient within 1.2–2.0.
  - Toggle jitter mode between full jitter and equal jitter.
- **Hard caps:**
  - Max 1 concurrent parameter change per service per 24h.
  - Abort if P95 latency increases by >5% or success rate drops by >1% versus control.
  - Guardrail: never exceed 6s cumulative retry delay.
- **Signals required:** Error rate by endpoint, retry yield, latency histograms, saturation of worker queues, SLO error budgets.
- **Rollback strategy:** Store prior retry policy per endpoint; immediate revert via feature flag with health check confirmation and post-revert error-budget audit.

### L-C1: Concurrency Window Tuning (Class C — Performance)

- **Objective function:** Increase throughput (requests/min or jobs/min) while keeping P99 latency within SLO and avoiding saturation.
- **Scope:** Worker pools and API handlers that expose a configurable concurrency window; limited to single-tenant contexts.
- **Allowed actions:**
  - Increase/decrease concurrency window within pre-authorized bounds per service.
  - Shift queue partitioning between hot and cold lanes when configured.
- **Hard caps:**
  - Concurrency delta limited to ±25% per change.
  - Abort if queue wait time grows >10% or error rate increases >0.5% versus baseline.
  - No changes during incident or SLO burn >50%.
- **Signals required:** Queue depth, throughput, latency (P95/P99), error rate, CPU/memory saturation, backpressure indicators.
- **Rollback strategy:** Maintain last-known-good window; revert via config push and verify queue drain plus latency recovery.

### L-D1: Over-Broad Scope Detection (Class D — Policy Hygiene, Advisory)

- **Objective function:** Identify roles, tokens, or policy bundles whose scopes exceed the minimum required; surface actionable reductions.
- **Scope:** Policy definitions in `policy/` packages and service RBAC manifests; advisory only until promoted.
- **Allowed actions (advisory):**
  - Emit recommendations for least-privilege adjustments.
  - Flag suspect scopes for human review.
- **Hard caps:**
  - No automatic policy changes in advisory mode.
  - Max 10 findings per run to avoid alert fatigue.
- **Signals required:** Policy graph diffs, access logs, unused permission counts, change history, incident correlations.
- **Rollback strategy:** Not applicable while advisory. If promoted, rollbacks rely on policy version pinning with pre/post evaluation.

## Cross-Loop Isolation

- Loop actions are restricted to their scoped configuration stores; shared primitives (metrics, provenance) are read-only.
- No loop may mutate another loop's configuration or budget envelopes.
- Conflict detection: proposed changes that touch overlapping resources are queued and require explicit human arbitration via the policy engine.

## Authorization & Change Control

- Each loop requires explicit enablement in the policy matrix with a unique loop ID.
- All actions must emit provenance receipts (see `RECEIPTS.md`) before execution is considered valid.
- Fail-closed: absent signals, missing policy entries, or budget exhaustion block execution automatically.

## Policy Bindings

- OPA policy packages:
  - `policy.optimization.authz` for allowed actions and scopes.
  - `policy.optimization.budget` for per-loop and global ceilings.
  - `policy.optimization.fail_closed` for missing signals or invalid inputs.
- Loop IDs in this registry must align with policy bundle data to avoid drift.
