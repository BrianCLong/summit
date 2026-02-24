# PR: feat(route-opt): add deterministic ROAM module with CI reproducibility gates

## Summary

This PR introduces the Route Optimization Agent Module (ROAM), a deterministic planner for optimizing routes. It includes:
- Core planner logic with stable hashing for inputs and outputs.
- Schema validation for route plans.
- CI scripts for schema compliance and drift monitoring.
- Integration with the `agents` and `scripts` directories.

## Risk & Surface (Required)

<!-- Select the appropriate risk level and surface area. -->

**Risk Level** (Select one):

- [ ] `risk:low` (Docs, comments, safe refactors)
- [x] `risk:medium` (Feature flags, backward-compatible changes)
- [ ] `risk:high` (Database migrations, auth changes, critical path)
- [ ] `risk:release-blocking` (Critical fixes only)

**Surface Area** (Select all that apply):

- [ ] `area:client`
- [x] `area:server`
- [ ] `area:docs`
- [ ] `area:infra`
- [x] `area:ci`
- [ ] `area:policy`

## Assumption Ledger

<!-- State your assumptions, ambiguities, tradeoffs, and stop conditions. -->

- **Assumptions**: Input data follows the `route_plan.schema.json`. Determinism relies on `json.dumps(sort_keys=True)`.
- **Ambiguities**: None.
- **Tradeoffs**: Determinism requires strict sorting of inputs, potentially impacting performance for very large datasets (accepted trade-off).
- **Stop Condition**: If drift is detected in CI, the build fails.

## Execution Governor & Customer Impact

- [x] **Single Product Mode**: Respects active product (FactFlow) or includes `.exec-override`.
- [x] **Frozen Code**: Does not touch frozen products without override.
- **Customer Impact**: Improved route optimization reliability and auditability.
- **Rollback Plan**: Revert this PR; no database migrations involved.

## Evidence Bundle

<!-- Attach evidence that your change works and is safe. See docs/evidence-bundle-spec.md -->

- [x] **Tests**: New or updated tests passing? (See `agents/route_opt/tests/`)
- [ ] **Screenshots**: Attached for UI changes? (N/A)
- [x] **Evidence Generated**: Bundle attached or linked? (Drift check logs)
- [x] **Prompt Hash**: `prompts/registry.yaml` updated (if prompts changed)? (N/A)

## Security Impact

- [ ] **Security Impact**: Does this change touch auth, PII, or crypto?
  - If YES, link to [Security Triage/Backlog](docs/SECURITY_PHASE1_STARTER_PACK_BACKLOG.md).
  - No auth or PII involved.

## Green CI Contract Checklist

<!-- Must be checked before merge. See docs/governance/GREEN_CI_CONTRACT.md -->

- [x] **Lint**: Ran `pnpm lint` locally.
- [x] **Tests**: Ran `pnpm test:unit` locally.
- [x] **Determinism**: No leaked singletons or open handles.
- [x] **Evidence**: Added at least one test case or verification step.

## CI & Merge Train Rules

<!-- See docs/runbooks/CI_RELEASE_GATE_RUNBOOK.md and docs/release/DAILY_DASHBOARD.md -->

**If CI is Blocked:**

- [ ] Docs/Metadata PRs may proceed.
- [ ] Behavior changes must wait for green CI.
- [x] Do not bypass gates without written approval from Release Captain.

## Verification

<!-- How did you verify this change? -->

- [x] Automated Test (`pytest agents/route_opt/tests/`)
- [x] Manual Verification (Ran `scripts/monitoring/route-opt-drift.py`)
- [ ] Snapshot / Screenshot
