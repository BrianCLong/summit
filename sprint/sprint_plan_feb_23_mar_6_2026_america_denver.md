# CompanyOS Sprint Plan — Feb 23–Mar 6, 2026 (America/Denver)

**Theme:** Tenant Isolation + White-Label Controls — turn CompanyOS into a safe multi-tenant product with hard isolation, per-tenant policy bundles, per-tenant audit exports, and branding/config knobs that avoid forks.

## Sprint Window

- **Start:** Mon Feb 23, 2026
- **End:** Fri Mar 6, 2026
- **Cadence:** 2 weeks

## Outcomes by Mar 6

### Track A — Now-Value

1. **Tenant Admin Console v0:** create/disable tenant, rotate tenant keys, set region + data class defaults.
2. **Per-tenant audit export:** one-click export of audit + run receipts + disclosure pack evidence for a time window.

### Track B — Moats

3. **Hard tenant isolation in data + compute:** enforced at every entry point, tested, and measurable.
4. **Per-tenant policy bundles:** OPA policies compiled/configured per tenant (limits, regions, features).
5. **White-label config without forks:** branding + feature flags + limits delivered as tenant config.

## Epics, Stories, and Acceptance Criteria

### Epic 19 — Tenant Identity & Isolation (Foundation)

**Goal:** No cross-tenant reads/writes—even by accident.

- **E19.S1 — Tenant context propagation**
  - **AC:** Every request/run carries `tenant_id` end-to-end (API → services → jobs → audit). Missing tenant_id = hard fail.
- **E19.S2 — Data partitioning guardrails**
  - **AC:** Storage keys/queries require tenant partition key; cross-tenant query attempts are denied and logged.
- **E19.S3 — Isolation test harness**
  - **AC:** Automated tests prove tenant A cannot access tenant B resources across: API, runs, exports, and audit.

**Evidence artifacts:** ADR (tenant model), isolation tests, denial log samples.

### Epic 20 — Per-Tenant Policy Bundles (OPA v1)

**Goal:** Tenants get tailored constraints without code forks.

- **E20.S1 — Policy bundle compilation per tenant**
  - **AC:** Policy bundle includes tenant limits (regions, data classes, feature access); bundle hash is recorded in run receipts.
- **E20.S2 — Policy distribution + caching**
  - **AC:** Services fetch correct bundle by tenant_id; cached safely; changes roll out with versioning and audit.
- **E20.S3 — Policy change audit + rollback**
  - **AC:** Policy updates create an auditable event; rollback restores previous bundle deterministically.

**Evidence artifacts:** Policy bundle version log, rollback test, policy unit tests.

### Epic 21 — Tenant Admin Console v0 (Operational Control)

**Goal:** Basic tenant lifecycle & guardrails.

- **E21.S1 — Tenant create/disable**
  - **AC:** Tenant can be created with defaults (region/data class/limits) and disabled (blocks logins + runs).
- **E21.S2 — Tenant key/material rotation hooks**
  - **AC:** Rotation produces evidence event + affects new artifacts; old artifacts remain verifiable.
- **E21.S3 — Tenant limits & quotas (v0)**
  - **AC:** At least one quota enforced (e.g., max exports/day or max runs/hour) with clear error messages.

**Evidence artifacts:** Runbook (tenant ops), demo script, quota tests.

### Epic 22 — Per-Tenant Audit Export + Disclosure Evidence Pack (v0)

**Goal:** Compliance deliverable per customer, on demand.

- **E22.S1 — Export window & filters**
  - **AC:** Export by date range + actor + action types; includes run receipts, policy decisions, signature refs.
- **E22.S2 — Tamper-evident audit bundle**
  - **AC:** Export manifest is checksummed and signed; verify fails closed on modification.
- **E22.S3 — Access controls**
  - **AC:** Only tenant admins with step-up can export; export events are audited.

**Evidence artifacts:** Golden audit bundle fixtures, verification tests, step-up enforcement tests.

### Epic 23 — White-Label Configuration (No Forks)

**Goal:** Branding/feature toggles delivered via config and policy, not branches.

- **E23.S1 — Branding config**
  - **AC:** Tenant config controls logo/name/colors (minimal), and is applied at runtime without rebuild.
- **E23.S2 — Feature flags per tenant**
  - **AC:** Flags controlled via tenant config + policy; flags are auditable and have expiry metadata.
- **E23.S3 — “Safe defaults” template**
  - **AC:** New tenant gets a hardened baseline (regions restricted, conservative quotas, strict redaction preset).

**Evidence artifacts:** Config schema doc, flag expiry enforcement, tenant baseline template.

## Committed vs Stretch

### Committed (must ship)

- E19.S1–S2 (tenant context + data partitioning guards)
- E20.S1 (per-tenant policy bundle compile + hash in receipts)
- E21.S1 (tenant create/disable)
- E22.S1–S2 (audit export + tamper-evident bundle)
- E23.S2 (feature flags per tenant via config+policy)

### Stretch (if stable)

- E19.S3 (isolation harness expansion)
- E20.S2–S3 (distribution + rollback)
- E21.S2–S3 (key rotation + quotas)
- E22.S3 (step-up controls polish)
- E23.S1 + E23.S3 (branding + safe defaults template)

## Portfolio Allocation

- **35%** Tenant isolation (E19)
- **25%** Per-tenant policy bundles (E20)
- **20%** Tenant admin console (E21)
- **15%** Audit export deliverable (E22)
- **5%** White-label polish (E23)

Guardrail: if tenant isolation isn’t provably correct, pause white-label polish to finish isolation + tests.

## Ceremonies & Milestones

- **Mon Feb 23:** Kickoff; pick reference tenant; finalize tenant context contract.
- **Wed Feb 25:** Design review (policy bundle distribution + data partition strategy).
- **Tue Mar 3:** Evidence review (isolation tests, audit bundle verification).
- **Fri Mar 6:** Demo + evidence audit.

## Demo Script (Mar 6)

1. Create Tenant A and Tenant B; prove B cannot access A (tests + live deny).
2. Change Tenant A policy (e.g., region restriction) and show immediate effect with audit trail.
3. Export Tenant A audit bundle for last 24h; verify signatures + manifest integrity.
4. Toggle a per-tenant feature flag—no redeploy, policy-controlled, and auditable.

## Follow-on Planning

If more detail is needed for subsequent sprints, extend with the 8-sprint rail plan (multi-tenant maturity → billing hooks → marketplace integrations → compliance packs such as SOC2/ISO evidence automation).
