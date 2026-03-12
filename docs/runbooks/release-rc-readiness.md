# Release Candidate Readiness and Validation Contract

This runbook is the canonical merge-safe checklist for release candidate (RC) launch readiness. It consolidates go/no-go gates, rollback rehearsal proofs, post-deploy evidence requirements, and first-hour/first-day telemetry checks.

## 1) Release Gate Ownership and Artifacts

| Gate | Owner | Required command(s) | Evidence artifact(s) |
| --- | --- | --- | --- |
| Build and quality gate | Release captain | `pnpm lint && pnpm typecheck && pnpm test` | CI workflow logs |
| Golden path gate | Release captain | `make smoke` | smoke output in CI |
| Pre-release health | SRE | `bash scripts/release/pre_release_health_check.sh --report --json` | `artifacts/health-check/` |
| Evidence bundle integrity | Governance + SRE | `node scripts/release/validate-release-artifacts.mjs --dir <release_artifact_dir>` | readiness output + artifact validation logs |
| Policy and compliance | Governance | `bash scripts/release/check_governance_compliance.sh` | governance check logs |

Go/no-go rule: if any required gate fails and no approved exception exists, outcome is No-Go.

## 2) RC Launch Checklist (T-60 to T-0)

- [ ] Release candidate commit SHA and tag are frozen and documented.
- [ ] Required CI gates are green for the exact RC commit.
- [ ] Release evidence bundle is generated for the exact RC commit.
- [ ] `stamp.json` is present for time metadata; deterministic report artifacts contain no ad-hoc timestamps.
- [ ] Rollback target (previous stable version + digest) is documented in release ticket.
- [ ] On-call and incident commander are explicitly assigned for launch window.
- [ ] Dashboard links for API latency, error rate, saturation, and queue depth are attached to release ticket.

Recommended evidence bundle generation flow:

```bash
node scripts/release/generate_evidence_bundle.mjs > evidence.json
node scripts/release/validate-release-artifacts.mjs --dir .
```

## 3) Rollback Rehearsal Contract (must be proven before production cut)

Run rollback rehearsal in staging against the current RC.

### Rehearsal steps

1. Record baseline health:

```bash
bash scripts/release/pre_release_health_check.sh --report --json
```

2. Exercise rollback procedure:

```bash
bash scripts/release/canary-rollback-playbook.sh --help
bash scripts/rollback_deployment.sh <release> <namespace>
```

3. Validate rollback outcome:

```bash
bash scripts/validate-rollback.sh --verify-service-health --confirm-customer-access --detailed
```

### Required rollback proofs

- command transcript for rollback action
- service health validation output after rollback
- confirmation that stable revision serves traffic
- incident/run log reference for rehearsal

If rollback rehearsal is skipped, deployment is intentionally constrained and requires governed exception approval.

## 4) Post-Deploy Validation Contract (T+0 to T+60)

Run all four validation classes and capture evidence links in release ticket:

1. **Health**
   - service `/health` endpoints return expected status
   - no crashloop/restart anomalies in first 15 minutes

2. **Smoke**
   - run `make smoke` or environment-scoped smoke workflow
   - verify critical persisted-query path success

3. **Policy**
   - re-run governance compliance check after deploy:

```bash
bash scripts/release/check_governance_compliance.sh
```

4. **Critical path**
   - validate one end-to-end workflow (investigation to results path)

### Evidence output expectations

- Deterministic report artifact(s): check outputs and result summaries.
- Time-bearing metadata artifact(s): timestamps only in stamp/meta files.
- Release ticket must include artifact paths or workflow run URLs proving each validation class.

## 5) Operator Telemetry Checks

### First hour (T+0 to T+60)

- API error rate and latency trend
- saturation signals (CPU/memory, pod restarts)
- queue/stream lag and DLQ growth
- deployment and rollback alerts

### First day (T+1h to T+24h)

- error-budget burn trend remains inside objective
- backup/restore and scheduled jobs continue healthy
- no sustained increase in policy denials or auth failures
- no unresolved Sev1/Sev2 incidents attributable to release

## 6) Reviewer and Operator Quick Verification

A reviewer should be able to answer all four questions in under 10 minutes:

1. What changed?
2. How was it validated pre-deploy and post-deploy?
3. What evidence proves readiness?
4. What is the tested rollback path?

Required PR attachments:

- link to this runbook section used
- command list executed
- evidence artifact links
- explicit rollback trigger and rollback command
