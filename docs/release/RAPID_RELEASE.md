# Rapid Release Path (Guarded)

A disciplined, high-velocity release path that keeps production stable while enabling fast iteration on field feedback.

## Release Classifications

- **Patch:** Backward-compatible fixes with zero schema/API changes; no scope creep allowed. Target P0/P1 fixes or observability guardrail additions.
- **Minor:** Backward-compatible feature updates, limited UX changes, additive APIs. Requires broader regression coverage and doc updates.
- **Major:** Breaking changes, migrations, deprecations, or cross-cutting refactors. Requires formal rollout plan and customer readiness checks.

## Gates by Class

| Stage                         | Patch                            | Minor                         | Major                                         |
| ----------------------------- | -------------------------------- | ----------------------------- | --------------------------------------------- |
| Evidence of issue             | Required (linked to intake card) | Required                      | Required                                      |
| Owner + backup                | Required                         | Required                      | Required                                      |
| Tests added/updated           | Mandatory regression proof       | Mandatory regression proof    | Mandatory regression proof + migration tests  |
| `verify-regression-safety` CI | MUST pass                        | MUST pass                     | MUST pass                                     |
| Additional CI                 | Lint/unit affected scope         | Full affected packages        | Full suite + migrations                       |
| Approvals                     | Release Captain + DRI            | Release Captain + domain lead | Release Captain + domain lead + product owner |
| Rollback plan                 | Documented, tested               | Documented                    | Documented + staged rollout                   |
| Changelog                     | Required                         | Required                      | Required + customer notice                    |

## Fast Patch Lane

- **Eligibility:** P0/P1 regressions, SLA breaches, security fixes, or severe cost/performance anomalies with contained blast radius.
- **Non-eligibility:** Feature scope, refactors, or any change without crisp reproduction/evidence.
- **Process:**
  1. Card marked `fast-patch` with linked evidence and owner.
  2. Implement minimal fix plus targeted verification (unit/integration/synthetic probe).
  3. Run `verify-regression-safety` and scoped CI; no additional scope allowed.
  4. Release Captain approval; deploy via patch train with rollback validated.

## Regression Proof (non-negotiable)

Every fix must add or update at least one verification artifact:

- Automated test (unit/integration/e2e) covering the failure mode.
- Synthetic probe or alert tuned to detect recurrence (latency/error/cost/policy denial).
- Dashboard panel with baseline and threshold clearly defined.
- If unable to automate, document manual verification steps and schedule automation within the next sprint.

## Deployment & Verification Flow

1. **Pre-deploy:** Validate gates, confirm rollback (feature flag or hotfix image), ensure changelog entry drafted.
2. **Deploy:** Ship through standard pipelines; fast patch lane uses the minimal train with auto-promote blocked on health.
3. **Post-deploy:** Monitor regression signals for at least one full traffic cycle; attach evidence links to intake card.
4. **Close-out:** Update intake card status to `shipped`, keep regression probes in place, and hand off to `CLOSURE_PROCESS.md` for customer confirmation.

## Controls & Audits

- No bypassing CI; emergency exceptions require post-incident RCA and governance approval.
- All releases labeled `patch` / `minor` / `major` in release metadata and PR labels.
- Release logs must include build artifact hash, tests executed, and verification evidence links.
