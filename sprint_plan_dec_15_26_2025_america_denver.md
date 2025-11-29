# Sprint Plan — Dec 15–26, 2025 (America/Denver)

> **Codename:** "Golden Path Beta" (follows Golden Path Alpha)
> **Sprint Goal:** Harden the end-to-end golden path by wiring Proof-Carrying Analytics (PCA) into export, enforcing role/tenant permissions across ingest→query→export, shipping an Authority Compiler MVP, and meeting demo-grade reliability/performance SLOs.

---

## 1) Backlog (stories, AC, estimate)

1. **PCA Manifests in Export Pipeline** — *8 pts*  
   As a reviewer, exported bundles include a `.pcq` (proof cartridge) attached to the manifest; external verifier passes on 3 golden cases.  
   **AC:** Verifier returns PASS on happy-path; FAIL on tampered transform; CLI doc & example.

2. **License Registry v1 (Overrides & Audit Trail)** — *5 pts*  
   As compliance, I can request an override with justification; owners approve/deny; full audit stamped into the manifest.  
   **AC:** Human-readable reason + owner + override trail visible; red/green workflows covered.

3. **Role & Tenant Permissions** — *8 pts*  
   As an analyst, my queries and exports are scoped to my tenant and role; blocked actions show clear reason.  
   **AC:** RBAC matrix implemented; 10 permission tests; cross-tenant leakage test = 0 findings.

4. **NL→Cypher Quality Gate v1** — *5 pts*  
   As an analyst, I see generated Cypher + cost estimate; low-confidence generations are blocked with guidance.  
   **AC:** ≥95% syntactic validity on seed set; confidence gate + rollback works; sandbox still default.

5. **Authority Compiler (MVP)** — *8 pts*  
   As a brief author, I can compile evidence into 3 section types (Findings, Methods, Sources) with citation integrity checks.  
   **AC:** Missing/broken citation blocks publish; export includes sectionized HTML/PDF.

6. **Report Studio v1 Polish** — *3 pts*  
   As a case owner, I can choose redaction presets and get a manifest validation badge on export.  
   **AC:** Presets apply; badge shows PASS/FAIL with linked verifier log.

**Stretch (time-boxed):**

7. **Graph Query Perf Pass** — *3 pts*  
   p95 ≤ 1.5× Alpha on golden questions; traces include token & row counts.

_Total forecast: 40 pts (stretch optional)._  
_Target commit: 32–36 pts (holiday capacity)._ 

---

## 2) Definition of Ready (DoR)

- Stories have AC, flags, dependencies, test data, and a one-pager/wire where UI exists.

## 3) Definition of Done (DoD)

- All AC met; feature flags on stage; demo script updated; docs in repo.  
- Unit + contract tests; one E2E (ingest→query→compile→export) recorded.  
- Security: RBAC tests + STRIDE notes; no critical vulns.  
- Observability: logs, metrics, traces; SLO panel for query p95 and export success.

---

## 4) Capacity & Calendar

- **Known holidays/PTO:** Dec 25 off (+2 floating PTO expected).  
- **Team capacity:** ~32–36 pts (reduced from Alpha).  
- **Ceremonies:**  
  - Sprint Planning: Dec 15, 09:30–11:00  
  - Stand-up: Daily 09:15–09:30  
  - Mid-sprint Refinement: Dec 18, 14:00–14:45  
  - Sprint Review (live demo): Dec 26, 10:00–11:00  
  - Retro: Dec 26, 11:15–12:00

---

## 5) Environments, Flags, Data

- **Envs:** dev → stage (canary) with auto-rollback & schema gates.  
- **Flags:** `pcaInExportV1`, `licenseRegistryV1`, `rbacV1`, `nlCypherGateV1`, `authorityCompilerMVP`, `reportPolishV1`.  
- **Test data:** Golden CSVs + fixture graphs; 3 curated evidence bundles; redaction demo set.

---

## 6) QA Plan

- **Functional:**  
  - PCA: PASS on 3 goldens; FAIL on tamper.  
  - License overrides: approve/deny flows + audit trail.  
  - RBAC: matrix tests; blocked actions show reason.  
  - NL→Cypher: confidence gate, rollback; compile rate metric.  
  - Authority Compiler: citation integrity blocks publish.  
  - Report Studio: presets + manifest badge.  
- **E2E:** Ingest→Query→Compile→Export, manifest verified externally.  
- **Non-functional:** Query p95 & export success SLO, error budgets, canary rollback exercised.

---

## 7) Risks & Mitigations

- **Holiday capacity dips** → commit to 32–36 pts; move stretch to parking lot if burn > plan.  
- **RBAC complexity/regressions** → add contract tests at API layer + seed fixtures.  
- **Low NL→Cypher precision on messy prompts** → confidence gate + human preview; collect false-negatives for training.  
- **PCA verifier drift** → pin schema version; ship example cartridge and CLI in repo.

---

## 8) Reporting Artifacts (to produce)

- Sprint board, burndown, risk register, DOR/DOD checklist, demo script, release notes (stage).  
- SLO dashboard snapshot at start/end of sprint.

---

## 9) Demo Script (review)

1. Upload CSV → Wizard maps → PII/blocked fields explained.  
2. Ask NL question → show Cypher preview + confidence gate → run in sandbox.  
3. Authority Compiler assembles Findings/Methods/Sources; missing citation blocks publish.  
4. Export report → manifest + `.pcq` verify → report shows PASS badge.

---

## 10) Sets up the following sprint ("Golden Path Release")

- Scale Authority Compiler sections/templates; add collaborative edits.  
- Expand license clause models; add owner notifications.  
- Query optimization + partial materialization; external verifier hardening.
