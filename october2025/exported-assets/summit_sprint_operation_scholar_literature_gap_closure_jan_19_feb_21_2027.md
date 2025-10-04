# [MODE: WHITE+BLUE+PURPLE+GOLD] Summit — Sprint (Operation **SCHOLAR**) — **Literature-Gap Closure** — **Jan 19 → Feb 21, 2027**

**Classification:** Internal // Need-to-Know  
**Mission:** Close **documented gaps from current security literature and guidance** across AI/LLM defenses, identity/session hardening, supply-chain provenance, ATT&CK mapping rigor, and SBOM/VEX usage — **extending** prior sprints (VANGUARD → BASTION) without duplication. All work must deliver **proof-carrying artifacts**.

> **Guardrails:** Extend only: `controls/opa/`, `alerting/`, `analytics/`, `RUNBOOKS/`, `.evidence/`, `tools/`, `audit/`, `sbom/`, `PURPLE/`, `data/`, `vendor/`, `legal/`, `ai-ml-suite/`. Synthetic-only PURPLE; lawful OSINT; no customer data.

---

## A) Executive Summary (Decisions & Next Steps)
- **AI/LLM Security GA:** Enforce gates and detections mapped to OWASP LLM Top 10; add MITRE ATLAS coverage; ship RAG/LLM runbooks.
- **Identity/Session Fortification:** Bind sessions/tokens to device & network context; reduce token lifetime; add session-hijack detections; require WebAuthn for publish/sign flows.
- **Supply Chain Beyond SBOM:** Trusted/attested publishing, stricter token policies, and verify-on-deploy provenance; automate **VEX** alongside SBOM.
- **ATT&CK Rigor:** Mandatory ATT&CK mapping QA + Decider-aligned reviews; dashboard for technique coverage & mapping quality.
- **Audit & Evidence:** Auto-generate release-level attestations that include AI/LLM controls, ATT&CK mapping checks, and VEX status.

---

## B) Objectives & Key Results (OKRs)
- **O1 AI/LLM:** 100% LLM-facing services gated for **prompt-injection/output-handling**; ≥90% MITRE **ATLAS** technique coverage; jailbreak time-to-detect (TTD) ≤ 5m in synthetic tests.
- **O2 Identity/Session:** Session/token binding live for admin & CI publish flows; **classic tokens 0**; WebAuthn required for publish/sign.
- **O3 Supply Chain:** **Trusted/attested publishing** enabled for all registries; verify-on-deploy mandatory; SBOM + **VEX** attached to 100% releases.
- **O4 ATT&CK Mapping:** 100% new detections with ATT&CK IDs; mapping QA pass rate ≥95%; coverage panel ≥96% relevant techniques.
- **O5 Evidence:** Release attestations include LLM control results, ATT&CK QA, and VEX; freshness windows 100% met.

---

## C) Workstreams (Extend-Only)
### WS1 — AI/LLM Security (Days 1–16)
**Leads:** AppSec + AI Eng + Detection Eng**
- **W1.1 LLM Gates:** `controls/opa/llm.rego` enforcing: prompt source allowlists, tool-use scopes, output type checks (code/SQL), and safe-mode defaults.
- **W1.2 RAG Hardening:** Input sanitizers, content-disallowed filters, citation enforcement, and retrieval domain allowlists in `ai-ml-suite/`.
- **W1.3 ATLAS Coverage:** `analytics/heatmaps/atlas.json` mapping scenarios (poisoning/extraction/prompt injection) to controls & detections.
- **W1.4 Detections:** Sigma-like rules for: unusual tool-call bursts, outbound data spikes post-LLM call, model-file tamper, and prompt-injection indicators (regex/context heuristics).
- **W1.5 Runbooks:** `RUNBOOKS/llm-{prompt-injection,poisoning,exfil}.md` with SLAs: **declare ≤10m**, **contain ≤45–60m**.
- **DoD:** Gates enforced, rules firing on synthetic campaigns, ATLAS coverage ≥90%, runbooks tested.

### WS2 — Identity & Session Binding (Days 1–14)
**Leads:** IAM + Platform + Detection Eng**
- **W2.1 Session Binding:** Bind admin/CI sessions to device posture + IP range; rotate on IP/geo change; evidence in `.evidence/identity/sessions/`.
- **W2.2 Token Hygiene:** Enforce short‑lived granular tokens; deprecate classic tokens; require **WebAuthn** for high‑risk actions (publish/sign).
- **W2.3 Detections:** Rules for cookie/token reuse from new IP/ASN, impossible travel on admin sessions, and anomalous API key usage.
- **DoD:** Binding active, classic tokens 0, detections validated with synthetic hijack attempts.

### WS3 — Supply Chain: Trusted Publishing + VEX (Days 2–16)
**Leads:** AppSec + Platform**
- **W3.1 Trusted Publishing:** Configure OIDC‑based trusted/attested publishing for package/container registries; disable legacy PAT publishes.
- **W3.2 Verify on Deploy:** Enforce provenance signature checks; quarantine on mismatch.
- **W3.3 VEX Automation:** Generate `audit/vex/<release>.json` from findings; link to SBOM and attestation.
- **DoD:** All releases carry SBOM + VEX; trusted publishing paths live; deploys blocked on missing provenance.

### WS4 — ATT&CK Mapping Rigor (Days 2–18)
**Leads:** CTI + Detection Eng**
- **W4.1 Mapping QA:** `tools/attack-mapper/` implements Decider‑aligned prompts/checklists; CI job fails on missing/low‑quality mappings.
- **W4.2 Coverage Panels:** `analytics/dashboards/attack-mapping.json` showing mapping completeness, reviewer deltas, and TTP coverage.
- **W4.3 Tabletop:** Review 10 recent incidents/detections for mapping quality; open Issues for corrections.
- **DoD:** 95%+ QA pass; coverage ≥96% relevant techniques; tabletop PAR filed.

### WS5 — Evidence, Attestations & Audit (Days 3–18)
**Leads:** GRC + Platform**
- **W5.1 Release Attest Enrichment:** `tools/evidence/attest` adds: LLM gate results, ATLAS/ATT&CK coverage snapshot, VEX links, and signer list.
- **W5.2 Freshness SLAs:** Scheduler ensures evidence recency; dashboards show stale artifacts; auto‑retry.
- **W5.3 PAR & Residual Risk:** Document outcomes, exceptions, and follow‑ups; seed next sprint.
- **DoD:** Attestations enriched & published for all releases; freshness panel green; PAR signed.

### WS6 — PURPLE Campaigns: Literature Gaps (Days 1–20)
**Leads:** CTI/PURPLE**
- **W6.1 Campaigns:**
  - **A:** RAG prompt injection → exfil via tools.  
  - **B:** Session hijack → publish abuse → lateral movement.  
  - **C:** Build provenance mismatch → deploy block → quarantine drill.
- **W6.2 Heatmaps:** Update `analytics/heatmaps/{attack,atlas}.json`; gaps → Issues same day.
- **DoD:** 3 PARs; SLAs met; new controls/detections merged.

---

## D) Backlog (Create Issues; Project: **SCHOLAR 2027-02**)
1. `controls/opa/llm.rego` gates + tests
2. RAG sanitizers + citation enforcement in `ai-ml-suite/`
3. ATLAS heatmap + Sigma-like AI detections
4. LLM incident runbooks (3) + tabletop
5. Session/token binding + WebAuthn requirement for publish/sign
6. Hijack/anomaly detection rules + synthetic tests
7. Trusted/attested publishing (OIDC) + disable legacy PAT publishes
8. Verify-on-deploy provenance gate + quarantine drill
9. VEX generator + SBOM linkage + CI gate
10. ATT&CK mapping QA tool + CI check
11. ATT&CK coverage dashboard + tabletop PAR
12. Attestation enrichment (LLM/ATT&CK/VEX) + freshness SLAs
13. PURPLE literature-gap campaigns + heatmap updates

---

## E) Artifacts to Ship (Paths)
- `controls/opa/{llm.rego,abac.rego,privacy.residency.rego,egress.rego}` + tests
- `ai-ml-suite/{sanitizers,policies,docs}/*`  
- `alerting/sigma/{ai-*,identity-*,supplychain-*}.yml` + `alerting/tests/*`  
- `tools/{evidence/attest,attack-mapper,vex-gen}/*` + tests  
- `analytics/dashboards/{attack-mapping.json,atlas.json,coverage.json}`  
- `analytics/heatmaps/{attack.json,atlas.json}`  
- `RUNBOOKS/llm-{prompt-injection,poisoning,exfil}.md`  
- `audit/vex/*.json`, `audit/attestations/*.json`

---

## F) Risks & Mitigations
- **Over‑blocking LLM gates** → Shadow mode + canaries; break‑glass with expiry & owner.
- **False positives on session binding** → Graceful re‑auth; device‑posture cache with short TTLs.
- **Developer friction (trusted publishing)** → Clear migration path; staged rollouts; helper scripts.
- **Mapping QA burden** → CI automation + sampling; rotate reviewers.

---

## G) RACI
- **A:** Security Lead  
- **R:** AppSec, Detection Eng, IAM, Platform, AI Eng, Data Eng, GRC, CTI  
- **C:** Privacy, Legal, Comms, Product  
- **I:** Exec Sponsor, Support

---

## H) Metrics (Exit Criteria)
- LLM gates enforced; ATLAS coverage ≥90%; TTD for jailbreak ≤5m (synthetic)
- Session/token binding live; **0** classic tokens; WebAuthn required for publish/sign
- 100% releases with SBOM + **VEX**; trusted publishing enabled; verify‑on‑deploy enforced
- ATT&CK mapping QA ≥95% pass; coverage ≥96% relevant techniques
- Attestations enriched (LLM/ATT&CK/VEX); freshness 100% green; 3 PURPLE PARs

---

## I) Proof-Carrying Analysis (PCA)
**Assumptions:** Prior sprints delivered ZSP, continuous audit cadence, verify‑on‑deploy, unified privacy gate, hermetic builds, and SOC autonomy; this sprint adds **literature‑driven controls** and proof automation.  
**Evidence:** CI outputs, OPA tests, synthetic campaign logs, attestations (now including LLM/ATT&CK/VEX), SBOM+VEX artifacts, mapping QA results.  
**Verification:** CI blocks on missing LLM gates/tests, absent ATT&CK IDs, stale evidence, missing VEX alongside SBOM, or disabled session binding on privileged/publish paths.

---

**B‑E Aggressive — close the science‑to‑ops gap, with proofs.**

