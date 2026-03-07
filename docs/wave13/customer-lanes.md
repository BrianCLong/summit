# Customer Deployment Lanes

## Lane Structure

- Lane definition lives at `lanes/<customer>/config.yaml` with sections: `tenant_id`, `features`, `rollout`, `canary`, `policies`, `contacts`.
- Namespaces: each lane maps to dedicated Kubernetes namespace + ArgoCD app instance to isolate RBAC and secrets.
- Feature flags: toggles per lane; defaults inherit from `lanes/default/config.yaml` then overridden safely.

## Guardrails

- Configs validated by policy engine (OPA) before apply. Disallowed:
  - Disabling audit/event streams
  - Lowering auth strength (MFA/SSO) below baseline
  - Expanding network egress beyond allow-list without approval
- Violations produce actionable error message and block deploy.

## Canary & Rollback

- `canary.weight` controls traffic slice; `success_threshold` requires <1% error increase and stable latency for 30m.
- Automatic rollback triggers on SLO burn or healthcheck failure; audit log records decision and metrics.

## Audit Trail

- Each promotion writes entry to `lanes/<customer>/audit.log` with build SHA, approvers, timing, and metrics snapshot.

## Examples

```yaml
# lanes/acme/config.yaml
tenant_id: acme
features:
  search_v2: true
  privacy_budgeting: true
rollout:
  window: "Sun 02:00 UTC"
canary:
  weight: 0.2
  success_threshold: "latency_p95 < 450ms && error_rate < 0.8%"
policies:
  forbid_custom_dns: true
contacts:
  owner: acme-sre@acme.test
```
