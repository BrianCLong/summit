# Sprint Packet — Security, Governance, Provenance & Ops (Groves Workstream)

**Cadence:** 2025‑11‑12 → 2025‑11‑25 (2 weeks)  
**Role / Workstream:** Leslie Groves — Engineer’s Seat (Compartmentation, accreditation, provenance, SRE)  
**Alignment:** Q4 close‑out to GA; Audit‑Pack v1 in the wild; Continuous Authorization rollout; Regulator Portal (alpha); Cross‑org disclosure exchange draft  
**Status Target:** Ship **clean/green** features with evidence; move external‑facing compliance surfaces from alpha → usable

---

## 0) Roll‑forward & Context
**From Sprint‑03:** Verifier plugins, Appeals & Ombuds, ConAuth hooks, Vector Gov v2, Cost Guard v2, Residency enforcement, Audit‑Pack v1.  
**Carry‑over debt:**
- ConAuth client listeners not implemented in legacy UI views.  
- Residency exceptions workflow lacks approval chain.  
- Optimizer hints missing 3 rewrite patterns for graph queries.

**This sprint:** open the compliance aperture: regulator read‑only portal (alpha), cross‑org disclosure exchange (DXF) draft, policy blue/green, posture scanning, and privacy tooling.

---

## 1) Objectives (Definition of Victory)
1) **Regulator Portal (Alpha, Read‑Only):** external viewer for Audit‑Pack + Prov bundles with embedded verification; no tenant data mutation.  
2) **Disclosure eXchange Format (DXF v0.9):** portable, signed case disclosure format w/ manifest roots, attestation references, and minimal PII.  
3) **Policy Blue/Green + Shadow Prod:** safe rollout with mirrored decisions + drift dashboard; auto‑rollback on error rate/regression.  
4) **Posture Scanner (Controls):** continuous checks for policy, residency, budget, and audit coverage; red/yellow/green posture board.  
5) **Privacy & DSAR Toolkit:** export subject lookup with provenance trail; redaction receipts; operator approval gates.  
6) **ConAuth Full Rollout:** legacy UI wired to real‑time invalidations; < 60s propagation measured in‑product.  
7) **Chaos GameDay Automation:** one‑button scenario runner with evidence bundling to `ops/evidence/`.

---

## 2) Deliverables
- **D1. Regulator Portal (Alpha)**
  - Static, signed bundle viewer: upload `audit-pack-*.tgz` → parse → display policies, manifests, signatures, SLO and chaos evidence.
  - Built‑in verify (web‑assembly `prov-verify-wasm`) + human‑readable summaries.
  - Access model: invitation‑based, time‑boxed, read‑only; watermarking; download logs.
- **D2. DXF v0.9**
  - `schema/dxf/0.9/dxf.schema.json` + samples; signing profile; license and jurisdiction blocks.
  - Exporter from Report Studio; importer to Portal.
- **D3. Policy Blue/Green + Shadow**
  - Shadow decision channel (no‑deny) to compare old vs new; drift report; thresholded cutover with auto‑rollback.
- **D4. Posture Scanner**
  - Engine that evaluates controls: OPA policy coverage, residency pins, budget rules, audit/appeals wiring; Grafana panel + weekly report.
- **D5. Privacy/DSAR**
  - Subject locator with policy labels; redaction pipeline with receipts; DSAR export pack builder.
- **D6. ConAuth Rollout**
  - Legacy UI listeners; dashboard for invalidation latencies; synthetic toggles.
- **D7. GameDay Runner**
  - Scenario YAML → orchestrated failures (broker/db/gateway) → evidence bundle with timestamps and SLO results.

**Artifacts:** schemas, WASM build, CLI tools, dashboards, ADRs, playbooks, fixtures.

---

## 3) Epics → Stories → Tasks

### EPIC A — Regulator Portal (Alpha)
- **A1. Bundle Loader & Parser**  
  - T1. Validate `audit-pack` index.json; list artifacts; size/sha checks.  
- **A2. WASM Verifier**  
  - T1. Port `prov-verify` core to WASM; offline verify in browser.  
  - T2. UI for successes/failures; download evidence button.  
- **A3. Access & Watermark**  
  - T1. Invite tokens; time limits; watermark on view/download; audit log lines.

### EPIC B — DXF v0.9
- **B1. Schema & Profiles**  
  - T1. Core schema; `minimal`, `full`, and `air‑gap` profiles.  
- **B2. Export/Import**  
  - T1. Exporter in product; importer in Portal; round‑trip tests.  

### EPIC C — Policy Blue/Green
- **C1. Shadow Channel**  
  - T1. Emit old+new policy decisions with reasons; store deltas.  
- **C2. Drift Dashboard**  
  - T1. Grafana visual; alert when drift > threshold; auto‑rollback job.

### EPIC D — Posture Scanner
- **D1. Controls Engine**  
  - T1. Evaluate rules on schedule; write posture score.  
- **D2. Surfacing**  
  - T1. Panel + weekly PDF to stakeholders.

### EPIC E — Privacy & DSAR
- **E1. Subject Locator**  
  - T1. Multi‑selector search with governance labels.  
- **E2. Redaction & Receipts**  
  - T1. Redaction job that emits signed receipts; attach to case.

### EPIC F — ConAuth Rollout
- **F1. Legacy Listeners**  
  - T1. Websocket/pubsub client for old views; interception on sensitive ops.  
- **F2. Latency Dashboard**  
  - T1. Measure end‑to‑end invalidation times; SLO and alerts.

### EPIC G — Chaos GameDay
- **G1. Scenario Orchestrator**  
  - T1. Scenario YAML to actions; capture metrics and screenshots.  
- **G2. Evidence Packager**  
  - T1. Tar evidence with index.json; link to Audit‑Pack.

---

## 4) Acceptance Criteria
- **Portal:** loads and verifies an `audit-pack` fully offline; no data mutation paths; watermarked views; audit logs present.  
- **DXF:** schema validated; exporter/importer round‑trip ok; signatures verify; PII minimized in `minimal` profile.  
- **Blue/Green:** drift dashboard active; auto‑rollback triggers on >1% deny delta; change log captured.  
- **Posture Scanner:** red/yellow/green board shows daily; weekly PDF delivered; ≥90% controls green.  
- **Privacy/DSAR:** subject export bundle generated; redaction receipts attached; approval steps logged.  
- **ConAuth:** legacy views reflect role/consent changes ≤60s P95.  
- **GameDay:** one‑click run produces evidence bundle; SLOs enforced.

---

## 5) Interfaces & Schemas (Scaffolding)

### 5.1 DXF Core (excerpt)
```json
{
  "$id": "https://example.org/dxf/0.9/schema",
  "type": "object",
  "required": ["caseId","manifestRoot","signatures","jurisdiction","artifacts"],
  "properties": {
    "caseId": {"type": "string"},
    "manifestRoot": {"type": "string"},
    "signatures": {"type": "array"},
    "jurisdiction": {"type": "string"},
    "artifacts": {"type": "array", "items": {"$ref": "#/defs/artifact"}}
  },
  "defs": {"artifact": {"type": "object","required": ["id","sha256","path","labels"],"properties": {"id": {"type":"string"},"sha256": {"type":"string"},"path": {"type":"string"},"labels": {"type":"object"}}}}
}
```

### 5.2 Blue/Green Shadow Event
```json
{
  "resourceId": "N‑123",
  "oldPolicy": {"allow": true, "reason": "ABAC:compartment"},
  "newPolicy": {"allow": false, "reason": "legalBasis:none"},
  "delta": "ALLOW→DENY",
  "ts": "2025‑11‑18T12:01:03Z"
}
```

### 5.3 Posture Rule (example)
```yaml
rule: residency_pins
expr: all(evidence, e.region in allowed_regions_by_tenant[e.tenant])
sev: high
```

### 5.4 DSAR Redaction Receipt (JSON)
```json
{"case":"CASE‑77","subject":"subj‑abc","itemsRedacted":42,"by":"operator‑01","at":"2025‑11‑21T08:11:00Z","sig":"…"}
```

### 5.5 GameDay Scenario (YAML)
```yaml
name: broker‑flap‑and‑db‑failover
steps:
  - kill: broker/leader
  - waitFor: 60s
  - failover: db/replica‑promote
  - assert: slo.latency.p95 < 1200ms
```

---

## 6) Test Plan
- **Portal:** fixtures with good/bad packs; offline only; a11y checks.  
- **DXF:** schema tests; signature tamper cases; size limits.  
- **Blue/Green:** shadow logs over 24h; trigger synthetic regressions; verify auto‑rollback.  
- **Posture:** seed missing labels/residency pins; verify red; remediation turns green.  
- **Privacy:** DSAR flow with approvals; receipts signed and attached; denial path tested.  
- **ConAuth:** toggle roles/consent; latency histogram.  
- **GameDay:** scenario run produces evidence; tarball verified.

---

## 7) Ops & Evidence
- Portal access logs; DXF export/import logs; shadow drift reports; posture board feed; DSAR receipts; GameDay evidence published to `ops/evidence/<date>/`.

---

## 8) Documentation & ADRs
- ADR‑057: Regulator Portal (Read‑Only, Offline Verify).  
- ADR‑058: DXF v0.9 Disclosure Exchange.  
- ADR‑059: Policy Blue/Green & Shadow Channel.  
- ADR‑060: Posture Scanner & Control Scoring.  
- ADR‑061: DSAR Receipts & Approvals.  
- Playbooks: PB‑C03 (Portal Ops), PB‑P03 (DXF Interop), PB‑S01 (Policy Blue/Green), PB‑R02 (DSAR Handling), PB‑G03 (GameDay Automation).

---

## 9) RACI & Cadence
- **R:** Groves Workstream.  
- **A:** Chief Architect.  
- **C:** Legal/Compliance, SRE, Data Steward, UI Lead, Platform, Privacy.  
- **I:** Seat owners; Sales Eng (external sharing), Audit & Reg Affairs.

**Ceremonies:** Daily stand‑up; Mid‑sprint demo (2025‑11‑19); Sprint review (2025‑11‑25); Retro + next sprint planning.

---

## 10) Dependencies
- WASM build pipeline; portal hosting with signed URLs; PKI keys and trust policy; Grafana access; privacy approval chain; chaos staging cluster.

---

## 11) Out‑of‑Scope (parking lot)
- Federated multi‑graph governance (cross‑company).  
- Marketplace compliance scans.  
- Regulator write‑back/comments (post‑alpha).

---

## 12) Shipping Checklist
- [ ] CI green: portal wasm, DXF exporter/importer, blue/green shadow, posture scanner, DSAR receipts, legacy ConAuth listeners, GameDay runner.  
- [ ] Security scan zero criticals; SBOM updated.  
- [ ] Docs/ADRs merged; playbooks published.  
- [ ] Dashboards live; alerts tuned; posture ≥90% green.  
- [ ] Demo script & datasets updated.  
- [ ] Rollback instructions tested.

---

## 13) Appendix — Fixtures & Samples
- `fixtures/portal/` audit‑packs (good/bad).  
- `fixtures/dxf/` minimal/full/air‑gap samples.  
- `fixtures/policy/shadow/` drift cases.  
- `fixtures/posture/` failing/green scenarios.  
- `fixtures/privacy/` DSAR samples with approvals.  
- `fixtures/gameday/` scenario YAMLs + expected evidence.

---

**No mercy for drift.** We expose, verify, and operationalize governance — outside eyes welcome, the evidence is ready.

