# Sprint Packet — Security, Governance, Provenance & Ops (Groves Workstream)

**Cadence:** 2025‑10‑15 → 2025‑10‑28 (2 weeks)  
**Role / Workstream:** Leslie Groves — Engineer’s Seat (Compartmentation, accreditation, provenance, SRE)  
**Alignment:** Q4 2025 GA hardening; Prov‑Ledger v1.1; Cost Guard v1; DR/Chaos cadence  
**Status Target:** Ship **clean/green** features with acceptance evidence; close priority gaps from Sprint‑01; advance visual explainability + governance UX

---

## 0) Roll‑forward & Context
**From Sprint‑01:** Authority‑Bound Gateway online; Prov‑Bundle v1.0; Cost Guard MVP; Audit/Ombuds loop; DR/Chaos cadence established.  
**Carry‑over debt:**
- Detached signature verification & Merkle root validation in `prov-verify` CLI.
- Enricher step‑hashes for OCR/STT/redaction in 2 ETL paths.
- Budget burn alerts fine‑tuning for two tenants.

**This sprint:** deepen verification, surface contradiction intel, harden offline integrity, and map controls to compliance.

---

## 1) Objectives (Definition of Victory)
1) **Prov‑Ledger v1.1 (Verifiable, Signed, Shareable):** detached sigs + Merkle root verification, license/authority binding, and tamper‑evident zip export.
2) **Contradiction Intelligence UI:** graph overlays (density heatmap), lineage drill‑in, and exportable contradiction report.
3) **Vector Governance (Per‑Case):** retention, purpose constraints, and recall redaction pipeline wired to policy labels.
4) **Enclave Transforms (Option):** run sensitive transforms in a signed enclave profile with attest logs.
5) **Ops Hardening:** budget guardrails GA; slow‑query hints surfaced; SLO burn & chaos evidence auto‑published.
6) **Compliance Mapping:** SOC 2 + ISO 27001 control linkage for policy/audit/provenance features (control IDs in UI & docs).

---

## 2) Deliverables
- **D1. Prov‑Verify v1.1**
  - Merkle root file `manifest.root` and signature `manifest.sig` (cosign/PKI pluggable).
  - CLI validation for manifests, evidence, transforms, and signature chains.
  - Tamper‑evident export: `disclosure-pack-<caseId>.tgz` with SBOM + license attestations.
- **D2. Contradiction Overlays**
  - Graph UI heatmap layer “Contradiction Density”.
  - Node/edge pane shows conflicting claims, sources, timestamps, and confidence spread.
  - Exportable PDF/JSON contradiction report with manifest linkage.
- **D3. Vector Index Governance**
  - Per‑case index with label‑aware shard policies (retention/purpose).
  - Redaction & recall pipeline with audit breadcrumbs.
- **D4. Enclave Transforms (Alpha)**
  - Enclave profile for OCR & redaction; attestation log viewer in Admin Studio.
- **D5. Cost Guard GA**
  - Budget policies per namespace; user‑facing query hints; dashboard v2 with unit‑economics panel.
- **D6. Compliance Control Map**
  - Live mapping: policy → SOC2/ISO controls; UI tooltips show control IDs; auditor export (CSV/JSON).

**Artifacts:** updated schemas, CLIs, UI components, dashboards, ADRs, playbooks, fixtures (see Appendix).

---

## 3) Epics → Stories → Tasks

### EPIC A — Prov‑Ledger v1.1
- **A1. Manifest Root & Signatures**
  - T1. Compute Merkle root over `evidence/` and `transforms/`; store `manifest.root`.
  - T2. Detached signature via cosign + PKI backends; trust policy config.
  - T3. CLI `prov-verify` validates roots, chains; failure codes & exit statuses.
- **A2. Enricher Step‑Hashes**
  - T1. OCR/STT/redaction plug‑ins emit step hashes + tool identity.
  - T2. Backfill pipeline for legacy exhibits.
- **A3. Tamper‑Evident Export**
  - T1. Build exporter to package SBOM, licenses, manifest, sigs.
  - T2. Negative tests: truncated, swapped, or re‑ordered files.

### EPIC B — Contradiction Intelligence UI
- **B1. Density Heatmap**
  - T1. Compute contradiction score per node/edge.
  - T2. Graph layer toggle + legend; perf budget < 120ms render for 10k nodes.
- **B2. Lineage Drill‑in**
  - T1. Panel shows source claims, timestamps, policy labels, confidence.
  - T2. “Why differ?” explainer with feature deltas.
- **B3. Export Report**
  - T1. PDF/JSON export; includes manifest bundle IDs for cited evidence.

### EPIC C — Vector Index Governance
- **C1. Label‑Aware Sharding**
  - T1. Index shards per retention/purpose; readers gated by policy.
- **C2. Recall/Redaction Pipeline**
  - T1. Redact vectors on policy change; write audit trail.
  - T2. Backpressure + progress meter for large cases.

### EPIC D — Enclave Transforms (Alpha)
- **D1. Enclave Profile**
  - T1. Add profile `secure‑transform` (SGX/SEV/TEE‑agnostic abstraction).
  - T2. Attestation log capture; verify on export.

### EPIC E — Ops & Compliance
- **E1. Cost Guard GA**
  - T1. Budget registry v2; unit‑economics dashboard.
  - T2. Gateway hinting: alternative query path + pagination guidance.
- **E2. Chaos Evidence Auto‑Publish**
  - T1. CI uploads drill artifacts to `ops/evidence/` with index.json.
- **E3. Control Mapping**
  - T1. Annotate UI actions with control IDs; auditor export.

---

## 4) Acceptance Criteria
- **Prov‑Ledger v1.1**
  - `prov-verify` exits 0 on good pack, non‑zero on any tamper; includes clear error; covers Merkle & signatures.
  - 100% of enrichers attach step hashes; backfill covers ≥95% legacy.
- **Contradiction UI**
  - Heatmap interactive within perf budget; lineage panel shows all conflicting claims with sources + timestamps.
  - Exported report references manifest IDs; verification passes.
- **Vector Governance**
  - Retention/purpose policies enforceable at query; redaction pipeline audited with reason & operator.
- **Enclave Transforms**
  - Attestation logs linked in export; verifier checks attestation presence for enclave steps.
- **Ops/Compliance**
  - Budget overruns prevented; hints visible; dashboards green.
  - Auditor export lists mapped controls for 10 representative user actions.

---

## 5) Interfaces & Schemas (Scaffolding)

### 5.1 Merkle Root & Signature Files
```text
bundle/
  manifest.json
  manifest.root      # hex Merkle root
  manifest.sig       # detached signature
  evidence/*
  transforms/*
  SBOM.spdx.json
  LICENSES/
```

### 5.2 CLI Exit Codes
```txt
0  OK
10 HASH_MISMATCH
11 MERKLE_MISMATCH
12 SIGNATURE_INVALID
13 ATTESTATION_MISSING
14 SCHEMA_INVALID
```

### 5.3 Graph API — Contradiction Score
```graphql
type Node {
  id: ID!
  contradictionScore: Float! # 0..1
}
```

### 5.4 Vector Governance Policy (excerpt)
```yaml
case:
  id: CASE-123
  purpose: cti
  retention: 1y
  vector_index:
    shards:
      - name: cti-1y
        filter: purpose==cti && retention==1y
        readers: [role:analyst, role:lead]
```

### 5.5 Enclave Profile (values.yaml)
```yaml
secureTransform:
  enabled: true
  attestation: required
  allowedTools: ["ocr-v4", "redactor-v3"]
```

### 5.6 Auditor Export (CSV headers)
```csv
action_id,ui_label,control_ref,evidence_artifact
POLICY_CHANGE,Policy Simulation,SOC2-CC7.2;ISO27001-A.8.33,policy-impact-*.html
EXPORT_DISCLOSURE,Disclosure Pack,SOC2-CC1.2;ISO27001-A.5.32,disclosure-pack-*.tgz
```

---

## 6) Test Plan
- **Verifier:** golden good/bad packs; fuzz re‑orderings; missing files; invalid sigs; enclave‑attest missing.
- **UI Heatmap:** perf harness with 10k nodes; visual snapshot tests; a11y color‑contrast.
- **Vector Governance:** policy toggles trigger redaction; recall latency < P95 5m for 1M vectors.
- **Enclave:** simulate attest fail; ensure export blocks or flags.
- **Ops:** replay top 500 persisted queries; confirm hints and budgets; dashboards & alerts verified.

---

## 7) Ops & Evidence
- CI artifact index published under `ops/evidence/<date>/index.json` with links to chaos runs, PITR, failover, and verifier conformance.
- Grafana v2 panels: contradiction events, vector redaction throughput, budget burn v2.

---

## 8) Documentation & ADRs
- ADR‑047: Verifiable Manifest Roots & Detached Signatures.
- ADR‑048: Contradiction Intelligence Scoring.
- ADR‑049: Vector Governance & Retention‑Purpose Sharding.
- ADR‑050: Enclave Transform Profile & Attestation Handling.
- ADR‑051: SOC2/ISO Control Mapping in Product.
- Playbooks: PB‑P02 (Verifier & Evidence Failures), PB‑G01 (Vector Recall/Redaction), PB‑O02 (Budget Hinting & Overrides).

---

## 9) RACI & Cadence
- **R:** Groves Workstream.  
- **A:** Chief Architect.  
- **C:** Legal/Compliance, SRE, Data Steward, UI Lead.  
- **I:** Seat owners (Wolf, Inman, le Carré), Prov‑Ledger team.

**Ceremonies:** Daily stand‑up; Mid‑sprint demo (2025‑10‑22); Sprint review (2025‑10‑28); Retro + next sprint planning.

---

## 10) Dependencies
- Observability v2 deployed; UI graph overlay hooks; PKI keys & trust policy; Enclave runtime nodes in staging.

---

## 11) Out‑of‑Scope (parking lot)
- Federated multi‑graph search governance.  
- Marketplace compliance scans.  
- Full XAI overlays for ER/forecasting (next‑next sprint).

---

## 12) Shipping Checklist
- [ ] CI green on verifier, contradiction UI, vector governance, enclave profile.  
- [ ] Security scan zero criticals; SBOM updated.  
- [ ] Docs/ADRs merged; control map visible in UI.  
- [ ] Dashboards live; alerts tuned.  
- [ ] Demo script and dataset updated.  
- [ ] Rollback instructions tested.

---

## 13) Appendix — Fixtures & Samples
- `fixtures/prov/case‑beta/` signed bundles with good/bad sigs.  
- `fixtures/graph/contradictions/` synthetic graphs for perf & UX tests.  
- `fixtures/vector/` policy‑labeled shards & redaction sequences.  
- `fixtures/enclave/attest-logs/` good/bad attestations.

---

**No loose ends.** We move, we verify, we leave a paper trail an auditor will salute.

