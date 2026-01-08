# Preview Environments Runbook

## Overview

Preview namespaces are provisioned per PR with hard TTL and budget caps. This runbook explains how to extend or destroy a preview, interpret cost estimates, and troubleshoot common issues.

## Actions

- **Extend 24h**: Click the "Extend 24h" action in the PR comment. It triggers a workflow_dispatch that bumps the TTL label and updates the countdown.
- **Destroy now**: Click "Destroy now" to immediately cordon, scale-to-zero, and delete the namespace. A cleanup sweep validates that no PVCs, LoadBalancers, or Secrets remain.

## Budget overrides

- Default budget: `$3/day` and max TTL of `72h` (configurable in `.maestro/ci_budget.json`).
- If the estimated TTL cost exceeds the allowed budget, the workflow fails unless the PR has the `preview.budget.override=true` label **and** the approver list includes the codeowner.

## Observability

- Metrics: `preview_active_total`, `preview_ttl_seconds_remaining`, `preview_cost_estimate_usd`, `preview_idle_seconds`, `preview_teardown_events_total`.
- Dashboards: `observability/grafana/dashboards/preview-fleet.json` renders a fleet view with TTL and burn rate.
- Logs/Traces: Each deploy emits a trace ID recorded in the PR comment.

## Troubleshooting

- **OPA policy failure**: Inspect the workflow logs; violations list missing labels, TTL > max, or privileged/NodePort usage. Update labels or Helm values to comply.
- **Budget breach**: Either right-size resources in `deploy/helm/intelgraph/values-preview.yaml` or add the override label with dual approval.
- **Idle auto scale-down**: If pods stay scaled to zero, hit the Wake URL provided in the PR comment; the webhook will re-scale deployments.
- **Ingress blocked**: Preview ingress is private by default. Set `preview.public=true` label with a reason-for-access annotation in Helm values to enable public reachability.

## Teardown guarantees

- Namespaces include a finalizer ensuring Services, Ingress, PVCs, and CRDs are removed.
- The janitor workflow runs every 15 minutes to reap overdue previews and confirm zero-drift.
