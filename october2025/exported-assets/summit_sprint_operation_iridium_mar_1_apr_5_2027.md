# [MODE: WHITE+BLUE+PURPLE+GOLD] Summit — Sprint (Operation **IRIDIUM**) — **Mar 1 → Apr 5, 2027**

**Classification:** Internal // Need-to-Know  
**Mission:** Operationalize SCHOLAR outcomes into **always-on, low-toil, provably compliant defenses**. Priorities: LLM gate GA with abuse-resistant tooling, session-binding everywhere that matters, trusted publishing at scale with SBOM+VEX, ATT&CK/ATLAS mapping quality, and continuous evidence streams — **extending prior sprints only; no duplication**.

> **Guardrails:** Extend paths only: `controls/opa/`, `alerting/`, `analytics/`, `RUNBOOKS/`, `.evidence/`, `tools/`, `audit/`, `sbom/`, `PURPLE/`, `data/`, `vendor/`, `legal/`, `ai-ml-suite/`. Synthetic-only PURPLE; lawful OSINT; no customer data.

---

## A) Executive Summary (Decisions & Next Steps)
- **LLM Security → GA:** Enforce OWASP LLM T10 gates + ATLAS coverage with synthetic tests and runbooks.
- **Identity & Sessions:** Session/token binding across admin, CI, and publish/sign; WebAuthn enforced for high-risk flows.
- **Supply Chain Proofs:** Trusted/attested publishing GA; verify-on-deploy required; SBOM+VEX auto-generated per release.
- **Mapping Quality:** CI QA for ATT&CK/ATLAS mapping; dashboards & reviewer workflow.
- **Evidence Engine:** Attestation enrichment (LLM/ATT&CK/VEX) + freshness SLOs; auto-retry & variance sampling.

---

## B) Objectives & Key Results (OKRs)
- **O1 LLM Security:** Gates enforced on 100% LLM-facing services; ATLAS coverage ≥ 92%; synthetic jailbreak **TTD ≤ 5m**.
- **O2 Sessions:** Session/IP/device binding active on admin/CI/publish; classic tokens **0**; WebAuthn required for publish/sign.
- **O3 Supply Chain:** Trusted publishing GA; verify-on-deploy 100%; releases carry SBOM + **VEX**; quarantine MTTR **< 12h**.
- **O4 Mapping QA:** 100% new detections mapped; QA pass rate ≥ 96%; coverage panel ≥ 96% relevant techniques.
- **O5 Evidence:** Attestations enriched; freshness windows 100% green; zero critical audit rehearsal gaps.

---

## C) Workstreams (Extend-Only)
### WS1 — LLM Security GA (Days 1–16)
**Leads:** AppSec + AI Eng + Detection Eng
- **W1.1 Policy:** `controls/opa/llm.rego` → GA (prompt source allowlists, tool-scope, output type checks, safe mode).
- **W1.2 RAG Hardening:** `ai-ml-suite/` add sanitizers, retrieval allowlists, citation-enforcement middleware.
- **W1.3 Detections:** `alerting/sigma/ai-*.yml` for prompt-injection indicators, tool-burst anomalies, post-call exfil spikes, model tamper.
- **W1.4 Runbooks:** `RUNBOOKS/llm-{prompt-injection,poisoning,exfil}.md` finalized with SLAs.
- **DoD:** Synthetic campaigns pass; alerts route; runbooks tested; coverage (ATLAS) ≥ 92%.

### WS2 — Identity & Session Binding (Days 1–14)
**Leads:** IAM + Platform + Detection Eng
- **W2.1 Bind & Rotate:** Bind sessions/tokens to device & IP; rotate on posture/geo change; evidence in `.evidence/identity/sessions/`.
- **W2.2 WebAuthn Gate:** Require WebAuthn for publish/sign and admin escalation; smoke tests.
- **W2.3 Detections:** Rules for reuse from new IP/ASN, impossible travel, anomalous API key usage; synthetic hijack tests.
- **DoD:** Binding live; classic tokens 0; detections verified; WebAuthn enforced.

### WS3 — Supply Chain GA (Days 2–16)
**Leads:** AppSec + Platform
- **W3.1 Trusted Publishing:** OIDC-based trusted/attested publishing for pkg/container registries; disable PAT-based publish.
- **W3.2 Verify on Deploy:** Enforce provenance signature checks; quarantine on mismatch; drill runbook.
- **W3.3 VEX Automation:** `tools/vex-gen` produces `audit/vex/<release>.json`; CI ensures SBOM+VEX attached to artifacts.
- **DoD:** 100% releases with SBOM+VEX; verify-on-deploy enforced; quarantine MTTR < 12h.

### WS4 — ATT&CK/ATLAS Mapping QA (Days 2–18)
**Leads:** CTI + Detection Eng
- **W4.1 Mapper Tool:** `tools/attack-mapper` (Decider-aligned) with CI check; PRs fail on missing/low-quality mappings.
- **W4.2 Coverage Panels:** `analytics/dashboards/attack-mapping.json` + `atlas.json` with reviewer deltas.
- **W4.3 Tabletop Review:** 10 recent detections/incidents mapping QA; Issues opened/closed in-sprint.
- **DoD:** QA pass ≥ 96%; relevant coverage ≥ 96%; PAR filed.

### WS5 — Evidence Engine & Audit (Days 3–18)
**Leads:** GRC + Platform
- **W5.1 Attest Enrichment:** `tools/evidence/attest` includes LLM/IAM results, ATLAS/ATT&CK snapshot, VEX links.
- **W5.2 Freshness SLOs:** `tools/evidence/scheduler` variance sampling & auto-retry; dashboard `analytics/dashboards/audit.json`.
- **W5.3 Rehearsal:** Type II-style walkthrough; zero critical gaps; PAR published.
- **DoD:** Enriched attestations on all releases; dashboard green; PAR signed.

### WS6 — PURPLE Campaigns (Days 1–20)
**Leads:** CTI/PURPLE
- **W6.1 Scenarios:** (A) RAG prompt injection → exfil via tools; (B) session hijack → publish abuse; (C) provenance mismatch → quarantine.
- **W6.2 Heatmaps:** Update `analytics/heatmaps/{attack,atlas}.json`; gaps → Issues same day.
- **DoD:** 3 PARs; SLAs met; fixes merged.

---

## D) Backlog (Create Issues; Project: **IRIDIUM 2027-04**)
1. `llm.rego` GA + tests; RAG sanitizers & citation enforcement
2. AI Sigma rules + synthetic generators + runbooks
3. Session/token binding + WebAuthn requirement (publish/sign)
4. Hijack/anomaly detection rules + tests
5. Trusted publishing (OIDC) + disable legacy PAT
6. Verify-on-deploy gate + quarantine drill
7. VEX generator + CI enforcement + SBOM linkage
8. ATT&CK/ATLAS mapping QA tool + CI
9. Mapping dashboards + tabletop PAR
10. Attestation enrichment + freshness SLOs + dashboard
11. PURPLE literature-gap campaigns + heatmap updates

---

## E) Artifacts to Ship (Paths)
- `controls/opa/{llm.rego,abac.rego,privacy.residency.rego,egress.rego}` + tests
- `ai-ml-suite/{sanitizers,policies,filters,docs}/*`
- `alerting/sigma/{ai-*,identity-*,supplychain-*}.yml` + `alerting/tests/*`
- `tools/{evidence/attest,evidence/scheduler,attack-mapper,vex-gen}/*` + tests
- `analytics/dashboards/{attack-mapping.json,atlas.json,audit.json,coverage.json}`
- `analytics/heatmaps/{attack.json,atlas.json}`
- `RUNBOOKS/llm-{prompt-injection,poisoning,exfil}.md`
- `audit/vex/*.json`, `audit/attestations/*.json`

---

## F) Risks & Mitigations
- **LLM gate friction** → Shadow mode & canaries; exceptions with expiry/owner.
- **Session-binding false positives** → Grace re-auth; short TTL caches; clear user messaging.
- **Trusted publishing migration** → Helper scripts; staged rollout; monitor failure modes.
- **Mapping QA load** → CI automation; reviewer rotation and sampling.

---

## G) RACI
- **A:** Security Lead  
- **R:** AppSec, Detection Eng, IAM, Platform, AI Eng, Data Eng, GRC, CTI  
- **C:** Privacy, Legal, Comms, Product  
- **I:** Exec Sponsor, Support

---

## H) Metrics (Exit Criteria)
- LLM gates enforced; ATLAS ≥92%; jailbreak TTD ≤5m (synthetic)
- Session/token binding live; 0 classic tokens; WebAuthn enforced for publish/sign
- 100% releases with SBOM + VEX; verify-on-deploy enforced; quarantine MTTR <12h
- ATT&CK/ATLAS QA ≥96% pass; coverage ≥96% relevant techniques
- Attestations enriched; freshness 100% green; 3 PURPLE PARs

---

## I) Proof-Carrying Analysis (PCA)
**Assumptions:** SCHOLAR delivered initial LLM gates, session binding design, trusted publishing pilot, ATT&CK QA tooling draft, and VEX concept; we bring these to GA with proofs.  
**Evidence:** CI outputs, OPA tests, synthetic campaign logs, attestations (LLM/ATT&CK/VEX), SBOM+VEX artifacts, mapping QA results.  
**Verification:** CI blocks on missing LLM gates/tests, absent ATT&CK/ATLAS IDs, stale evidence, missing VEX alongside SBOM, or disabled session binding on privileged/publish paths.

---

**B‑E Aggressive — operationalize the literature, prove every release.**

