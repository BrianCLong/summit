# Cursor ↔️ Maestro Conductor Integration Blueprint

## Overview

- **Objective:** Route all Cursor activity through Maestro Conductor (MC) with tenant-aware access control, policy guardrails, provenance coverage, and cost governance.
- **Scope:** GitHub/GitLab-hosted repositories, OIDC-authenticated Cursor clients, GitHub Actions (or drop-in equivalent) CI, MC Policy Reasoner (OPA), MC LLM Proxy.
- **Non-goals:** Replace IDEs or CI runners, force a specific model vendor, or add unrelated product features.
- **Constraints:** Follow IntelGraph defaults for SLOs, retention, budgets, ABAC/OPA, and mTLS; never hardcode secrets; support multi-tenant, ST-DED, and air-gapped topologies.

## Tenant Taxonomy & Guardrails

- **Budgets (`TENANT_BUDGETS`):**

| Tenant              | Daily Token Budget | Daily USD Cap | Alert Threshold | Notes                                                   |
| ------------------- | ------------------ | ------------- | --------------- | ------------------------------------------------------- |
| `test`              | 3,000,000 tokens   | $25           | 80%             | Canary tenant auto-escalates after sustained compliance |
| `demo`              | 3,000,000 tokens   | $25           | 80%             | Customer demo tenant with identical guardrails          |
| `maestro-internal`  | 3,000,000 tokens   | $25           | 80%             | Internal Maestro ops workload guard                     |
| `production-sample` | 12,000,000 tokens  | $100          | 85%             | Baseline production profile without auto-escalation     |

- **Model Allowlist:** `gpt-4.1-mini`, `claude-3.5-sonnet` routed exclusively through `mc-llm-proxy`.
- **Purpose Tags:** `investigation`, `threat-intel`, `fraud-risk`, `t&s`, `benchmarking`, `training`, `demo` (mirrors ABAC `purpose_allowed`).

## Architecture Summary

```
flowchart LR
  Dev[Cursor Client] -- OIDC + mTLS --> GW[MC Gateway]
  Dev -- LLM calls --> PX[MC LLM Proxy]
  GW --> OPA[MC Policy Reasoner]
  GW --> LED[Provenance Ledger]
  PX -- metrics --> OBS[Telemetry Stack]
  GW --> SCM[(GitHub/GitLab)]
  CI[CI/CD] -- policy gates --> SCM
  LED --> CI
  OPA --> CI
```

### Data Planes

1. **Interactive:** Cursor uses short-lived tokens + device binding to authenticate with the Gateway. Pre-flight checks enforce ABAC scopes and budgets before the MC LLM Proxy streams completions.
2. **Provenance:** Cursor sends structured events (`cursor.session.start`, `cursor.prompt`, `cursor.applyDiff`, `cursor.commit`) to the Gateway. Events are signed, policy-evaluated, and appended to the ledger with checksums.
3. **CI Gates:** Provenance annotations decorate PRs. GitHub Actions pull `diff_sha256` hashes and replay OPA policies (license, PII, retention) before merges.

### Guardrails & Controls

- **Policy Evaluation:** `packages/policy` enforces model allow-lists, purpose binding, license checks, and data-class redaction requirements via deterministic explanations.
- **Access Gateway:** `packages/gateway` verifies tenant, device binding, mTLS fingerprint, scope coverage, rate limits, per-tenant budgets, and orchestrates ledger writes.
- **Ledger:** `packages/prov-ledger` stores audit-ready records (session → diff hash) with retention-aware pruning and coverage reporting.
- **Shared Schemas:** `packages/common-types` normalizes snake_case events into typed MC domain objects and tracks budget/rate-limit states.

## Delivery Plan (Epics → Stories)

The roadmap uses MoSCoW prioritization with owners assigned during squad kickoff.

### Epic 1 – Identity & Access (Must)

- **Story:** Issue short-lived OIDC tokens with device binding metadata to Cursor clients via MC Gateway.
- **Story:** Enforce per-tenant ABAC scopes (`read_repo`, `generate_code`, `run_tool`, `call_llm`) in the Gateway handler; deny mismatched tenants or missing scopes.
- **Story:** Capture client mTLS fingerprints and fail closed when absent for ST-DED tenants.

### Epic 2 – MC LLM Proxy & Cost Guardrails (Must)

- **Story:** Configure budgets per tenant (default + overrides) and trigger 80% spend alerts; block once exhausted.
- **Story:** Enforce model allow-list / block-list routing via Proxy headers (`X-Tenant`, `X-Purpose`, `X-Data-Classes`).
- **Story:** Attribute token usage and cost to repo/branch/story for cost dashboards.

### Epic 3 – Provenance & Audit (Must)

- **Story:** Emit signed events for session start/stop, prompts, diff applications, and commits with prompt/diff hashes.
- **Story:** Persist policy decisions, ledger checksum, and budget/rate-limit states for audit replay.
- **Story:** Track coverage (`diff_sha256` vs PR diffs) to maintain ≥99.9% provenance completeness.

### Epic 4 – Policy Reasoner & Guardrails (Must)

- **Story:** Deploy baseline OPA bundles (license, purpose, model allow-list, data-class redaction) and store `explain` payloads.
- **Story:** Automatically deny events with unresolved PII or secrets; require redaction evidence for production-PII classes.
- **Story:** Provide overrides for legal hold or restricted licenses with explicit explanations.

### Epic 5 – Repo Bootstrap & Editor Rules (Should)

- **Story:** Generate `cursor/rules.md` with purpose/data-class declarations and guardrails; distribute via repo bootstrap script.
- **Story:** Ship prompt/tool templates with tenant-specific redaction helpers and provenance hints.

### Epic 6 – CI Integration (Must)

- **Story:** Label PRs `ai-assisted` when any AI-touched lines exist.
- **Story:** Add CI workflow (`ai-assisted-gates`) to fetch provenance, simulate policy, run license/PII/secret scans, and block merges on violations.
- **Story:** Surface provenance deltas in PR comments (files touched, models used, test coverage delta, SLO checks).

### Epic 7 – Observability & SLOs (Must)

- **Story:** Dashboards for token spend vs budget, AI suggestion accept-rate, rollback rate, policy deny rate, and provenance gaps.
- **Story:** Alerts for cost overruns, 5xx bursts, policy deny spikes, and ledger coverage drops.
- **Story:** Load test MC Proxy (k6) to ensure p95 ≤350 ms (queries) / ≤700 ms (mutations).

### Epic 8 – Rollout & Training (Should)

- **Story:** Canary rollout per squad with playbooks, change comms, and feature flags for rapid disable.
- **Story:** Document tenant onboarding flow, troubleshooting runbooks, and backout steps (disable flag, empty allow-list, CI guard remains).

## Component Mapping

| Component      | Responsibilities                                                            | Key Configs                                                   |
| -------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `common-types` | Cursor event schema, normalization helpers, budget/rate-limit models        | `CursorEvent`, `normalizeCursorEvent`, `BudgetResult`         |
| `policy`       | Deterministic policy evaluation (model/purpose/license/data-class)          | allow/deny lists, overrides, redaction enforcement            |
| `gateway`      | AuthZ, budgets, rate limiting, policy dispatch, ledger append, HTTP surface | scope mapping, device + mTLS checks, event ingestion endpoint |
| `prov-ledger`  | Immutable-ish ledger with retention pruning, coverage metrics               | retention window, checksum generation                         |

## Observability & Compliance

- **Metrics:** Budget consumption, policy allow/deny counts, ledger gap rate (<0.1%), rate-limit hits, CI gate pass rate.
- **Logs:** Structured `cursor.*` events include tenant, session, checksum, decision, and reason codes.
- **Alerts:** Cost 80% (warning), 100% (block), rate-limit denial surge, missing ledger coverage for PR diff hashes, 5xx on Gateway or Proxy.
- **Retention:** Prompts → 30 days, code artifacts → 365 days, PII findings → 30 days; ledger pruning honors retention windows while preserving legal hold exports.

## Rollout Sequence

1. **Dev Bootstrap:** Deploy MC LLM Proxy with `{gpt-4.1-mini, claude-3.5-sonnet}` allow-list, configure tenant budgets, and enable ledger persistence in dev.
2. **Gateway Endpoint:** Enable `/v1/cursor/events` with policy + ledger integration; validate end-to-end flow with synthetic events.
3. **Repo Rules:** Publish `cursor/rules.md` and PR template updates to pilot repos.
4. **CI Gates:** Roll out `ai-assisted-gates` workflow to two pilot repos; confirm policy replays and failure modes (PII injection, budget exhaustion).
5. **Dashboards & Alerts:** Stand up Grafana panels and alert routes for spend, policy denies, provenance coverage, and SLO burn.
6. **Pilot Sprint:** Run one-sprint canary, collect metrics, document feedback, and tune allow-lists / thresholds.
7. **Staging & Prod:** Expand to staging, default feature flags to ON, document runbooks, and enable air-gapped path exports.

## Acceptance & Verification

- 100% of Cursor traffic observed via MC Proxy (mTLS logs, zero direct egress).
- ≥99.9% provenance coverage (ledger diff hashes vs PR diffs).
- Policy gates prevent deliberate PII injection and unauthorized model usage.
- Budget guardrails block overage with alerting at 80% thresholds.
- k6 load test meets SLO, and audit replay validates session → diff → merge lineage.

## Next Steps

- Implement MC Proxy budget enforcement + token metering using `BudgetManager` states.
- Finalize OPA bundles and integrate with PolicyEvaluator overrides.
- Wire GitHub Action + provenance decoration for ai-assisted PRs.
- Train squads, publish runbooks, and schedule production go/no-go with rollback plan.
