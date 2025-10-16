# General Counsel Workstream — Q4 Cadence Sprint 5 (v1)

**File:** gc-legal-governance-q4-2025-12-01_to_2025-12-12-sprint-05  
**Role:** I. Foster Dullness, LL.M. — General Counsel (Lawfare, Policy, Governance, Disclosure)  
**Window:** **Dec 1 – Dec 12, 2025**  
**Mandate:** Cut over to **Explainability v1.0**, ship **Customer Attestations**, automate **Reg‑Watch → Gate** updates, and open the **Red‑Team Marketplace** interface. Close the quarter with a stable, audited, self‑service legal governance platform.

---

## 0) Linkage to Prior Sprints

- **S1:** Gate v0.9, Disclosure v0.9, DPIA, SBOM/license, export check.
- **S2:** Gate v1.1 (risk tiers, TPIA, claims‑diff, fingerprint), Explainability stub, Auditor bundle v1.1.
- **S3:** Gate v1.2 (abuse/DSAR hooks), Auto Data‑Map/RoPA, Export/Sanctions watch, Legal Hold CLI.
- **S4:** Gate v1.3 (DSR readiness, explainability readiness, Trust Center), DSR automation, Explainability v0.9, Trust Center publisher, ContractOps hooks.
- **S5:** **Platform finish** — Explainability v1.0, Attestation flows, Reg‑Watch automation, Red‑Team Marketplace, readiness for external audit.

---

## 1) Sprint Goal (Two‑Week Outcome)

**“Trust at production scale: verified explainability, customer‑specific attestations, regulation‑aware gating, and pluggable red‑team coverage — all codified and evidenced in every release.”**

**Definition of Done**

- **Explainability v1.0** returns deterministic, reproducible attributions (seeded runs), parity‑checked vs evaluator suite; performance budgets met.
- **Customer Attestations** (per‑tenant) generated and e‑signable from Trust Center, backed by disclosure pack hashes.
- **Reg‑Watch** parses monitored sources, opens change PRs to `.legal/` with proposed rule deltas; gate v1.4 respects updated jurisdictions.
- **Red‑Team Marketplace** accepts external suite manifests; runs selected suites in CI for L2+; results integrated into risk register.
- **Quarter close**: ≥15 repos onboarded, ≥92% pass rate, zero waivers >7 days; external audit readiness packet compiled.

---

## 2) Deliverables (Ship This Sprint)

1. **Gate v1.4 (OPA/Rego)** — import **registry of obligations**; enforce jurisdictional deltas; require attestation integrity for enterprise tenants; include red‑team marketplace coverage checks.
2. **Explainability v1.0** — evaluator parity tests, caching and budgets, provenance receipts, UI panel embed with signed examples.
3. **Customer Attestation Flow** — per‑tenant controls map + pack hash; e‑signature + verification endpoint; renewal cadence.
4. **Reg‑Watch Bot** — scrapes subscribed sources (regs/standards) → diffs → PRs with test vectors; owners approve & merge.
5. **Red‑Team Marketplace** — manifest spec, allow‑list, runner integration; vendor results ingested to `eval_summary.md` and `risk_register.json`.
6. **External Audit Readiness** — consolidated evidence book, management assertion letter, and auditor workspace export.

---

## 3) Work Plan (Swimlanes & Tasks)

**Lane A — Gate & Obligations Registry**

- A1. Add `obligations.json` ingestion (jurisdiction → rules → predicates).
- A2. Extend Rego to call `obligation_ok[rule]` per impacted feature/region.
- A3. Integrate marketplace coverage check (`coverage >= required_coverage[L2+]`).

**Lane B — Explainability v1.0**

- B1. Parity harness vs evaluator suite; record `delta <= threshold` and attach to pack.
- B2. Determinism: seed pinning, frozen model fingerprints, cache receipts.
- B3. UI embed (developer/admin) with signed examples; SSO + RBAC.
- B4. Budgets: P95 latency ≤ X ms; cost per explanation ≤ Y; alerts if exceeded.

**Lane C — Customer Attestations**

- C1. Generator: `attestations/<tenant>/controls_map.md` + `attestation.json` (includes disclosure hash, commit, date, expiry).
- C2. E‑sign flow (ESIGN/UETA compliant) + verification endpoint `/verify/<attestation_id>` that checks hash validity.
- C3. Trust Center integration: gated download for authenticated tenant admins.

**Lane D — Reg‑Watch Automation**

- D1. Source adapters (EU AI Act drafts/final, GDPR EDPB, UK ICO, US state privacy, NIST AI RMF, ISO 42001/27001 updates).
- D2. NLP diff → rules delta (YAML) → PR against `.legal/obligations/`.
- D3. Add tests that simulate new rule; CI must pass with updated gates.

**Lane E — Red‑Team Marketplace**

- E1. Manifest spec `redteam-manifest.yaml` (provider, scenarios, coverage, license, data handling).
- E2. Runner: fetch suite, execute in sandbox, emit JUnit + risk register entries.
- E3. Governance: allow‑list providers; license agreements; data‑use constraints.

**Lane F — External Audit Readiness**

- F1. Evidence book: index of control narratives + artifacts; includes prior quarter changes.
- F2. Management assertion letter template; sign‑off workflow.
- F3. Auditor workspace export (read‑only bucket + index.json).

---

## 4) Policy‑as‑Code — Gate v1.4 (Rego, excerpt)

```rego
package legal.gate

import future.keywords.if

default allow := false

# Inputs
# input.obligations: { jurisdiction: { rules: [...] } }
# input.tenant: { id, type: "enterprise|smb", jurisdictions: [..] }
# input.marketplace: { coverage: number }

# Baseline from v1.3 assumed (base_ok, dsr_ready, explainability_ready, trust_center_fresh)

# Jurisdictional obligations
obligation_ok(rule) {
  # Each rule encodes a predicate we map to inputs/artifacts
  # Example: rule == "gdpr.dpia_for_high_risk"
  not rule == "gdpr.dpia_for_high_risk"  # placeholder: real mapping in full file
}

all_obligations_ok {
  some j in input.tenant.jurisdictions
  every rule in input.obligations[j].rules {
    obligation_ok(rule)
  }
}

# Enterprise tenants require fresh, signed attestation
attestation_ok { input.tenant.type != "enterprise" }
attestation_ok {
  input.tenant.type == "enterprise"
  input.attestation.present
  input.attestation.hash == input.disclosure.hash
  input.attestation.age_days <= 90
}

# Marketplace coverage for L2+
max_tier := max([f.risk_tier | f := input.features][_])
marketplace_ok { max_tier < 2 }
marketplace_ok { max_tier >= 2; input.marketplace.coverage >= 0.9 }

allow { base_ok; all_obligations_ok; attestation_ok; marketplace_ok }
```

---

## 5) Obligations Registry — Structure

```
/.legal/obligations/
  gdpr.yaml
  eprivacy.yaml
  uk_ico.yaml
  us_state_privacy.yaml
  eu_ai_act.yaml
  nist_ai_rmf.yaml
  iso_42001.yaml
```

**YAML rule (example)**

```yaml
rule: gdpr.dpia_for_high_risk
predicate:
  when: feature.risk_tier >= 3
  require: artifacts.dpia == true
```

---

## 6) Explainability v1.0 — Evidence & UI

```
- evaluator_parity.md (tests, thresholds, deltas)
- cache_receipts.json (seed, cache_key, hit/miss)
- ui_embed/: panel with signed examples and RBAC
- budgets.md: SLOs & alerts
```

---

## 7) Customer Attestations — Flow

```
1) Generate per‑tenant controls map + disclosure hash
2) Present e‑sign flow (ESIGN/UETA)
3) Store signed PDF + JSON
4) Expose verification endpoint
5) Expire/renew on cadence (≤90 days)
```

**Artifacts**

```
/disclosure/attestations/<tenant>/
  attestation.json
  attestation.pdf
  verify.txt (hash & URL)
```

---

## 8) Reg‑Watch Bot — Operation

```
- Cron: daily
- Sources: RSS/APIs/scrapes
- Output: PR with obligations YAML diff + test case
- Owners: GC + DPO review & merge
- Post‑merge: bump `gate.rego` predicates as needed
```

---

## 9) Red‑Team Marketplace — Manifest (example)

```yaml
provider: AcmeSec
license: CC-BY-NC
scenarios:
  - id: inj-001
    name: Canonical Prompt Injection Set
    coverage: 0.2
    data_use: ephemeral
  - id: tox-002
    name: Harassment/Toxicity Probes
    coverage: 0.3
```

**Runner Output → Pack**

```
- disclosure/ai/redteam_results/junit.xml
- disclosure/ai/risk_register.json (merged)
```

---

## 10) External Audit Readiness — Evidence Book

```
- narratives/ (control narratives with pointers)
- evidence/ (immutable links to packs, SBOM attests, evals, DSAR/DSR receipts, explainability receipts)
- management_assertion.md
- scope_and_criteria.md
```

---

## 11) Acceptance Criteria & Demos

- ✅ Explainability v1.0 parity ≤ threshold; UI panel live; budgets enforced.
- ✅ Customer Attestations generated for ≥3 tenants; verification endpoint validates.
- ✅ Reg‑Watch PRs opened with at least one obligations delta merged; gate v1.4 applies it.
- ✅ Red‑Team Marketplace runs at least one external suite; results appear in risk register; L2+ coverage ≥90%.
- ✅ ≥15 repos onboarded total; pass‑rate ≥92%; no waivers >7 days; evidence book exported for audit.

**Demo Script:** Trigger release on enterprise tenant → gate v1.4 reads obligations + attestation → marketplace suite runs → explainability UI shows signed example → Trust Center exposes tenant attestation → Reg‑Watch PR merged and new rule enforced → export evidence book.

---

## 12) Risks & Mitigations

- **Reg text ambiguity** → require human review on bot PRs; ship tests with examples; annotate assumptions.
- **Explainability cost** → caching + budgets; cap per‑build explanations; sample wisely.
- **Marketplace data handling** → provider allow‑list + DPA; only synthetic data unless approved.
- **Attestation sprawl** → 90‑day expiry + dashboard for renewals.

---

## 13) Operating Cadence

- **Mon:** Kickoff; obligations registry review.
- **Tue/Thu:** Explainability parity & budgets stand‑ups.
- **Wed:** Tenant attestation clinic.
- **Fri:** Marketplace demo; audit evidence export dry‑run.

---

## 14) Scaffolding — Repo Drop‑Ins (Sprint 5 additions)

```
/.legal/
  gate.rego                      # v1.4 predicates
  obligations/*.yaml             # registry
  bots/regwatch/
    sources/*.py
    pr_maker.py
/attestations/
  generator.py
  verify_endpoint.py
/ai/explainability/
  parity_tests.py
  cache.py
  ui_embed/
    panel.html
    panel.js
/redteam/
  runner.py
  redteam-manifest.schema.json
/audit/
  evidence_book/
    build.py
    index.md
```

> **Legitimacy as cover; precision as doctrine; velocity as advantage. We ship proof at scale.**
