# Council of Spies & Strategists — Platform Workstream
**Slug:** council-intelgraph-platform-q4-2025-sprint-04  
**Dates:** 2025-11-12 → 2025-11-25 (2‑week sprint)  
**Role / Lane:** Chair‑run platform core (provenance, governance, graph‑XAI, analyst UX)

**Sprint Theme:** **GA Readiness & Trust** — finalize GA‑grade stability, governance, and enablement: incident response, observability, compliance pack, accessibility, and partner integration paths. Carry forward multi‑case reasoning and SDKs, finish audit/export surfaces, and lock SLOs for GA. Align tightly with apps/web, connectors, predictive suite, and ops/sec.

---
## 0) Executive Outcome
By **2025‑11‑25** we will:
- ✅ **GA Readiness Gate** passed (SLOs green, DR run, chaos + rollback rehearsed, security review signed).  
- ✅ **Compliance Pack v1** (unified audit bundle + evidence index; SOC2‑seed controls mapped; SBOM+provenance attached to artifacts).  
- ✅ **Incident & Change Management v1** (IR playbooks, post‑mortem templates, change windows, safe‑deploy guardrails).  
- ✅ **Observability v1.5** (golden signals, budget dashboards, query plan inspector surfaced in UI).  
- ✅ **Accessibility & Localization v1** (WCAG 2.2 AA for analyst tri‑pane; l10n hooks for disclosure bundles).  
- ✅ **Partner Interop v0.9** (export adapters + signed webhooks; SDK samples end‑to‑end).  
- ✅ **Golden Path v4** (multi‑case + policy replay + appeals + adjudication + timeline + SDK + compliance export) demoable.

**Definition of Done:** features on `main`, staged with Helm/Terraform, canary plan rehearsed, dashboards live, docs/runbooks published, acceptance tests pass, GA checklist signed.

---
## 1) Alignment & Interfaces
- **apps/web**: renders plan inspector, overlay save/share, accessibility updates; appeal + replay UIs hardened; export flows.  
- **predictive‑threat‑suite**: model card updates; explainer cache invalidation hooks; temporal model telemetry.  
- **connectors**: adopt claim v1.0 + retention flags; deliver partner feed mapping examples.  
- **ops/reliability**: SLO dashboards, IR rotations, cost guard budgets; autoscaling & circuit‑breaker policies.  
- **security/governance**: policy catalog freeze window; red team table‑top; dual‑control purge signed off.

**Dependencies:** gateway emits query plan IDs to UI; notification bus for IR; object store lifecycle for audit/compliance; feature flags service for canary.

---
## 2) Carry‑over & Gap Focus
1) **Audit bundle survivability** during failures not proven; add export‑under‑stress tests.  
2) **Auto‑rewrite explanations** need plain‑language narratives in UI.  
3) **Partner interop** lacks signed webhook receipts + retry semantics.  
4) **Accessibility** gaps in keyboard navigation and contrast in overlay toggles.  
5) **Localization** for disclosure bundles limited to EN/ES; add pluggable i18n framework.  
6) **IR runbooks** exist but lack severity matrix + comms templates.

---
## 3) Objectives & Key Results (OKRs)
- **O1. GA Stability** → *KR1:* p95 read ≤ 1.3s, p99 ≤ 2.2s @ 1k VU sustained; *KR2:* zero Sev‑1 during stage canary drills.  
- **O2. Trust & Compliance** → *KR3:* audit bundle export succeeds during chaos > 99%; *KR4:* SOC2‑seed evidence index covers ≥ 90% mapped controls.  
- **O3. Clarity & Accessibility** → *KR5:* WCAG AA checks pass for tri‑pane; *KR6:* 100% throttled queries show plain‑language rewrite suggestions with measured acceptance > 60%.  
- **O4. Interop & Enablement** → *KR7:* 3 partner adapters demoed; *KR8:* SDK quickstart TTFX < 3 min.  
- **O5. Operability** → *KR9:* IR drill MTTD < 2 min (synthetic alert), MTTR < 20 min; *KR10:* change windows enforced with auto‑rollback.

---
## 4) Epics, Stories, Acceptance Criteria
### Epic A — GA Gate & SLO Hardening
- **A1. SLO Consolidation**  
  *Stories:* finalize golden signals (latency, errors, saturation, cost); dashboards + budgets.  
  *AC:* SLOs green in stage for 72h; alert fatigue score < threshold.
- **A2. DR & Rollback Rehearsal**  
  *Stories:* region failover table‑top + scripted failover; progressive delivery auto‑rollback.  
  *AC:* drill passes; RTO/RPO documented.

### Epic B — Compliance Pack v1
- **B1. Audit Bundle Under Chaos**  
  *Stories:* export during shard fail + cache kill; integrity verification.  
  *AC:* ≥ 99% success; signed bundle with verifier report.
- **B2. Control Mapping & Evidence Index**  
  *Stories:* map to SOC2‑seed; evidence links (runbooks, logs, configs, SBOM).  
  *AC:* index renders; gaps flagged with owners.

### Epic C — Incident & Change Management v1
- **C1. IR Playbooks & Severity Matrix**  
  *Stories:* Sev‑1..4 definitions; on‑call rotation; comms templates (stakeholder, exec, customer).  
  *AC:* synthetic incident post‑mortem completed using templates.
- **C2. Safe Deploy Guardrails**  
  *Stories:* change windows; canary thresholds; automatic rollback hooks.  
  *AC:* one simulated bad deploy rolled back automatically.

### Epic D — Observability v1.5
- **D1. Query Plan Inspector in UI**  
  *Stories:* show plan ID, fan‑out, cache hits, cost; link to narratives/rewrites.  
  *AC:* all throttled queries display inspector + accepted rewrite.
- **D2. Budget Dashboards**  
  *Stories:* tenant budgets; trend lines; breach alerts.  
  *AC:* dashboards in ops; alerts routed.

### Epic E — Accessibility & Localization v1
- **E1. WCAG 2.2 AA**  
  *Stories:* keyboard nav, focus traps, contrast, aria labels; screen reader landmarks.  
  *AC:* automated + manual audits pass; defects triaged.
- **E2. Disclosure i18n Framework**  
  *Stories:* i18n bundles; language switch; template linting.  
  *AC:* EN/ES/FR supported; missing strings block publish.

### Epic F — Partner Interop v0.9
- **F1. Export Adapters**  
  *Stories:* CSV/JSON‑LD/Parquet exports; schema versioning; checksums.  
  *AC:* exports imported into partner demo apps.
- **F2. Signed Webhooks & Retries**  
  *Stories:* HMAC‑signed payloads; idempotency keys; exponential backoff + DLQ.  
  *AC:* replay safe; signatures verified.

---
## 5) Interfaces & Schemas
### A. Audit Evidence Index (YAML)
```yaml
audit_index: v1
controls:
  - id: cc-logging
    evidence:
      - type: runbook
        path: runbooks/incident-response.md
      - type: sbom
        path: releases/v1.1.0/sbom.spdx.json
      - type: report
        path: verifier/release-verify.json
```

### B. Webhook Signature (pseudocode)
```http
X-Signature: sha256=BASE64(hmac_sha256(secret, body))
X-Idempotency-Key: <uuid>
```

### C. Accessibility Checklist (excerpt)
- Focus visible on all interactive elements.  
- Contrast ratio ≥ 4.5:1 text; ≥ 3:1 UI components.  
- All overlays toggleable via keyboard; aria-expanded state accurate.  
- Live regions for async loads with polite announcements.

---
## 6) Test Strategy
- **Unit/Contract:** webhook HMAC + idempotency; audit index schema; i18n lint; query plan inspector props.  
- **E2E:** Golden Path v4 run; export/import partner loop; appeal/replay preserved.  
- **Load (k6):** 1k VU sustained; p95/p99 within SLO; export during load.  
- **Chaos:** shard fail + cache kill + export; rollback on induced error.  
- **Security:** red team table‑top; webhook signature tamper; policy replay integrity.  
- **A11y:** keyboard nav audit; screen reader smoke; contrast snapshots.

**Fixtures:** `fixtures/case-charlie/*` (multi‑case joins, localized disclosures, exports, webhook receipts, audit bundles).

---
## 7) Cadence (Day‑by‑Day)
- **D1–2:** A1 SLO consolidation; D1 plan inspector UI; F2 webhook signing.  
- **D3–5:** B1 chaos‑export; C1 IR playbooks; E1 accessibility fixes; F1 export adapters.  
- **D6–7:** B2 evidence index; D2 budgets; E2 i18n; C2 safe‑deploy guardrails.  
- **D8–9:** Golden Path v4 polish; load/chaos/a11y drills; docs/runbooks.  
- **D10:** Freeze, GA gate, demo, release notes, retro.

---
## 8) Risks & Mitigations
- **Export under failure** → back‑pressure aware exporters; resumable bundles; signed checkpoints.  
- **A11y regressions** → automated audits in CI; manual checklist before release.  
- **Webhook abuse** → tight time‑window signatures; replay protection; IP allowlist.  
- **Alert fatigue** → SLO‑derived alerts only; ownership & runbook links embedded.

---
## 9) Metrics & Dashboards
- **SLOs:** p95/p99 latency; error rate; saturation; throttles avoided by rewrite.  
- **Compliance:** evidence coverage; audit export success under chaos; verifier pass rate.  
- **Ops:** MTTD/MTTR; auto‑rollback count; change window adherence.  
- **A11y:** axe score; manual defects resolved; keyboard coverage.  
- **Interop:** webhook delivery success; partner import success; SDK TTFX.

---
## 10) Release Checklist
- Feature flags safe defaults; migrations idempotent.  
- Canary thresholds/alerts wired; rollback tested.  
- Docs/runbooks updated: IR, change mgmt, export, a11y, i18n.  
- GA gate signed by ops + security + product; tag `v1.2.0-platform` + SBOM + provenance.

---
## 11) Deliverable Artifacts (Scaffolding)
```
platform-sprint-04/
├── docs/
│  ├── ga-checklist.md
│  ├── evidence-index.md
│  ├── incident-response.md
│  ├── change-management.md
│  ├── query-plan-inspector.md
│  ├── accessibility-audit.md
│  ├── localization-guide.md
│  └── partner-export.md
├── fixtures/case-charlie/
│  ├── claims.jsonl
│  ├── disclosures/
│  │  ├── en.json
│  │  ├── es.json
│  │  └── fr.json
│  ├── exports/
│  │  ├── bundle.jsonld
│  │  └── bundle.parquet
│  ├── webhooks/
│  │  ├── receipt-1.json
│  │  └── receipt-2.json
│  └── audit-bundle.json
├── graphql/
│  └── inspector.graphql
├── webhooks/
│  ├── signer.md
│  └── retry-policy.md
├── k6/
│  └── sustained-1kvu.js
├── chaos/
│  └── export-under-failure.md
└── runbooks/
   ├── dr-failover.md
   ├── rollback.md
   ├── a11y-checklist.md
   └── ga-gate.md
```

**Templates:** **POSTMORTEM.md**, **CHANGE_PLAN.md**, **EVIDENCE_ITEM.md**, **A11Y_BUG.md**, **PARTNER_WEBHOOK_CONTRACT.md**, **GA_SIGNOFF.md**.

---
## 12) Retro Prompts (to close sprint)
- Did GA gate criteria reflect real risk and readiness?  
- Were plain‑language cost/plan narratives sufficient for analysts?  
- Did export‑under‑failure hold up in chaos?  
- Are a11y and i18n embedded into everyday dev, not just pre‑release checks?

---
## 13) Changelog (to fill at close)
- GA Gate …  
- Compliance Pack v1 …  
- Incident & Change Management v1 …  
- Observability v1.5 …  
- A11y & i18n v1 …  
- Partner Interop v0.9 …  
- Golden Path v4 …

