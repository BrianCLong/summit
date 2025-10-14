# General Counsel Workstream — Q4 Cadence Sprint 1 (v1)

**File:** gc-legal-governance-q4-2025-10-06_to_2025-10-17-sprint-01  
**Role:** I. Foster Dullness, LL.M. — General Counsel (Lawfare, Policy, Governance, Disclosure)  
**Window:** **Oct 6 – Oct 17, 2025** (aligns with platform/Angleton Sprint 1)  
**Mandate:** Close governance + compliance gaps; harden release gate with evidence; ship policy‑as‑code and disclosure packs that interlock with Maestro/Intelgraph sprints.

---

## 0) Source Alignment (Read‑In)
**Observed sprints & artifacts in repo:**
- Co‑CEO Governance Sprint (Oct 20–Oct 31) — hardened release path, audit/provenance, disclosure‑first demos.  
- Intelgraph & Maestro cadence — Q4 multi‑lane sprints including SecDevOps hardening, provenance monitoring, residency, step‑up auth, DR, quotas, SLOs, anomaly, autoremediation.  
- “Drift Harness & Replay” + Explainability/Fingerprint concepts (registry, prompt canon sets).  
- Platform docs for release orchestration and summit cadence.

**Implication for Legal lane:** our gate must prove: (a) rights to ship, (b) privacy/AI safety posture, (c) regional residency controls, (d) export/classification, (e) public claims substantiation, (f) incident readiness, (g) auditability.

---

## 1) Gap Assessment (Legal/Policy/Compliance)
1. **Evidence‑Backed Release Gate not uniformly codified.** Needs a single, repo‑portable checklist + machine‑verifiable artifacts.
2. **Data Protection & Residency:** Residency toggles exist in engineering plan; legal mapping (DPA/SCC/UK IDTA/Swiss addendum, data transfer TIAs) not packaged per‑tenant.
3. **AI Governance:** Model provenance, evals, prompt canon, fingerprint registry not yet tied to policy & public claims controls; red‑teaming/disclosure lanes missing.
4. **Third‑Party/OSS:** SBOM exists ad‑hoc; license scanning, patent clearance, and component attestations are not integrated into the gate.
5. **Security/Privacy by Design SOPs:** PR template mentions, but no signed “Design Review Memo” or DPIA/PbD notes attached to PRs.
6. **Export/Sanctions:** No consistent ECCN/classification + denied‑party screening step for paid features; region sharding implies control obligations.
7. **Regulatory Mapping:** SOC 2‑adjacent controls exist technically; policy statements, control narratives, and testable control IDs not linked.
8. **Crisis Comms & Legal Hold:** Incident runbook present in engineering vibe; legal notification SLAs, disclosure decision tree, and litigation hold triggers absent.

---

## 2) Sprint Goal (Two‑Week Outcome)
**“Every shipping repo passes the same legal release gate with machine‑verifiable artifacts: privacy, AI, IP/OSS, export, claims, and incident readiness.”**

**Definition of Done**
- Gate runs in CI, outputs a versioned **Disclosure Pack** (ZIP/JSON + markdown) attached to the release.
- Each pack has green checks for: **DPA mapping**, **AI model sheet**, **eval summary**, **SBOM & license clearance**, **export check**, **claims substantiation**, **incident readiness**, **audit log pointers**.
- At least **2 product repos** pass the gate in this sprint (pilot), with issues logged & fixed.

---

## 3) Deliverables (Ship This Sprint)
1. **Policy‑as‑Code Gate** (OPA/Rego + scripts) — minimal ruleset (see §7).  
2. **Disclosure Pack Template** (see §6) — markdown + JSON schema.  
3. **Data Protection Bundle** — DPA/DTS/TIA scaffold per tenant/region.  
4. **AI Governance Kit** — Model Sheet, Eval Log, Prompt Canon registry link, Fingerprint stub.  
5. **OSS/IP Clearance** — SBOM ingestion + license policy, patent scan checklist.  
6. **Export & Sanctions Check** — ECCN matrix, geo controls, denied‑party checklist.  
7. **Security/Privacy by Design SOP** — short form DPIA + Design Review Memo template.  
8. **Incident & Disclosure Playbook** — notifiable events matrix, regulator timelines, legal hold SOP.  
9. **Control Narrative Map** — SOC2/ISO control IDs ↔ gate checks crosswalk.

---

## 4) Work Plan (Swimlanes & Tasks)
**Lane A — Gate & CI Integration**  
- A1. Add `/.legal/gate.rego` + `/.legal/run_gate.sh` to pilot repos.  
- A2. Wire to CI (GitHub Actions or Maestro Job).  
- A3. Fail build on red; publish `disclosure-pack.tgz` as artifact.

**Lane B — Evidence & Templates**  
- B1. Draft Disclosure Pack v0.9 (see §6).  
- B2. Generate **SBOM** (Syft or native) and run license policy.  
- B3. Populate **Model Sheet** & **Eval Summary** from existing drift/replay data.

**Lane C — Data Transfer & Residency**  
- C1. Tenant residency map → TIA stub + SCC selection.  
- C2. DPA addendum boilerplate per region (EU/UK/CH).  
- C3. Map DR/Failover plan to data transfer safety measures.

**Lane D — Export & Sanctions**  
- D1. Classification memo (ECCN/ETR) for core features.  
- D2. Denied‑party checklist before enabling paid features.  
- D3. Region sharding enforcement note (config proof).

**Lane E — Incident Readiness**  
- E1. Incident taxonomy & thresholds.  
- E2. 72‑hour privacy‑breach clock SOP (EU/CO/US states).  
- E3. Legal hold trigger + preservation kit.

---

## 5) Dependencies & RACI
**Dependencies:** SBOM tooling; provenance/audit logs; residency switches; prompt canon/fingerprint registry; DR documentation; CI access.

**RACI:**  
- **Responsible:** GC (this lane) for gate rules, packs, legal artifacts.  
- **Accountable:** Co‑CEO Governance for release readiness; Chief Architect for CI gate adoption.  
- **Consulted:** SecDevOps, Data Protection Officer, ML Lead (evals/fingerprints), Export Counsel.  
- **Informed:** Sales/BD (claims), Support/IR lead, External Auditors.

---

## 6) Disclosure Pack — Structure (v0.9)
```
/disclosure/
  release.json                 # metadata: repo, commit, region, features, models
  claims.md                    # shipping claims, substantiation links, caveats
  privacy/
    dpia.md                    # short-form DPIA
    dpa_map.md                 # processors, SCC/IDTA, residency
    tiA.md                     # transfer impact assessment stub
  ai/
    model_sheet.md             # model provenance, training inputs (high level), eval risks
    eval_summary.md            # evals run, thresholds, regressions, drift notes
    fingerprint.txt            # model/prompt fingerprint/commit ids
  oss/
    sbom.json                  # SBOM
    license_clearance.md       # policy results, exceptions
    patents_checklist.md       # search/log of any conflicts
  export/
    eccn_matrix.md             # classification & geo controls
    denied_party_checklist.md  # pre‑enablement check
  security/
    design_review.md           # security & privacy by design memo
    threat_model.md            # optional link/summary
  incident/
    notifiability_matrix.md    # thresholds & jurisdictions
    legal_hold.md              # hold triggers & custodians
  controls_map.md              # SOC2/ISO/AI‑policy mapping
```

---

## 7) Policy‑as‑Code — Minimal Ruleset (Rego Sketch)
```rego
package legal.gate

default allow := false

# Require SBOM and license clearance
sbom_present { input.artifacts.sbom == true }
license_ok    { input.results.license_policy == "green" }

# Require DPIA for features touching PII
needs_dpia { some f in input.features; f.pii == true }

dpia_ok { needs_dpia; input.artifacts.dpia == true }
dpia_ok { not needs_dpia }

# Require AI evals when model behavior changes
model_changed { input.models.delta == true }
evals_ok { model_changed; input.results.evals.passed == true }
evals_ok { not model_changed }

# Export/sanctions checks for paid features
paid { input.features.paid == true }
export_ok { paid; input.results.export_check == "green" }
export_ok { not paid }

# Final decision
allow { sbom_present; license_ok; dpia_ok; evals_ok; export_ok }
```

**CI shim (`run_gate.sh`)**
```bash
#!/usr/bin/env bash
set -euo pipefail
# Collect inputs and write gate_input.json
python .legal/collect_inputs.py > .legal/gate_input.json
opa eval --format pretty --data .legal/gate.rego --input .legal/gate_input.json 'data.legal.gate.allow' | grep true
# Package disclosure pack
 tar -czf disclosure-pack.tgz disclosure/
```

---

## 8) Templates (Drop‑in)

### 8.1 Short‑Form DPIA (1–2 pages)
```
# DPIA — <Product/Feature> (<Release/Commit>)
- Purpose & lawful basis:
- Data categories & sources:
- Processing operations:
- Controllers/Processors:
- Storage/Residency:
- Risks (likelihood x impact) & mitigations:
- Residual risk & sign‑off (DPO/GC):
```

### 8.2 Model Sheet (Public‑Shareable)
```
# Model Sheet — <Model/Version>
- Intended use & limitations:
- Training sources (high‑level):
- Safety mitigations & evals run:
- Known failure modes:
- Update policy & fingerprint:
```

### 8.3 Eval Summary (Attach Metrics)
```
# Evals — <Release>
- Tests run & thresholds:
- Regressions (if any) and waivers:
- Drift notes & fingerprint IDs:
```

### 8.4 License Policy (SBOM Gate)
```
# License Policy
- Allowed: MIT/BSD/Apache‑2.0/…
- Review: MPL/LGPL/CDDL/… (component‑level notice)
- Prohibited without waiver: GPL‑2.0‑only, AGPL‑3.0‑only, SSPL, non‑standard
- Dual‑licensing/patent clauses: flag for counsel
- Third‑party notices bundle: generated per release
```

### 8.5 Export & Sanctions Checklist
```
# Export Check — <Release>
- ECCN/ETR classification:
- Crypto/functionality flags:
- Geo controls enforced (config proof):
- Denied‑party screen completed (date/time):
- End‑use restrictions noted:
```

### 8.6 Claims Substantiation
```
# Public Claims — <Release>
- Marketing claims list:
- Evidence links (benchmarks, evals, provenance):
- Disclaimers & safe harbors:
- Approval: GC + Product
```

### 8.7 Incident & Disclosure Matrix
```
# Notifiability Matrix
- Severity levels & criteria
- Privacy breach timer start conditions (EU/UK/US state)
- Regulator/jurisdiction contact table & SLAs
- Customer notification thresholds & templates
- Legal hold triggers & custodian list
```

---

## 9) Control Narrative Crosswalk (seed)
| Gate Check | SOC 2 | ISO 27001 | AI Policy | Notes |
|---|---|---|---|---|
| SBOM & License | CC8.1/8.2 | A.8.1 | IP‑01 | OSS inventory & risk |
| DPIA & PbD | CC7.x | A.6/A.8 | PR‑01 | Feature‑level privacy |
| AI Evals | N/A | N/A | AI‑03 | Risk‑based evals |
| Export/Sanctions | CC1.2 | A.5 | REG‑02 | ECCN & geo gates |
| Incident & Hold | CC7.3 | A.5/A.16 | IR‑02 | Timelines & legal hold |
| Claims Pack | CC2.3 | A.5 | GOV‑01 | Truth‑in‑advertising |

---

## 10) Acceptance Criteria & Demos
- **CI shows green gate** for two pilot repos with artifact links.
- **Disclosure Packs** reviewable in PR; zero P0 issues.
- **One public‑safe Model Sheet** published.
- **One export classification memo** completed.

**Demo:** Run release job → show gate passing, open pack, display eval summary + SBOM + residency/TIA snippet.

---

## 11) Risks & Mitigations
- **Time squeeze** → scope minimal ruleset; expand next sprint.  
- **Tooling variance** → ship a repo‑portable `.legal/` folder.  
- **Red tape vs speed** → waivers w/ expiry and audit log.  
- **Claims drift** → lock claims list in pack; marketing cannot publish without link.

---

## 12) Next Sprint (Preview: Oct 20 – Oct 31, 2025)
- Expand AI eval policies (fairness/abuse tests); automate claims diff.  
- Add **TPIA** (third‑party impact) for upstream model vendors.  
- Wire **Explainability API** and Fingerprint registry into packs.  
- Pilot external auditor review on control narratives.

---

## 13) Operating Cadence
- **Daily:** PR gate triage & waivers review.  
- **Tue/Thu:** Joint stand‑up with SecDevOps + ML evals.  
- **Fri:** Disclosure review + claims freeze for Monday release.

---

## 14) Scaffolding — Repo Drop‑Ins
```
/.legal/
  gate.rego
  run_gate.sh
  collect_inputs.py         # stub to gather CI/env signals
  templates/
    dpia.md
    model_sheet.md
    eval_summary.md
    license_policy.md
    export_check.md
    claims.md
    incident_matrix.md
    controls_map.md
```

> **Ship clean, green, and provable. The gate is our sword and our shield.**

