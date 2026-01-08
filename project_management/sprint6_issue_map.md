# Sprint 6 Issue Map — Fundability Pack + GA Pricing + Sales-Ready Reference Architecture

**Sprint window:** Mon Mar 2, 2026 → Fri Mar 13, 2026 (America/Denver)  
**Theme:** “Make it buyable + investable” — ship quote-ready pricing, reference architecture, demo collateral, and unit economics evidence.  
**Tracking:** GitHub Projects (Projects v2) — board name `Sprint 6 – Fundability Pack`. Issue key prefix `S6-<Epic>-<Story>` (e.g., `S6-E1-S1`).

## Artifact anchors

- `fundability/deck_v1/` — Investor/Fundability deck source + PDF.
- `fundability/security_posture_v1.{md,pdf}` — Security posture brief.
- `fundability/compliance_roadmap_v1.{md,pdf}` — Compliance roadmap brief.
- `fundability/demo_script_v1.md` + `demo/seed_bundle_v1/` — Sales demo script + demo tenant bundle.
- `fundability/reference_architecture_v1/` — Internal / White-Label / Hosted SaaS diagrams + explainers.
- `fundability/unit_econ_model_v1.xlsx` + `fundability/unit_econ_model_v1/README.md` — TCO + unit economics model.
- `fundability/ga_pricing_v1.md` — GA pricing proposal + meter/quota mapping. Sample invoice export: `reports/invoicing/sample_invoice_v1.csv`.

## Epic E1 — GA Pricing + Metering Alignment

**Goal:** GA-ready pricing sheet with enforceable quotas and invoice exports tied to live meters.

#### S6-E1-S1 — SKU-to-meter mapping + pricing sheet (Docs)

- **Artifacts:** `fundability/ga_pricing_v1.md`
- **Acceptance checklist:**
  - [ ] Each Hosted SaaS/Enterprise/White-Label/Internal line item mapped to an existing meter/quota/report field, or a gap ticket filed with owner and ETA.
  - [ ] Pricing sheet includes included units, overage rules, enforcement hooks, and receipt references per SKU.
  - [ ] Pricing examples cover at least one Pro and one Enterprise tenant with annotated calculations.

#### S6-E1-S2 — Meter coverage + quota enforcement (Backend/Telemetry)

- **Artifacts:** Meter definitions and quota configs in `services/cost` and `packages/cost-guard/` (or owning service), plus receipts.
- **Acceptance checklist:**
  - [ ] Missing meters added with unit, dimension (tenant/seat/ingest/query), and sampling strategy documented.
  - [ ] Quotas/limits enforceable per tenant/tier with alerting and receipts; default tiers match pricing sheet.
  - [ ] Meter values reconcile against at least one known-good dataset or sampled invoices with ≤5% variance.

#### S6-E1-S3 — Invoice-ready export

- **Artifacts:** `reports/invoicing/sample_invoice_v1.csv` + export job in `services/cost` (or owning reporting job).
- **Acceptance checklist:**
  - [ ] Export produces per-tenant, per-line-item totals with meter quantity, price, discounts/credits, and taxes.
  - [ ] Output includes evidence links (receipts, dashboards) and is reproducible for any tenant/date range.
  - [ ] Validation script compares export totals to metering store for at least one tenant (document the check in `fundability/ga_pricing_v1.md`).

## Epic E2 — Unit Economics + TCO Model

**Goal:** CFO-ready TCO/unit economics model grounded in telemetry with ≥95% attribution accuracy.

#### S6-E2-S1 — Daily tenant COGS attribution job

- **Artifacts:** Job/config in `services/cost` (or `packages/cost-guard/`), outputs in `reports/cogs/daily/`.
- **Acceptance checklist:**
  - [ ] Job ingests infra/metering costs daily and attributes ≥95% of spend to tenants with confidence scores.
  - [ ] Handles shared costs via documented allocation rules (e.g., per-tenant weightings) and emits receipts.
  - [ ] Backfill for last 30 days stored in `reports/cogs/daily/` with checksum/signature.

#### S6-E2-S2 — Unit economics model + README

- **Artifacts:** `fundability/unit_econ_model_v1.xlsx`, `fundability/unit_econ_model_v1/README.md`.
- **Acceptance checklist:**
  - [ ] Model pulls from daily COGS exports; tabs for per-tenant, per-seat, ingest-unit, and query-credit costs.
  - [ ] Sensitivity sliders for retention, region, egress, and signature/notary cost adjust outputs live.
  - [ ] Gross margin targets by tier visible with guardrails and notes on data freshness.

#### S6-E2-S3 — Margin validation + narrative

- **Artifacts:** Narrative block in `fundability/unit_econ_model_v1/README.md` + sample charts in `fundability/unit_econ_model_v1/charts/`.
- **Acceptance checklist:**
  - [ ] Validation compares model outputs to actual invoices/allocations for two tenants; variance ≤5% or explained.
  - [ ] Charts for scaling curve and break-even points exported (PNG/PDF) and linked from README.
  - [ ] Risks/assumptions captured with next steps to close attribution gaps.

## Epic E3 — Reference Architecture Pack v1

**Goal:** Customer-ready architecture set (internal, white-label, hosted SaaS) with trust boundaries, data flows, and Day-2 ops.

#### S6-E3-S1 — Internal deployment diagram + explainer

- **Artifacts:** `fundability/reference_architecture_v1/internal.{drawio,pdf}` + `fundability/reference_architecture_v1/internal.md`.
- **Acceptance checklist:**
  - [ ] Diagram calls out trust boundaries, data stores, queues, signing/notary, policy decision points, and observability.
  - [ ] Explainer covers sizing guidance, upgrade/rollback, DR (RPO/RTO), key rotation, and retention/purge paths.
  - [ ] Threat assumptions and controls annotated on diagram or in notes.

#### S6-E3-S2 — White-Label self-hosted architecture

- **Artifacts:** `fundability/reference_architecture_v1/white_label.{drawio,pdf}` + `fundability/reference_architecture_v1/white_label.md`.
- **Acceptance checklist:**
  - [ ] Diagram highlights partner-controlled KMS/keys, IdP/SCIM integration, offline install path, and upgrade playbooks.
  - [ ] Policy/profile export/import and branding/theming integration points documented.
  - [ ] Day-2 ops section includes DR drills and evidence export hooks for partners.

#### S6-E3-S3 — Hosted SaaS multi-tenant architecture

- **Artifacts:** `fundability/reference_architecture_v1/hosted_saas.{drawio,pdf}` + `fundability/reference_architecture_v1/hosted_saas.md`.
- **Acceptance checklist:**
  - [ ] Diagram shows control plane vs data plane, tenant isolation boundaries (data + compute + policy), and quota/flag enforcement.
  - [ ] Per-tenant cost attribution, evidence export, and observability pathways annotated.
  - [ ] DR posture, rollback, retention/purge, and key rotation flows described with SLOs.

## Epic E4 — Sales Demo Environment + Script

**Goal:** One-click demo proving governance/provenance, multi-tenancy, and unit economics, with click-path scripts.

#### S6-E4-S1 — Demo seed bundle

- **Artifacts:** `demo/seed_bundle_v1/` (datasets, configs, receipts/evidence bundles, exportable reports), checksum manifest.
- **Acceptance checklist:**
  - [ ] Bundle seeds tenants, approvals/dual-control paths, quotas/flags, and sample evidence exports.
  - [ ] Includes usage + cost dashboard snapshots and commands to regenerate evidence.
  - [ ] Verified in a clean environment with a one-liner install/run path documented in bundle README.

#### S6-E4-S2 — 15-minute sales demo script

- **Artifacts:** `fundability/demo_script_v1.md` (15-minute script) with linked screenshots.
- **Acceptance checklist:**
  - [ ] Click-path covers tenant lifecycle, approvals, receipts verification, evidence export, usage + cost dashboard.
  - [ ] Timeboxed to 15 minutes with clear story beats and fallback paths if services degrade.
  - [ ] Screenshots/GIFs stored under `fundability/demo_assets/` and referenced inline.

#### S6-E4-S3 — 45-minute technical deep dive

- **Artifacts:** Appendix section in `fundability/demo_script_v1.md` or separate `fundability/demo_script_v1_deep_dive.md`.
- **Acceptance checklist:**
  - [ ] Deep dive shows governance/provenance internals, quota enforcement, metering, and invoice export steps.
  - [ ] Includes troubleshooting/runbook pointers and evidence bundle verification steps.
  - [ ] Links to reference architecture diagrams for topology/context.

## Epic E5 — Fundability Deck + Security/Compliance Briefs

**Goal:** Investor- and customer-ready collateral with evidence-backed trust claims.

#### S6-E5-S1 — Fundability deck v1

- **Artifacts:** `fundability/deck_v1/deck_v1.pptx` + `fundability/deck_v1/deck_v1.pdf`.
- **Acceptance checklist:**
  - [ ] Narrative covers North Star, moat (policy/provenance/multi-tenant cost attribution/receipts), traction signals, roadmap, GTM/pricing.
  - [ ] Each trust claim links to a product proof (receipts, dashboards, or evidence bundles) with working URLs/paths.
  - [ ] Unit economics slide draws from `fundability/unit_econ_model_v1.xlsx` with date/version stamps.

#### S6-E5-S2 — Security posture brief v1

- **Artifacts:** `fundability/security_posture_v1.md` + `fundability/security_posture_v1.pdf`.
- **Acceptance checklist:**
  - [ ] Covers zero trust, OPA/ABAC, signing/attestation (SBOM/SLSA/cosign), DR posture with RPO/RTO proof, retention/purge manifests, and incident handling.
  - [ ] References evidence bundles or dashboards for each claim; links validated.
  - [ ] Exported PDF matches Markdown source and is ready for external sharing (no secrets).

#### S6-E5-S3 — Compliance roadmap v1 + ship-ready zip

- **Artifacts:** `fundability/compliance_roadmap_v1.md` + `fundability/compliance_roadmap_v1.pdf`; zip manifest `fundability/fundability_pack_v1.zip`.
- **Acceptance checklist:**
  - [ ] Roadmap lists SOC2/ISO milestones, automation mapping, timelines, and already-automated evidence flows.
  - [ ] Zip contains deck, architecture PDFs, pricing sheet, security/compliance briefs, demo script, and sample invoice export paths.
  - [ ] Final QA checklist confirms links, permissions, and redaction; checksum recorded.
