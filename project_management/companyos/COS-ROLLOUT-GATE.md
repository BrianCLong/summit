# COS-ROLLOUT-GATE — Argo Evidence-Gated Promotion

## Goal
Gate canary promotions at 20% and 50% rollout stages using MC `evidenceOk` signals, providing automated rollback and rich observability when quality gates fail.

## Key Outcomes
- AnalysisTemplate leveraging MC evidence API via ConfigMap + Secret token.
- Release workloads labeled with `release-id` and traced through audit logs and notifications.
- Automated rollback completing within <5 minutes when `evidenceOk=false`.
- Notification hooks (Slack/PagerDuty) reporting gate outcomes with context.

## Architecture Overview
| Component | Responsibility |
| --- | --- |
| Argo Rollouts Controller | Manages canary steps and invokes AnalysisTemplates. |
| AnalysisTemplate Job | Queries MC `evidenceOk` via ConfigMap/Secret and returns pass/fail.
| MC Evidence API | Provides current evidence status per `releaseId`.
| Notification Service | Publishes gate outcomes to Slack/PagerDuty and audit logs.
| Rollback Playbook | Defines manual override and fallback procedures.

### Promotion Flow
1. Deployment reaches 20% stage; AnalysisTemplate executes job hitting MC API with `releaseId`.
2. Job validates response signature, updates status ConfigMap, and reports pass/fail to Rollouts.
3. On pass, rollout proceeds to next step; on fail, rollout aborts and rollback automation restores stable version.
4. Notifications emitted with context (releaseId, failure reason); audit event recorded.
5. Repeat at 50% gate before full promotion.

## Implementation Plan
### Phase 0 — Preparation (Week 1)
- Confirm dependency on COS-EVIDENCE-PUB and ensure evidence signals reliable in staging.
- Provision MC API token via External Secrets and create ConfigMap template for AnalysisTemplate parameters.

### Phase 1 — Template & Integration (Week 1)
- Author AnalysisTemplate (webhook/job provider) that authenticates to MC and evaluates `evidenceOk`.
- Update rollout manifests to include `release-id` labels propagated from CI/CD pipelines.
- Add audit annotations capturing evaluation results for compliance.

### Phase 2 — Automation & Observability (Week 2)
- Configure rollback automation (Argo Rollouts rollback or Helm rollback) triggered on failure.
- Build metrics for gate pass/fail counts, evaluation latency, and rollback duration.
- Integrate Slack/PagerDuty notifications with failure context and runbook links.

### Phase 3 — Validation & Docs (Week 2)
- Run dry-run analysis with mocked responses to validate gating logic.
- Execute failure scenario causing automatic rollback; measure recovery <5 minutes.
- Publish rollback playbook and update deployment runbooks with new gating behavior.

## Work Breakdown Structure
| Task | Owner | Duration | Dependencies |
| --- | --- | --- | --- |
| Configure MC token secret | SRE | 1d | COS-EVIDENCE-PUB live |
| Author AnalysisTemplate | SRE | 2d | Secret configured |
| Update rollout manifests | SRE + App Eng | 2d | Template authored |
| Notification integration | SRE | 2d | Template authored |
| Metrics & dashboards | SRE | 2d | Notification integration |
| Rollback playbook | SRE + On-call | 2d | Validation |

## Testing Strategy
- **Dry Run**: Mock `evidenceOk=true/false` responses; ensure proper gating decisions.
- **Failure Path**: Force `evidenceOk=false` to confirm rollback occurs <5 minutes and notifications sent.
- **Integration**: Validate release-id labels propagate from CI → deployment → AnalysisTemplate.
- **Resilience**: Simulate MC API latency/timeouts to ensure retries and safe fail behavior.

## Observability & Operations
- Metrics: `rollout_gate_pass_total`, `rollout_gate_fail_total`, `rollout_gate_duration_seconds`, `rollout_gate_rollback_duration_seconds`.
- Dashboards: Gate status over time, failure reasons, rollback durations per environment.
- Alerts: Consecutive gate failures (>=3), rollback duration >5m, MC API latency >2s.

## Security & Compliance
- Store MC token in External Secrets with namespace restrictions; rotate every 60 days.
- Log gate evaluations with trace IDs for compliance audits.

## Documentation & Enablement
- Update deployment runbooks with gating behavior, manual override steps, and contact tree.
- Provide training session for on-call and release managers on interpreting gate failures.
- Share sample MC response payloads for troubleshooting.

## Operational Readiness Checklist
- [ ] Dry-run gating scenario executed with positive/negative outcomes.
- [ ] Automatic rollback tested and measured <5 minutes.
- [ ] Notifications verified in Slack/PagerDuty with correct context.
- [ ] Playbook published and linked in deployment checklist.

## Dependencies
- COS-EVIDENCE-PUB delivering timely `evidenceOk` signals.
- MC evidence API accessible from deployment environment.

## Risks & Mitigations
- **Flaky checks**: Implement retry/backoff and allow manual override with audit logging.
- **API latency**: Use timeout + circuit breaker; default to fail-safe (pause) if MC unreachable.

## Acceptance Criteria
- Gate blocks promotion when `evidenceOk=false` and records failure reasons.
- Auto-rollback restores previous stable version within <5 minutes.
- Notifications emitted for both pass and fail outcomes with release context.
- Rollback playbook validated with on-call sign-off.
