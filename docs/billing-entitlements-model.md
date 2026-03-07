# Billing & Entitlements Model v0

## 1) Usage & Metering Model

### Billable units

- **Seats**: named user seats with role metadata (admin, builder, viewer) and environment tag (prod, sandbox).
- **Events**: tracked per feature domain (automation triggers, API calls, audits) with request context for tenant and environment.
- **Workflows**: executions of orchestration flows; metered per run and optionally per step for high-variance customers.
- **Storage**: logical GB stored (documents, artifacts, models) with retention policy labels.
- **Compute**: normalized compute credits (CPU sec + GPU sec) with resource class (standard, accelerated) and priority (interactive, batch).
- **Add-ons**: discrete entitlements (advanced audit, private networking, dedicated support) modeled as feature flags with quantities.

### Attribution model

- **Per tenant**: every usage record must include `tenant_id`, `billing_account_id`, and `contract_id` for downstream billing joins.
- **Per feature**: `feature_code` namespace (e.g., `automations.trigger`, `workspace.collab`, `ai.inference`) used for entitlements and overage policies.
- **Per environment**: `env` dimension (`prod`, `sandbox`, `dev`, `preview`) to segment quotas and pricing.
- **Per resource owner**: optional `user_id` and `workspace_id` to power seat-based enforcement and RBAC-aware usage analytics.

### Meter granularity & aggregation windows

- **Ingestion granularity**: raw events recorded at second-level precision; storage/compute sampled hourly; seats reconciled daily.
- **Aggregation windows**: rollups computed hourly (operational enforcement), daily (billing quality), and monthly (invoice generation).
- **Accuracy controls**: idempotent usage IDs, hash-based deduplication, late-arriving tolerance up to T+72h with backfill markers.

## 2) Plans & Entitlements

### Plan types

- **Free**: capped usage, community support, non-SLA.
- **Trial**: time-bound (e.g., 14/30 days), elevated quotas, auto-downgrade to Free unless converted.
- **Standard**: fixed price with pooled quotas and soft overage alerts.
- **Enterprise**: contract-priced, custom quotas, hard/soft enforcement per feature, SLAs, and premium add-ons.
- **Custom**: bespoke bundles that override defaults while remaining compatible with enforcement rails.

### Entitlement mapping

- Plans map to **entitlement bundles**: per-feature quota, enforcement mode, and add-on availability.
- Enforcement modes: `allow`, `grace` (allow + alert), `throttle` (rate-limit), `block` (hard stop), `billable_overage` (track & charge).
- Quotas can be **pooled** (shared across tenants) or **scoped** (per workspace/environment). Seat entitlements can mix named seats and token-based access.
- Feature visibility controlled via **feature flags** that are keyed by `tenant_id` + `plan_id` + `env`.

### Real-time effects of plan changes

- Upgrades apply immediately: refresh entitlements cache; invalidate rate-limiters; backfill feature flags with new plan payloads.
- Downgrades schedule effective time (`effective_at`) with grace window; enforce hard limits at cutoff; migrate add-ons to compliant defaults.
- Trials auto-convert: send `plan_changed` event with reason `trial-expired`; toggle enforcement to Free limits without data loss.
- Mid-cycle contract edits emit `plan_adjusted` events to rescore usage vs updated quotas.

## 3) Billing Integration

### Billing models

- **Invoicing**: monthly/annual fixed fees for seats and reserved capacity; integrate with ERP/AP automation.
- **Usage-based**: metered units (events, compute, storage) priced per unit with tiered/volume discounts.
- **Hybrid**: base subscription + usage overages + add-ons (support tiers, private networking, SSO) as recurring or one-time.

### External provider touchpoints

- Customer + payment method lifecycle synced via billing provider (e.g., Stripe) using `billing_account_id` as foreign key.
- Usage ingestion via provider metered billing APIs; retain authoritative ledger internally for reconciliation.
- Webhooks for invoice events (`invoice.upcoming`, `invoice.finalized`, `charge.failed`) feed dunning + entitlement adjustments.
- Pricing catalog stored internally; only totals/proration data stored in provider to avoid configuration drift.

### Proration, overages, grace, dunning

- **Proration**: plan upgrades/downgrades compute prorated MRR deltas; apply credit notes for downgrades; seat changes prorated to day.
- **Overages**: configurable thresholds; default to `grace` at 80/90/100%; switch to `billable_overage` or `throttle` based on plan.
- **Grace periods**: payment failures trigger configurable grace (e.g., 7 days) with progressive enforcement (warn → throttle → suspend).
- **Dunning**: webhook signals update `collection_status`; suspend premium features on `past_due` and block on `uncollectible`.

## 4) Artifacts

### Billing & Entitlements Model v0 (outline)

1. **Dimensions**: tenant, env, feature_code, contract, billing_account, user, workspace.
2. **Units**: seats, events, workflows, storage GB, compute credits, add-ons.
3. **Meters**: ingestion precision (sec/hour/day), aggregation windows (hour/day/month), dedupe + backfill policy.
4. **Plans**: Free, Trial, Standard, Enterprise, Custom with enforcement modes.
5. **Entitlements**: quotas + enforcement + feature flags + add-on availability.
6. **Lifecycle**: plan change events (`plan_changed`, `plan_adjusted`, `trial_expired`), grace handling, overage policy.
7. **Billing**: invoicing/hybrid, provider sync, proration, dunning, reconciliation.
8. **Signals**: usage rollups, entitlement cache, rate-limiters, alerts.

### Example plan definitions (pseudo-JSON)

```jsonc
{
  "plan_id": "free",
  "price": { "recurring": 0 },
  "features": {
    "seats.named": { "limit": 3, "enforcement": "block" },
    "automations.trigger": { "monthly_limit": 1000, "enforcement": "throttle" },
    "ai.inference": { "monthly_compute_credits": 50, "enforcement": "block" },
    "storage.gb": { "limit": 5, "enforcement": "block" },
    "support": { "tier": "community" },
  },
  "grace": { "overage": "alert" },
  "trial": null,
}
```

```jsonc
{
  "plan_id": "standard",
  "price": { "recurring": 40000, "period": "month" },
  "features": {
    "seats.named": { "limit": 25, "prorate": true, "enforcement": "billable_overage" },
    "automations.trigger": {
      "monthly_limit": 250000,
      "overage_rate": 0.0004,
      "enforcement": "billable_overage",
    },
    "workflows.run": { "monthly_limit": 20000, "enforcement": "grace" },
    "ai.inference": {
      "monthly_compute_credits": 5000,
      "overage_rate": 0.08,
      "enforcement": "billable_overage",
    },
    "storage.gb": { "included": 500, "overage_rate": 0.12, "enforcement": "billable_overage" },
    "add_ons": {
      "sso": { "available": true, "price": 5000 },
      "private_networking": { "available": true, "price": 15000 },
    },
    "support": { "tier": "standard" },
  },
  "grace": { "payment_failure_days": 7, "overage_thresholds": [0.8, 0.9, 1.0] },
  "trial": null,
}
```

```jsonc
{
  "plan_id": "enterprise",
  "price": { "recurring": 0, "billing": "contract" },
  "features": {
    "seats.named": { "limit": 500, "overage_rate": 20, "enforcement": "billable_overage" },
    "automations.trigger": {
      "monthly_limit": 5000000,
      "overage_rate": 0.00025,
      "enforcement": "billable_overage",
    },
    "workflows.run": { "monthly_limit": 100000, "enforcement": "billable_overage" },
    "ai.inference": {
      "monthly_compute_credits": 50000,
      "overage_rate": 0.05,
      "enforcement": "billable_overage",
    },
    "storage.gb": { "included": 5000, "overage_rate": 0.08, "enforcement": "billable_overage" },
    "add_ons": {
      "dedicated_support": { "available": true, "price": "contract" },
      "data_residency": { "available": true, "price": "contract" },
      "advanced_audit": { "included": true },
    },
    "support": { "tier": "enterprise", "sla": "99.9%" },
  },
  "grace": { "payment_failure_days": 15, "overage_thresholds": [0.85, 0.95, 1.05] },
  "trial": null,
  "custom_overrides": "per contract",
}
```

### Checklist: "Feature is billing-aware if…"

- Emits usage events with `tenant_id`, `feature_code`, `env`, `quantity`, `usage_id` (idempotent), and timestamps.
- Performs entitlement check before critical path execution and on retry paths.
- Respects enforcement mode (allow/grace/throttle/block/billable_overage) and returns actionable errors to clients.
- Updates rate-limiter tokens or quota counters in the same transaction boundary as feature-side effects.
- Surfaces user-facing messaging: remaining quota, overage pricing, and next reset timestamp.
- Supports plan change hooks (`plan_changed`, `plan_adjusted`, `trial_expired`) to refresh entitlements cache.
- Implements guardrails for sandbox vs. prod environments (separate quotas, no cross-charging).
- Produces audit logs for enforcement decisions and overage charges.
- Has monitoring dashboards for quota burn-down, error codes linked to enforcement, and dunning-triggered access changes.
