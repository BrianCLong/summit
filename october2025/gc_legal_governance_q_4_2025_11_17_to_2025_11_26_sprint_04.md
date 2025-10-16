# General Counsel Workstream — Q4 Cadence Sprint 4 (v1)

**File:** gc-legal-governance-q4-2025-11-17_to_2025-11-26-sprint-04  
**Role:** I. Foster Dullness, LL.M. — General Counsel (Lawfare, Policy, Governance, Disclosure)  
**Window:** **Nov 17 – Nov 26, 2025**  
**Mandate:** Complete the privacy lifecycle (access → delete/rectify), stand up explainability **v0.9** for L2+ features, auto‑publish a **Trust Center** from Disclosure Packs, and wire ContractOps so every deal carries current DPA/TIA packs and control narratives. Expand program to ≥12 repos with steady‑state governance.

---

## 0) Linkage to Prior Sprints

- **S1:** Gate v0.9, Disclosure v0.9, DPIA, SBOM/license, export check, incident matrix (pilots).
- **S2:** Gate v1.1 (risk tiers, TPIA, claims‑diff, fingerprint), Explainability stub, Auditor bundle.
- **S3:** Gate v1.2 (abuse/red‑team, DSAR hooks), Auto Data‑Map & RoPA, Export/Sanctions watch, Legal Hold CLI.
- **S4:** Data subject **delete/rectify** automation + governance proofs, **Explainability v0.9**, **Trust Center** auto‑publisher, **ContractOps** CRM hooks, program scale.

---

## 1) Sprint Goal (Two‑Week Outcome)

**“From compliant to demonstrably trustworthy: full DSAR lifecycle, explainability on demand, public trust artifacts, and deal‑grade legal kits — all generated from code.”**

**Definition of Done**

- **DSR Automation** (delete/rectify) live for at least one L2+ product; audit trail written to Disclosure Pack; SLA timers captured.
- **Explainability v0.9** provides feature attribution / trace mode for L2+ features with reproducible examples; endpoint health‑checked in CI.
- **Trust Center Publisher** builds a static/public site from the latest green Disclosure Pack (redacts internal only).
- **ContractOps Hooks** attach current DPA/TIA bundle + control narrative to opportunities at stage change; records hash in CRM notes.
- **12 repos** enrolled; ≥90% pass rate; **zero waivers older than 7 days**.

---

## 2) Deliverables (Ship This Sprint)

1. **Gate v1.3 (OPA/Rego)** — enforce delete/rectify readiness for PII features; require explainability endpoint for L2+; fail on stale Trust Center content.
2. **DSR Engine** — workflow + APIs for delete/rectify with verification, soft‑delete windows, redaction rules, and rollback receipts.
3. **Explainability v0.9** — feature attribution (token/feature importance) and trace mode; sampling harness; governance safeguards.
4. **Trust Center Publisher** — static site generator (SSG) from Disclosure Pack; includes model sheets, evals, uptime/SLOs, export posture, and security attestations.
5. **ContractOps Integrations** — outbound webhook + CLI to push DPA/TIA + controls to CRM; writes cryptographic receipt back into pack.
6. **Audit & Evidence Enhancements** — DSAR/DSR logs, explainability run receipts, Trust Center publish receipts, CRM artifact hashes.

---

## 3) Work Plan (Swimlanes & Tasks)

**Lane A — Policy‑as‑Code & CI**

- A1. Extend `gate.rego` with predicates: `dsr_ready`, `explainability_ready`, `trust_center_fresh`.
- A2. GH Action: **trust‑center‑publish.yml** that builds from `disclosure/` and publishes to the designated bucket/site; writes receipt.
- A3. CI healthchecks for explainability endpoint and DSR API; fail gate if unhealthy.

**Lane B — DSR (Delete/Rectify) Automation**

- B1. API design: `/v1/dsr/delete`, `/v1/dsr/rectify`, `/v1/dsr/status/<id>` with signed request & step‑up auth.
- B2. Soft‑delete window (configurable), irreversible delete paths for datapoints lacking legal retention requirements.
- B3. Redaction transformers for logs/backups; job to confirm propagation; produce **DSR Completion Receipt**.
- B4. SLA timers: 30‑day outer limit; alerts at T‑7/T‑3; breach report generator if exceeded.

**Lane C — Explainability v0.9**

- C1. Implement **feature attribution** for supported models (token saliency / SHAP‑like importances when feasible) behind `?mode=feature`.
- C2. Implement **trace mode**: input → preprocessing → model(s) → post‑processing lineage with fingerprint IDs.
- C3. Add **privacy & redaction** rules (no raw secrets/keys) and rate limits.
- C4. Sampling harness for reproducibility: seed, version, sample set; attach to pack.

**Lane D — Trust Center**

- D1. SSG reads `disclosure/` → builds redacted site (no secrets, only public‑safe sections).
- D2. Sections: Overview, Security, Privacy & Residency, AI Model Sheets, Evals & Red‑Team, Availability/SLO, Export/Geo, Compliance Mappings, Changelog.
- D3. Sign & timestamp each publish; hash recorded in `disclosure/publish_receipts.json` and uploaded.

**Lane E — ContractOps**

- E1. CLI `contractops push --oppty <id>` packages DPA, TIA, control narratives, and version hash; sends via webhook to CRM.
- E2. On CRM stage `Commit/Legal`, require a current hash; notify if stale.
- E3. Log `contractops_receipts.json` into pack; reference in `controls_map.md`.

---

## 4) Policy‑as‑Code — Gate v1.3 (Rego, excerpt)

```rego
package legal.gate

default allow := false

# Assume v1.2 predicates: base_ok, dsar_hooks_ok, abuse_evals_ok, unresolved_risk_zero

# DSR readiness required for PII features
needs_dsr { some f in input.features; f.pii }

dsr_ready { not needs_dsr }
dsr_ready { needs_dsr; input.privacy.dsr.delete_ready; input.privacy.dsr.rectify_ready }

# Explainability required for L2+
max_tier := max([f.risk_tier | f := input.features][_])

explainability_ready { max_tier < 2 }
explainability_ready { max_tier >= 2; input.explainability.health == "ok" }

# Trust Center freshness: last_publish <= 14 days and commit hash matches
trust_center_fresh {
  input.trust_center.last_publish_days <= 14
  input.trust_center.commit_hash == input.release.commit
}

allow { base_ok; dsar_hooks_ok; dsr_ready; explainability_ready; trust_center_fresh }
```

---

## 5) DSR Engine — API & Receipts (spec)

```
POST /v1/dsr/delete { subject_id, scope, reason } -> 202 { request_id }
POST /v1/dsr/rectify { subject_id, field, new_value } -> 202 { request_id }
GET  /v1/dsr/status/<request_id> -> 200 { state, timestamps, artifacts }
Receipts stored:
- disclosure/privacy/dsr/<request_id>/receipt.json
- disclosure/privacy/dsr/log.ndjson
- disclosure/privacy/dsr/propagation_report.md
```

**Redaction/Propagation**

- Streams/logs: masking rules + replay check.
- Backups: mark‑for‑delete queue processed post‑restore; report attached.
- Irreversible paths documented per datastore.

---

## 6) Explainability v0.9 — Contract & Evidence

```
POST /v1/explainability/explain
  { input_id, model, version, mode: "feature|trace", seed?, sample_ref? }
-> 200 {
     request_id, mode,
     feature_attribution?: [{feature, importance, span?}],
     trace?: [{stage, fingerprint, summary}],
     governance: { fingerprint, commit, evaluator_version }
   }
Evidence:
- disclosure/ai/explainability_samples.md
- disclosure/ai/explainability_receipts/<id>.json
```

---

## 7) Trust Center Publisher — Structure

```
trust-center/
  index.md
  security.md
  privacy.md
  ai-models.md
  evals.md
  availability.md
  export-geo.md
  compliance.md
  changelog.md
```

**Publisher flow**

1. Read pack → transform to redacted markdown.
2. Build static site (SSG) → publish to bucket/domain.
3. Write `publish_receipts.json` with URLs, commit hash, timestamp, signer.

---

## 8) ContractOps — CLI & Webhook (sketch)

```bash
# Push latest legal kit to CRM
contractops push --oppty "$OPPTY_ID" --crm "$CRM" \
  --bundle disclosure-pack.tgz --hash $(sha256sum disclosure-pack.tgz | awk '{print $1}')
# Verify at legal stage
contractops verify --oppty "$OPPTY_ID" --required-hash <hash>
```

Webhook payload:

```
{
  "opportunity_id": "<id>",
  "bundle_url": "s3://.../disclosure-pack.tgz",
  "hash": "<sha256>",
  "controls_map": "path/in/pack",
  "expires": "2025-12-31"
}
```

---

## 9) Auditor Bundle v1.3 — Additions

- DSR receipts and propagation reports.
- Explainability receipts & sample set.
- Trust Center publish receipts (hash + URL + signer).
- ContractOps receipts (CRM hash + timestamp).

---

## 10) Acceptance Criteria & Demos

- ✅ **DSR delete/rectify** operational on one L2+ product; completion receipts in pack.
- ✅ **Explainability v0.9** returns feature attributions / traces; CI healthchecks green.
- ✅ **Trust Center** publishes automatically on green release; receipt logged; content ≤14 days old and commit‑matched.
- ✅ **ContractOps** pushes bundle + hash to CRM at stage change; verification passes.
- ✅ **12 repos** enrolled; ≥90% pass rate; zero stale waivers.

**Demo Script:** Merge to main → CI runs gate v1.3 → explainability healthcheck → DSR API exercised with test subject → Trust Center auto‑publishes → ContractOps push to CRM → open auditor bundle v1.3 with receipts.

---

## 11) Risks & Mitigations

- **Data deletion in backups** — document RPO/RTO carve‑outs; publish propagation report with timelines.
- **Explainability stability** — gate with 501 for unsupported models; cache examples; rate‑limit.
- **Public Trust Center leakage** — strict redaction rules; pre‑publish diff + approval step by GC.
- **CRM variance** — generic webhook + adapter pattern for SFDC/HubSpot; fall back to email‑attachment bot.

---

## 12) Operating Cadence

- **Mon:** Kickoff; choose L2+ product for DSR+Explainability enablement.
- **Tue/Thu:** Stand‑ups with ML + SecDevOps; Trust Center content review.
- **Wed:** ContractOps integration clinic.
- **Fri:** Auditor bundle dry‑run; waiver hygiene check.

---

## 13) Scaffolding — Repo Drop‑Ins (Sprint 4 additions)

```
/.legal/
  gate.rego                      # v1.3 predicates
  jobs/trust-center-publish.yml  # workflow
  dsr/
    api.yaml
    delete.py
    rectify.py
    status.py
    receipts.md
/ai/
  explainability/
    api.md
    server_stub.py
    sampler.py
/trust-center/
  templates/*.md
  build.py
/contractops/
  cli.py
  webhook.md
```

---

## 14) Preview — Sprint 5 (Dec 1 – Dec 12, 2025)

- **Explainability v1.0** with evaluator parity tests + UI.
- **Customer attestation** flows: publish customer‑specific control mappings.
- **Reg‑watch** automation: surface new AI/privacy rules that affect gating.
- **Red‑team marketplace**: pluggable external test suites.

> **We do not ask for trust. We produce it, sign it, and ship it with every build.**
