# Sprint 5: CompanyOS "Ledger & Lifecycle" Sprint

**Dates:** Mon **Feb 23, 2026 → Fri Mar 6, 2026**
**Theme:** _"Make tenants operable and billable."_ Metering you can trust, tenant lifecycle automation, and a thin admin console slice.

## Sprint goal

A tenant can be **provisioned → metered → invoiced (or usage reported) → suspended → reactivated → deleted** with **policy, audit, and evidence** at every step, and a basic **Admin Console** for operators.

## Success metrics (targets)

- **Provision time:** new tenant ready in **< 15 min** (staging)
- **Usage integrity:** metering pipeline produces **daily usage totals** with **< 1% missing events**
- **Lifecycle coverage:** provision/suspend/reactivate/delete all implemented + tested (deny cases too)
- **Billing artifact:** generate a **monthly usage statement** (even if no payment integration yet)
- **Auditability:** 100% lifecycle actions emit audit events + appear in disclosure pack export

---

## Epic 1 — Metering & Usage Ledger v1 (trustworthy numbers)

**Outcome:** A tamper-evident usage ledger that can feed billing or internal chargeback.

### Stories

- **MET-1:** Usage event schema + SDK helper
  **AC:** events include `tenant_id`, `service`, `metric`, `quantity`, `unit`, `timestamp`, `request_id/trace_id`, `source_signature` (or digest).
- **MET-2:** Ingestion + dedupe + ordering strategy
  **AC:** idempotent writes; dedupe by (tenant_id, event_id); late events handled with a defined window.
- **MET-3:** Daily rollups + reconciliation report
  **AC:** job produces per-tenant totals + “missing/late/invalid” counts; exportable JSON/CSV.
- **MET-4:** Policy gate for metering coverage (warn → enforce)
  **AC:** services must declare what they meter; missing declaration triggers warning this sprint.

### Evidence

- Example usage rollup for 2 tenants for 7 days
- “Metering integrity report” attached to release evidence

---

## Epic 2 — Tenant Lifecycle Automation v1 (provision/suspend/delete)

**Outcome:** Lifecycle is scripted, reversible where appropriate, and safe by default.

### Stories

- **LIFE-1:** Provisioner (tenant create)
  **AC:** creates isolated boundary + baseline policies + observability + audit hooks; produces “tenant dossier” artifact.
- **LIFE-2:** Suspend / Reactivate
  **AC:** suspend blocks auth/access + pauses workloads (or scales to zero) without deleting data; reactivation restores.
- **LIFE-3:** Delete with retention controls
  **AC:** delete respects retention policy (hard delete vs tombstone); produces compliance evidence and irreversible-step warnings.
- **LIFE-4:** Lifecycle runbooks + game-day
  **AC:** runbooks include “expected time”, “rollback steps”, “how to verify”.

### Evidence

- Full lifecycle demo log (staging) with audit trail + screenshots/exports
- Tenant dossier bundle stored in evidence depot

---

## Epic 3 — Admin Console Slice v0 (operator-grade, not pretty)

**Outcome:** Minimal UI to reduce CLI-only operational risk.

### Stories

- **ADM-1:** Tenant list + status + region + residency view
  **AC:** shows active/suspended/deleting; displays allowed regions and current deploy regions.
- **ADM-2:** Lifecycle actions with approvals
  **AC:** suspend/reactivate/delete require confirmation + (optional) approval workflow; all actions logged.
- **ADM-3:** Usage statement viewer/export
  **AC:** download monthly usage statement + integrity report per tenant.

### Evidence

- Screen recording (or screenshots) of console flows
- Access logs show least-privilege operator role use

---

## Epic 4 — Billing/Commercial Hooks v0 (no money movement yet)

**Outcome:** Ready for Stripe/ERP later, without repainting the foundation.

### Stories

- **BILL-1:** Product catalog model (plans, entitlements, limits)
  **AC:** plan maps to ABAC entitlements + quotas; stored per tenant; change audited.
- **BILL-2:** Quotas/limits enforcement (soft)
  **AC:** warn-only throttles or notices when tenant exceeds plan; events emitted for overage.
- **BILL-3:** Invoice-ready “statement pack”
  **AC:** bundle includes usage totals, plan, overages, policy hashes, audit excerpt.

### Evidence

- Statement pack generated for 2 tenants for a sample month
- ADR: “Metering → Billing boundary”

---

## Sprint cadence

- **Mon Feb 23:** Kickoff + lock usage metrics list (what we meter first)
- **Wed Feb 25:** Design review (ledger integrity + lifecycle delete semantics)
- **Fri Feb 27:** Mid-sprint demo: provision + metering events visible end-to-end
- **Tue Mar 3:** Game-day: suspend + reactivation + usage statement generation
- **Fri Mar 6:** Evidence review + “billing readiness” checkpoint (what’s missing for real charging)

---

## Key risks (and mitigations)

- **Metering disputes** → implement reconciliation + signed/digested events + clear definitions of each metric.
- **Delete semantics are legally risky** → retention policy must be explicit; default to tombstone + timed purge.
- **Admin console becomes a snowflake** → keep it thin; every UI action calls the same audited API/CLI primitives.

---

If you say **“next”** again, Sprint 6 will focus on **quota enforcement (hard), customer self-serve tenant admin, and SOC2-style evidence automation (continuous control checks + reports).**
