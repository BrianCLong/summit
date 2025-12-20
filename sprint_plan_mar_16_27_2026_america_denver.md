# Sprint 7 — GA Launch Readiness + Partner Onboarding + Pipeline-to-Revenue (Mar 16–27, 2026 — America/Denver)

> **Theme:** “Close the loop: sell → onboard → operate → renew.” Ship the GA launch kit (hosted + white-label), prove upgrade/rollback safety, and deliver the first 30-day playbooks so paid customers can be onboarded confidently.

---

## 1) Target Outcomes (measurable)

- **GA checklist:** 100% complete (security, ops, docs, pricing enforcement, support).
- **Onboarding time:** new tenant → production-ready in **< 60 minutes** (hosted) and **< 1 day** (white-label).
- **Supportability:** p95 time-to-triage **< 10 min** via Switchboard (runbooks + diagnostics).
- **Upgrade reliability:** zero-downtime upgrade path documented/tested; rollback < 15 min with receipts.
- **Commercial readiness:** signed-off MSA/SLA template, support tiers, and quote-to-invoice flow (manual send acceptable).

---

## 2) Scope (ships this sprint)

### Epic A — GA Launch Gate: “No surprises” release hardening

- **A1. Release candidate pipeline (RC):** release channels `rc → ga`, policy-gated promotion with receipts, automated smoke + synthetic flows required for promotion.
- **A2. Upgrade + migration playbooks:** Helm/Terraform upgrades with version constraints; backward-compat contract tests for APIs/receipts; one-click rollback + data-safe rollback guidance.
- **A3. GA quality sweep:** critical-path test coverage ≥80% for privileged flows; security scan gates (no critical vulns); performance baseline recorded vs Sprint 6.

### Epic B — Partner onboarding kit v1 (hosted + white-label)

- **B1. Partner “Getting Started” workflow:** tenant template wizard (IdP OIDC, SCIM mapping, policy profile selection, region/retention presets) that generates a signed “Tenant Setup Receipt Bundle.”
- **B2. Integration validation suite:** preflight checks for OIDC claims/token scoping, SCIM provisioning health, storage + notary connectivity; results shown in Switchboard with actionable fixes.
- **B3. White-label installer UX:** opinionated defaults + known-good values files; offline install notes + upgrade path.

### Epic C — Support & SRE operations: make Switchboard the cockpit

- **C1. Incident hub v1:** incident creation from alerts; attach traces/log links + receipts bundle; runbook suggestions based on symptom signatures (rules-based).
- **C2. Customer-facing status & comms:** status page integration/internal status endpoint; incident update templates + postmortem template; exportable incident evidence bundle.
- **C3. SLO reporting to customers:** per-tenant SLO report export (monthly) with error budget summaries, key incidents, and remediation receipts.

### Epic D — Commercial plumbing: quote → enforce → report → invoice-ready

- **D1. Pricing enforcement:** tier entitlements map verified against pricing sheet; quotas/limits/feature flags honored; overage policy (hard stop vs soft throttle) per tier.
- **D2. Invoice pack v1:** invoice-ready PDF/CSV export with usage, allocated costs, tier, add-ons, overages, and generation receipts.

---

## 3) Explicit Non-goals

- Full self-serve card payments (stick to “invoice-ready + manual billing”).
- Full CRM automation (only operational/reporting hooks).

---

## 4) Definition of Done (GA-grade)

- GA release candidate promoted with evidence: SBOM/SLSA/signatures, SLO proof, and smoke tests.
- Onboarding kit works end-to-end for a brand-new partner tenant (OIDC + SCIM + policy + region + retention).
- Upgrade + rollback tested in staging with receipts + runbooks; rollback completes in <15 minutes.
- Support playbooks validated via game-day: triage → mitigation → postmortem export.
- Invoice pack matches pricing model, is tenant-scoped, and is auditable.

---

## 5) Sprint Demo (live scenario)

1. Create tenant from template → validate OIDC/SCIM/storage/notary.
2. Run activity → capture receipts + metering.
3. Trigger alert → open incident in Switchboard → follow runbook → resolve.
4. Export incident evidence bundle + monthly SLO report + invoice-ready usage report.
5. Promote RC → GA with policy-gated release receipts.

---

## 6) Risks & Mitigations

- **Upgrade surprises:** enforce contract tests + version constraints; dry-run rollback rehearsals with timestamps and receipts.
- **Onboarding delays:** preflight validation blocks go-live until IdP/SCIM/storage/notary checks pass; provide defaults for white-label installer.
- **Support gaps:** Switchboard playbooks auto-suggested by symptom signatures; evidence bundle export for fast triage handoffs.
- **Commercial drift:** entitlements-to-pricing matrix codified; invoice exports carry generation receipts and totals cross-checks.
