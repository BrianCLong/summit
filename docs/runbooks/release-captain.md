# Release Captain Runbook

> **Last Updated**: 2025-12-19
> **Owner**: Platform Team
> **On-Call**: @sre-team

This runbook provides comprehensive procedures for Release Captains managing the MAE release train, canary deployments, and production promotions.

## Table of Contents

1. [Overview](#overview)
2. [Release Train Schedule](#release-train-schedule)
3. [Pre-Release Checklist](#pre-release-checklist)
4. [Release Cut Procedure](#release-cut-procedure)
5. [Canary Deployment](#canary-deployment)
6. [Production Promotion](#production-promotion)
7. [Post-Merge Validation](#post-merge-validation)
8. [Rollback Procedure](#rollback-procedure)
9. [Hotfix Procedure](#hotfix-procedure)
10. [Communication Templates](#communication-templates)
11. [Incident Hooks](#incident-hooks)
12. [Break-Glass Procedures](#break-glass-procedures)

---

## Overview

### Release Train Model

We operate a **weekly release train** with scheduled cuts on Wednesdays at 17:00 UTC. This provides:

- Predictable release cadence
- Automated validation gates
- Gradual canary rollout (10% → 50% → 100%)
- Signed evidence bundles for compliance

### Key Principles

1. **Reproducibility**: Every release can be rebuilt from the same inputs
2. **Auditability**: Complete evidence trail for every deployment
3. **Reversibility**: Any release can be rolled back within minutes
4. **Safety**: Multiple gates prevent bad releases from reaching production

### Roles

| Role            | Responsibility                                            | Required For           |
| --------------- | --------------------------------------------------------- | ---------------------- |
| Release Captain | Manages release process, makes promote/rollback decisions | All releases           |
| On-Call SRE     | Approves production actions, monitors health              | 100% promote, rollback |
| Security Review | Approves security-sensitive changes                       | Security PRs           |

---

## Release Train Schedule

### Weekly Schedule

| Day       | Time (UTC) | Activity                         |
| --------- | ---------- | -------------------------------- |
| Monday    | 09:00      | Feature freeze for current train |
| Tuesday   | 17:00      | Code freeze, final testing       |
| Wednesday | 17:00      | **Release train cuts**           |
| Wednesday | 18:00      | Stage deployment + validation    |
| Thursday  | 10:00      | Production 10% canary            |
| Thursday  | 14:00      | Production 50% canary            |
| Friday    | 10:00      | Production 100% (if healthy)     |

### Freeze Windows

No production deployments during:

- Friday 17:00 UTC - Monday 09:00 UTC (weekends)
- Major holidays (see `.maestro/freeze_windows.json`)
- Active incidents (P0/P1)

---

## Pre-Release Checklist

### 24 Hours Before Release Cut

- [ ] All feature PRs merged or deferred
- [ ] CI/CD pipeline green on main
- [ ] No blocking security vulnerabilities
- [ ] SLO budget healthy (> 10% remaining)
- [ ] No pending migrations without rollback plans
- [ ] Release notes drafted

### Verify in Slack

```
@release-bot status
```

### Verify Gates Programmatically

```bash
# Check all required gates
gh workflow run release-train.yml -f dry_run=true

# Verify SLO status
curl -s https://prometheus.intelgraph.io/api/v1/query \
  -d 'query=slo:error_budget_remaining{service="api"}' | jq
```

---

## Release Cut Procedure

### Automated Cut (Normal Path)

The release train runs automatically on Wednesday at 17:00 UTC:

```yaml
# .github/workflows/release-train.yml
on:
  schedule:
    - cron: "0 17 * * 3" # Wednesday 17:00 UTC
```

### Manual Cut (If Needed)

```bash
# Trigger manual release train
gh workflow run release-train.yml

# With specific options
gh workflow run release-train.yml \
  -f dry_run=false \
  -f force_version=2.1.0
```

### What Happens During Cut

1. **Eligibility Check**: Verify all gates are green
2. **Version Calculation**: Analyze commits for semver bump
3. **Branch Creation**: Create `release/vX.Y.Z-rc.N`
4. **Image Build**: Build and sign container images
5. **Stage Deploy**: Deploy to stage environment
6. **Validation**: Run smoke tests and golden-path probes
7. **Notification**: Post to Slack/Teams

### Post-Cut Verification

```bash
# Verify release branch exists
git fetch origin
git branch -r | grep release/

# Check release candidate tag
git tag -l 'v*-rc.*' | tail -5

# Verify stage deployment
curl -sf https://api.stage.intelgraph.io/health
```

---

## Canary Deployment

### Canary Stages

| Stage | Weight         | Duration   | Auto-Advance    |
| ----- | -------------- | ---------- | --------------- |
| 10%   | 10% of traffic | Minimum 2h | Yes, if healthy |
| 50%   | 50% of traffic | Minimum 2h | Yes, if healthy |
| 100%  | All traffic    | Permanent  | N/A             |

### Promote to 10% Canary

```bash
gh workflow run release-promote.yml \
  -f version=1.2.3-rc.1 \
  -f action=promote-10
```

### Monitor Canary

**Grafana Dashboard**: `https://grafana.intelgraph.io/d/release-canary`

Key metrics to watch:

- Error rate (should be < 1% or within 2x of baseline)
- P95 latency (should be < 500ms or within 2x of baseline)
- Request rate (should be stable)

### SLO Gate Criteria

Canary advances automatically if ALL conditions are met for 5 consecutive minutes:

- Error rate ≤ 1.0%
- P95 latency ≤ 500ms
- Golden-path probes passing
- No active PagerDuty alerts

### Promote to 50%

```bash
gh workflow run release-promote.yml \
  -f version=1.2.3-rc.1 \
  -f action=promote-50
```

---

## Production Promotion

### Prerequisites

Before promoting to 100%:

- [ ] 10% canary validated (minimum 2 hours)
- [ ] 50% canary validated (minimum 2 hours)
- [ ] No SLO breaches detected
- [ ] Golden-path probes passing
- [ ] Dual approval obtained (Release Captain + On-Call SRE)

### Promote to 100%

```bash
# Requires dual approval via GitHub environment protection
gh workflow run release-promote.yml \
  -f version=1.2.3-rc.1 \
  -f action=promote-100
```

### What Happens During Promotion

1. **Guardrail Check**: Verify evidence bundle, SBOM, provenance
2. **Deploy**: Update stable deployment to new version
3. **Tag**: Create final version tag (v1.2.3)
4. **Release**: Publish GitHub release with evidence bundle
5. **Notify**: Post to channels
6. **Schedule**: Queue +24h KPI check

### Post-Promotion Verification

```bash
# Verify production deployment
curl -sf https://api.intelgraph.io/health | jq

# Check version
curl -sf https://api.intelgraph.io/health | jq -r '.version'

# Monitor error rate
watch -n 30 'curl -s https://prometheus.intelgraph.io/api/v1/query \
  -d "query=rate(http_requests_total{status=~\"5..\"}[5m])" | jq'
```

---

## Post-Merge Validation

### Objectives and Timing

- **T+0–30m (Smoke)**: Validate core paths and guardrails immediately after the merge lands on main and production deploy completes.
- **T+2h–24h (Soak)**: Observe steady-state behavior under real traffic while keeping feature flags in a controlled posture.
- **T+24h (Compliance)**: Regenerate compliance evidence to confirm no regressions in attestations, licenses, or policy-as-code checks.

### Smoke Validation (T+0–30m)

- [ ] Release Captain + On-Call SRE run `make smoke` and confirm health endpoints return `200` (`/health`, `/ready`).
- [ ] Verify golden-path probes and dashboards (SystemHUD + Grafana release-canary) show no error-rate or latency regression.
- [ ] Check for zero P0/P1 alerts in PagerDuty and confirm error budget remains > 10%.
- [ ] Document results in the release ticket with links to the successful smoke run and dashboards.

### Soak Validation (T+2h–24h)

- [ ] Maintain canary/stable split used during promotion for at least 2h of real traffic before considering flag flips.
- [ ] Monitor for p95 latency drift, sustained error rates > 1%, and queue depth anomalies; capture snapshots in the release dashboard.
- [ ] Execute one synthetic golden-path run every hour (same probes as smoke) to detect latent regressions.
- [ ] Keep feature flags in "guarded" mode (rollout < 50% or read-only) until soak completes without regression.

### Compliance Rerun (T+24h or sooner if risk identified)

- [ ] Re-dispatch the `ci-security.yml` workflow in GitHub Actions to rerun license compliance and Kubernetes CIS checks; attach the run URL in `COMPLIANCE_EVIDENCE_INDEX.md`.
- [ ] Confirm evidence bundles and SBOM artifacts remain unchanged or regenerated for the merged version; archive in `EVIDENCE_BUNDLE.manifest.json`.
- [ ] Log any deviations requiring ethics or governance review per `COMPLIANCE_CONTROLS.md` and escalate to the security-council alias.

### Rollback & Feature-Flag Strategy

- If any smoke or soak check fails, **pause all promotions**, disable launch-specific flags using the runbook in `runbooks/feature-flags.md`, and execute the rollback procedure in the next section.
- Keep kill-switch flags enabled for at least 24h post-merge so rollback can be executed without new deployments.
- For partial failures isolated to a feature, prefer flagging off that feature and re-running smoke/soak before initiating a full rollback.

### Ownership and Communications

| Owner           | Scope                                                                             | Channel                              |
| --------------- | --------------------------------------------------------------------------------- | ------------------------------------ |
| Release Captain | Orchestrates smoke/soak, signs off on completion, coordinates compliance rerun    | `#releases`, release ticket          |
| On-Call SRE     | Runs smoke jobs, monitors canary/soak health, executes rollback if required       | `#sre-alerts`, PagerDuty             |
| Compliance Lead | Triggers compliance rerun, updates evidence indices, files governance escalations | `#compliance`, evidence bundle notes |
| Feature Owner   | Confirms feature-level metrics, manages feature flags, validates functional KPIs  | Team channel, feature flag audit log |

---

## Rollback Procedure

### Rollback vs Roll-forward decision tree

Use this decision tree before triggering a rollback or a roll-forward (fix forward).
Reference the canary signals defined in [REL-1](../project_management/companyos/COS-POD-TICKET-SET.md#rel-1--adr-standard-release-strategy-v1),
and follow the rollback automation steps and thresholds in
[REL-2](../project_management/companyos/COS-POD-TICKET-SET.md#rel-2--define-release-gates--canary-thresholds).

**Decision criteria**

- **Blast radius**: If impact is widespread (multi-service or >50% traffic), prefer rollback.
  If isolated to a narrow feature path, consider roll-forward with a targeted fix or feature flag.
- **Data migration**: If the release includes irreversible or risky migrations, prefer roll-forward
  with compensating changes unless a verified down-migration exists.
- **User impact**: If users are blocked from core workflows or data integrity is at risk, rollback.
  If impact is low and can be mitigated by flags or config changes, roll-forward.
- **SLO breach**: If canary signals show sustained SLO breach per REL-1/REL-2 thresholds, rollback.
  If signals are near-threshold and stabilizing, pause promotions and roll-forward only after recovery.

**Decision flow**

1. Check canary signals (REL-1) and gate thresholds (REL-2).
2. If blast radius or user impact is high **and** SLO breach is confirmed → **Rollback**.
3. If data migration blocks rollback or impact is contained → **Roll-forward** with flags or hotfix.
4. If unclear, **pause promotion**, page on-call SRE, and reassess in 10 minutes.

### When to Rollback

Trigger rollback if ANY of these occur:

- Error rate > 2% for 5 minutes
- P95 latency > 1000ms for 5 minutes
- Golden-path probes failing
- P0/P1 incident attributed to release

### Rollback vs Roll-forward decision tree

Use this decision tree to determine whether to roll back immediately or roll
forward with a safe fix. Confirm canary signals per
[REL-1](../project_management/companyos/COS-POD-TICKET-SET.md#rel-1--adr-standard-release-strategy-v1)
before proceeding, and follow rollback automation steps in
[REL-2](../project_management/companyos/COS-POD-TICKET-SET.md#rel-2--define-release-gates--canary-thresholds).

| Decision criteria | Roll back when                                                    | Roll forward when                                                               |
| ----------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Blast radius      | Broad impact across multiple services, regions, or core workflows | Isolated to a non-critical feature or single tenant                             |
| Data migration    | Irreversible or partial migrations risk data integrity            | Forward fix can be applied without schema changes or with reversible migrations |
| User impact       | User-facing outages, auth failures, or critical UX regressions    | Minor UX issues with no data loss and clear workaround                          |
| SLO breach        | Error budget burn is rapid or SLO thresholds are breached         | SLOs are within guardrails and trending stable                                  |

**If any "Roll back when" criteria are true**, initiate rollback and pause
promotion. **If all are "Roll forward when"**, prioritize a hotfix with guarded
feature flags, then re-run smoke/soak validation.

### Auto-Rollback

The system automatically rolls back if SLO gates fail during canary. When this happens:

1. Canary pods are terminated
2. Traffic returns to stable version
3. Kill-switch feature flags are disabled
4. Incident issue is created
5. Slack/Teams notification is sent

### Manual Rollback

```bash
# Rollback to previous version
gh workflow run release-promote.yml \
  -f version=1.2.3-rc.1 \
  -f action=rollback \
  -f rollback_to=1.2.2
```

### Post-Rollback Checklist

- [ ] Verify stable version is serving traffic
- [ ] Run golden-path probes
- [ ] Check error rate returned to baseline
- [ ] Update incident ticket
- [ ] Post in #releases channel
- [ ] Schedule post-mortem if needed

### Helm Rollback (Break-Glass)

If GitHub Actions is unavailable:

```bash
# Direct Helm rollback
kubectl config use-context production
helm rollback api -n production
helm rollback web -n production

# Verify
kubectl -n production rollout status deployment/api
```

---

## Hotfix Procedure

### When to Use Hotfix

Use hotfix for:

- Critical security vulnerabilities
- P0/P1 production incidents
- Urgent bug fixes affecting > 10% of users

**DO NOT use hotfix for**: Features, non-critical bugs, refactoring

### Hotfix Process

1. **Create Fix PR**: Cherry-pick or create fix on main
2. **Get Approval**: Security review if needed
3. **Trigger Hotfix**:

```bash
gh workflow run release-hotfix.yml \
  -f base_version=1.2.3 \
  -f commits=abc123,def456 \
  -f justification="Critical auth bypass fix - INC-1234"
```

### Hotfix Constraints

- Only `fix:` and `chore(security):` commits allowed
- Stricter performance thresholds (0.5% error rate, 400ms p95)
- Reduced canary duration (stage only)
- Evidence bundle still required

---

## Communication Templates

### Release Train Cut

```
:train2: **Release Train v{VERSION} Cut**

The weekly release train has been cut.

**Version**: v{VERSION}-rc.1
**Commits**: {COUNT} commits since v{PREV_VERSION}
**Stage**: Deployed and validated

**Next Steps**:
1. Review release notes: {RELEASE_URL}
2. Production 10% canary: Tomorrow 10:00 UTC
3. Full promotion: Friday 10:00 UTC (if healthy)

**Highlights**:
{HIGHLIGHTS}

:link: [Release Notes]({RELEASE_URL}) | [Grafana]({GRAFANA_URL}) | [Runbook](./runbooks/release-captain.md)
```

### Canary Progress

```
:chart_with_upwards_trend: **Canary Update: v{VERSION}**

**Stage**: {10%|50%|100%}
**Duration**: {DURATION}
**Status**: {Healthy|Warning|Rolling Back}

**Metrics**:
• Error Rate: {ERROR_RATE}% (target: < 1%)
• P95 Latency: {LATENCY}ms (target: < 500ms)
• Throughput: {RPS} req/s

:link: [Dashboard]({GRAFANA_URL})
```

### Rollback Notification

```
:rewind: **ROLLBACK: v{VERSION}**

**Reason**: {REASON}
**Rolled Back To**: v{PREV_VERSION}
**Incident**: {INCIDENT_URL}

**Timeline**:
• {TIME_DETECTED} - Issue detected
• {TIME_ROLLBACK} - Rollback initiated
• {TIME_RECOVERED} - Service recovered

**Action Items**:
- [ ] Investigate root cause
- [ ] Update incident ticket
- [ ] Schedule post-mortem

:link: [Incident]({INCIDENT_URL}) | [Grafana]({GRAFANA_URL})
```

### Hotfix Deployed

```
:fire_engine: **HOTFIX: v{VERSION}**

**Base Version**: v{BASE_VERSION}
**Justification**: {JUSTIFICATION}
**Linked Incident**: {INCIDENT_URL}

**Changes**:
{CHANGES}

**Status**: Deployed to production

:link: [Release]({RELEASE_URL}) | [Grafana]({GRAFANA_URL})
```

---

## Incident Hooks

### Automatic Incident Creation

When auto-rollback triggers, an incident is automatically created:

```yaml
labels: [incident, release, auto-rollback]
assignees: [@release-captain, @oncall-sre]
```

### PagerDuty Integration

Rollbacks trigger PagerDuty alerts if:

- Error rate spike detected during canary
- Multiple consecutive probe failures
- SLO budget exhausted

### Slack Integration

Auto-posts to:

- `#releases` - All release activities
- `#incidents` - Rollbacks and issues
- `#sre-alerts` - PagerDuty escalations

---

## Break-Glass Procedures

### When to Use Break-Glass

Use break-glass when:

- Normal processes are unavailable (GitHub outage)
- Time-critical response needed (active incident)
- Automation has failed

### Break-Glass Approval

1. Notify `#incidents` channel
2. Get verbal approval from on-call manager
3. Document action in incident ticket
4. Execute with audit logging

### Direct Kubernetes Access

```bash
# Emergency deployment update
kubectl -n production set image deployment/api \
  api=ghcr.io/brianclong/summit/api:v{VERSION}

# Emergency rollback
kubectl -n production rollout undo deployment/api

# Check status
kubectl -n production rollout status deployment/api
```

### Direct Helm Access

```bash
# View current release
helm -n production list

# Rollback to previous revision
helm -n production rollback api

# Deploy specific version
helm upgrade --install api ./charts/server \
  -n production \
  --set image.tag=v{VERSION} \
  --atomic \
  --timeout 5m
```

### Post-Break-Glass

After using break-glass:

1. Document all actions taken
2. Create audit trail entry
3. Trigger evidence bundle generation manually
4. Review with team in next sync

---

## Appendix

### Useful Commands

```bash
# View release history
git tag -l 'v*' --sort=-v:refname | head -20

# Compare releases
git log v1.2.2..v1.2.3 --oneline

# Check workflow runs
gh run list --workflow=release-train.yml -L 10

# View release evidence
gh release view v1.2.3 --json assets

# Monitor SLO
promql 'slo:error_budget_remaining{service="api"}'
```

### Contacts

| Team     | Slack          | PagerDuty       |
| -------- | -------------- | --------------- |
| Platform | #platform-team | platform-oncall |
| SRE      | #sre-team      | sre-oncall      |
| Security | #security-team | security-oncall |

### Related Documentation

- [Release Train Workflow](.github/workflows/release-train.yml)
- [Canary Rollout Runbook](./release/canary-rollout.md)
- [SLO Configuration](.ci/config/slo.yml)
- [Versioning Guide](../docs/release/versioning.md)
- [Evidence Bundle Schema](../docs/release/evidence-schema.md)

---

_This runbook is version controlled. Submit PRs for updates._
_Last reviewed: 2025-12-19_
