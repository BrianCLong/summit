# Targeted High-Priority Bug Fix Prompt

Use this template to gather the critical incident-response details required for a fast, safe, and reversible hotfix.

---

## Context
- **Service / component:** <name>
- **Environments impacted:** <dev|stage|prod>
- **Severity & SLO impact:** <S1 outage / p95 > target / error rate spike / data risk>
- **Start time & scope (tenants/regions):** <when, where>
- **On-call owner:** <who>

## Repro & Evidence
- **Minimal repro steps:** <steps or failing curl/test>
- **Current vs expected behavior:** <what happens vs should>
- **Logs/traces/metrics links (OTEL/Prometheus):** <links>
- **Suspected change window (commits/feature flags/deploys):** <list>

## Constraints & Risk
- **Blast radius:** <user flows, dependencies, data>
- **Data & compliance:** <PII/retention/export risk?>
- **Schema or infra change allowed?** No (if unavoidable, gate behind migration flag + explicit rollback)
- **Secrets:** no plaintext; use sealed-secrets only.

## Fix Objectives (tight scope)
- Apply smallest viable change to restore behavior.
- Prefer feature-flagged or config change over code; prefer code over schema.
- Keep fix reversible (one-line toggle or clean revert).

## What to Produce
1. **Patch** limited to affected module(s) with clear comments.
2. **Tests**
   - Unit test covering the regression (fails before, passes after).
   - Contract/e2e test for critical path: <ingest→resolve→runbook→report>.
3. **Observability**
   - Add/adjust trace spans, structured logs, and metric counters around the fix.
   - Temporary SLO burn alert tuned for this incident.
4. **Runbook note:** update detection → mitigation → verification steps.
5. **SBOM/SCA:** confirm no new criticals; dependency diffs noted.

## CI/CD & Gates
- Lint + unit + e2e + security scans must pass.
- Terraform/Helm plan (if any) attached; no drift.
- Preview environment auto-deployed from PR; smoke test URL: <url>.

## Deploy Plan (Progressive)
- **Canary:** <5–10%> for <N> minutes; watch golden signals (p95 latency, error rate, saturation).
- **Promote:** to 50% then 100% if healthy.
- **Auto-rollback criteria (any breach triggers rollback):**
  - Error rate > <X>% above baseline for <Y> mins
  - p95 latency > <target + Δ> for <Y> mins
  - SLO burn rate > <threshold> for <Y> mins
- **Feature flags default state after fix:** <on/off>; kill-switch: <flag name>.

## Acceptance Criteria (Done)
- SLOs back to baseline for <Z> hours post-deploy.
- All new tests green and quarantined flakies addressed.
- Runbook & incident timeline updated; audit trail present (who/what/why/when).
- DR posture unchanged; backups/current replicas verified (if data touched).

## Deliverables to Paste in PR
- **Root cause summary (1–3 lines):**
- **Before/after metrics screenshots:**
- **Links:** traces | dashboards | preview env | canary results
- **Rollback instructions (exact command/flag):**
- **Risk assessment (one paragraph):**
- **Sign-offs (CODEOWNERS/security/compliance):**

## Style & Safety
- No breaking public contracts; no schema change without gate.
- Idempotent migrations; dual-control on any data purge.
- Structured logs only (no PII/secrets).
- Keep patch under <N> lines if possible; split follow-ups into separate PRs.

---

### Bonus Mini-Prompts
Use these optional prompts to steer AI assistants or engineers toward focused fixes.

#### LLM Code Assistant (drop in editor)
> You are a senior engineer. Propose the smallest, safest patch to restore expected behavior for <bug>. Do not add new dependencies or change schemas. Keep changes scoped to <files/dirs>. Add one unit test reproducing the bug and one e2e/contract test for the user path <path>. Add OTEL spans and structured logs at the decision point. Provide: (1) unified diff, (2) test diffs, (3) brief risk notes, (4) rollback steps (single revert or flag toggle). No placeholder code.

#### PR Title (Conventional Commit)
> fix(<component>): restore <expected behavior> under <condition>; add tests + canary guardrails

#### Hotfix Release Notes (user-visible)
> Impact: <who/where> • Symptom: <what users saw> • Resolution: <what changed> • Risk: <low/med/high> • Rollback: <how> • Status: Deployed via canary; SLOs normal.

## Optional Helper
If you provide the service, symptom, and environment, we can auto-fill this template with stack-specific defaults.
