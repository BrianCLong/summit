# Leadership Drift Runbook

## Objective

Operate the leadership drift controls so automated velocity never outruns accountable
leadership. This runbook defines flag transitions, metrics interpretation, and response
steps.

## Feature Flags

- `LEADERSHIP_DRIFT_MODE=OFF` (default)
- `LEADERSHIP_DRIFT_MODE=WARN`
- `LEADERSHIP_DRIFT_MODE=DENY`

## Enablement Sequence

1. **OFF → WARN**
   - Enable validation and metrics without blocking.
   - Confirm deterministic artifacts exist under `artifacts/leadership-drift/`.
2. **WARN → DENY (High-Risk Only)**
   - Require `presence_checkpoint` for `category=high`.
   - Monitor for false blocks and update allowlists.
3. **DENY (Expanded)**
   - Enforce DecisionRecord requirements on all categories.

## Metrics Interpretation

- `decisions_without_context`: Actions missing `context.summary`.
- `owner_unknown`: Actions missing `owner`.
- `unanswered_ownership_over_sla`: Ownership requests past SLA.

## Thresholds

- **WARN threshold**: Any non-zero spike triggers review.
- **DENY threshold**: Two consecutive intervals above baseline require escalation.

## Incident Response

**Scenario: `owner_unknown` spike**

1. Identify source workflow or agent.
2. Enforce `owner` requirement in the source.
3. Confirm DecisionRecord emissions in the audit log.

**Scenario: High-risk action blocked**

1. Validate `presence_checkpoint` provided by authorized owner.
2. Re-run with approved checkpoint.

## SLO Assumption

Leadership drift checks must not block benign actions under **WARN** mode.

## Rollback

- Set `LEADERSHIP_DRIFT_MODE=OFF`.
- Re-run the affected workflow with monitoring enabled.
