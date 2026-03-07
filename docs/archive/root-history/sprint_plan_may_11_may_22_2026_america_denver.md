# Sprint Plan — May 11–22, 2026 (America/Denver)

> **Theme:** “Turn extensions into ARR” — convert the Adapter SDK + bundle format into a repeatable partner ecosystem with certification, registry publishing, governance, and monetization.

---

## 1) Sprint Goal (SMART)

Enable partners to certify, publish, and monetize adapters safely so tenants can install with governed approvals and clear billing. Success means **partner publish → certified → registry listing in <48 hours**, **≥90%** of certified adapters passing contract + security gates, **dual-control install approvals** available for high-risk adapters, and **at least one paid adapter SKU** showing in invoice-ready reports.

---

## 2) Target Outcomes & Verification

- **Partner publish flow:** Submit → certify → publish in **<48 hours**.  
  _Verify:_ Certification pipeline timestamps + registry listing SLA dashboards.
- **Quality:** **≥90%** of certified adapters pass contract tests and security scanning (signed bundle, SBOM, no critical vulns).  
  _Verify:_ Certification receipts, SBOM scans, harness contract test reports.
- **Governance:** Tenant admins can review/approve installs with rationale and dual-control when required.  
  _Verify:_ Switchboard approval receipts with rationale + dual-approver audit entries.
- **Monetization:** Meter adapter usage and surface at least **one paid adapter SKU** end-to-end (invoice-ready).  
  _Verify:_ Usage meter export with SKU line items; invoice-ready report includes paid SKU charges.
- **Sandboxing:** Adapter execution constrained (timeouts, network policy, secrets scope) with auditable enforcement.  
  _Verify:_ Policy profiles applied per adapter; violation alerts + receipts recorded.

---

## 3) Scope (What Ships)

### Epic A — Partner Certification Program v1

- **A1. Certification checklist + automated pipeline**
  - Gates: signed bundle verification, SBOM + vulnerability scan (no critical), SDK contract tests, policy permission review, performance budgets (CPU/memory/time).
  - Output: “Certified” badge and signed certification receipt bundle.
- **A2. Partner portal (lightweight)**
  - Submit bundle + metadata, view certification results/failures, publish approved versions (UI or API-first with Switchboard admin view).

### Epic B — Adapter Registry + Publishing Workflow v1

- **B1. Registry features:** Versioned listings, changelog + compatibility metadata, deprecation/yanking (policy-gated), signed registry index.
- **B2. Tenant install sources:** Source types per tenant (official, partner, private) with policy to restrict sources for regulated tenants.

### Epic C — Governance at Scale (Review + Approvals + Sandbox Enforcement)

- **C1. Install/upgrade review workflow:** Request install/upgrade → show permissions diff + risk score → require rationale → dual-control for high-risk adapters; receipts link request → approvals → install → enable.
- **C2. Sandbox policies:** Network egress profiles (deny all, allowlist domains, internal-only); secrets scope (tenant-, adapter-, environment-scoped); hard enforcement with observable violations.

### Epic D — Monetization: Adapter SKUs + Metering + Invoicing

- **D1. Adapter usage metering:** Track invocations, runtime seconds, data processed, external call counts (redacted); tenant usage report includes adapter line items.
- **D2. Paid adapter SKU (pilot):** Define one paid adapter tier (e.g., “Advanced Notary,” “WORM Archive Export,” or “Private Webhook Relay”); enforce entitlements via flags/quotas/policy obligations; invoice-ready export includes SKU + usage.
- **D3. Revenue share hooks (v0):** Track publisher ID + SKU mapping; export partner payout report (CSV) even if payouts are manual initially.

### Explicit Non-goals

- Full public billing checkout for marketplace purchases.
- Fully automated payouts (only payout reporting in scope).

---

## 4) Definition of Done (Hard Gates)

- Certification pipeline runs on every submitted adapter bundle and produces a signed result bundle.
- Registry index is signed; installs verify both index and bundle signatures.
- Switchboard review workflow includes permissions diff, rationale capture, and dual-control gates for high-risk adapters.
- Sandbox enforcement is measurable with alerts on violations.
- At least one paid adapter SKU is metered, enforceable, and present in invoice-ready export.
- Runbooks exist: registry outage, certification failures, sandbox violation response, adapter rollback.

---

## 5) Sprint Demo (Live Scenario)

1. Partner submits adapter → certification pipeline runs → results + receipts produced.
2. Admin approves publish → registry version appears with signed index update.
3. Tenant requests install → permissions diff + dual-control approval captured.
4. Adapter runs under sandbox policy → receipts + metering emitted.
5. Invoice-ready report shows adapter SKU + usage.
6. Partner payout report exported for revenue share.
