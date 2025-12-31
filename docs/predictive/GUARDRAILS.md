# Guardrails: Policy, Cost, and Safety Controls

All predictive operations must enforce policy, cost, and safety controls before execution. Fail closed on any violation.

## Access & Authorization

- **Who can request:** Limited to authenticated roles with `predict:read` or `predict:admin` scopes; tenant-level predictions require tenant scoping.
- **Allowed predictions:** Only classes listed in `PREDICTION_CATALOG.md` with an active contract version.
- **Rate limits:**
  - Global: default 60 requests/min across tenants, burst 2x.
  - Per-tenant: 10 requests/min; can be lowered by policy.
  - Per-user: 5 requests/min for human users.
- **Budget checks:** Evaluate policy budget and cost ceiling before feature extraction.
- **Data residency & RBAC:** Enforce locality constraints and deny cross-tenant feature leakage.

## Cost Caps

- **Per prediction request:** Hard cap on compute/runtime and external API/model spend; deny if estimate exceeds cap.
- **Per tenant/day:** Aggregate spend ceiling; refuse further requests upon breach and emit audit event.
- **Per horizon:** Higher horizons (e.g., 7d for cost) carry stricter caps.

## Fail-Closed Defaults

- Deny execution on missing provenance (policy bundle hash, model snapshot, pricing sheet).
- Deny execution on telemetry gaps beyond thresholds defined in contracts.
- Deny execution if kill-switch is active (`predictions.global.disabled=true`).
- No silent degradation: every denial must return reason + remediation path.

## Audit & Logging

- Emit structured audit event with requester, tenant, purpose, prediction class, contract version, policy bundle hash, cost consumed/estimated, and decision (allow/deny).
- Persist provenance hash and replay token for every prediction.
- Log policy evaluation results and budget checks; escalate violations to governance channel.

## Verification Tests

- **Access tests:** Ensure unauthorized roles are denied and audited.
- **Rate-limit tests:** Simulate bursts per tenant/user and verify throttling.
- **Cost-cap tests:** Validate per-request and per-tenant/day caps; ensure denial paths emit reasons.
- **Fail-closed tests:** Break telemetry or remove provenance to confirm hard failures.
- **Policy-binding tests:** Confirm predictions cannot run with unpinned policy bundles.
