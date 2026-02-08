# CI/CD High-Signal Deltas (2026 Cycle) — Summit Action Register

**Mode:** Reasoning (analysis-focused judgments)

## Authority & Readiness Anchor

- **Summit Readiness Assertion:** `docs/SUMMIT_READINESS_ASSERTION.md`
- **Governance Authority:** `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`, `docs/governance/AGENT_MANDATES.md`
- **Golden Path Contract:** `docs/ga/TESTING-STRATEGY.md`, `docs/ga/LEGACY-MODE.md`

**Directive:** These deltas are treated as governed, production-grade requirements. Exceptions are labeled **Governed Exceptions** and carry rollback triggers and evidence closure requirements.

---

## 1) NIST SSDF v1.2 Draft — Continuous Improvement + CI/CD Evidence Tightening

**Present State:** **Intentionally constrained** pending SSDF v1.2 evidence bundle update; treated as a **Governed Exception** until evidence closure. No legacy defense; action is mandatory.

**Required Actions (Policy + Evidence + CI):**

- **Policy:** Add SSDF v1.2 (SP 800-218r1) to secure development policy with explicit PO.6 continuous improvement requirements and strengthened supply-chain expectations.
- **Evidence Schema:** Extend `release-evidence.json` to include SSDF practice IDs, SBOM link, provenance link, security test summary link, and `improvement_items` for PO.6.
- **CI/CD Gates:**
  - Generate CycloneDX/SPDX SBOM and store in immutable retention bucket.
  - Produce signed SLSA-style provenance with runner image and workflow digest.
  - Emit machine-readable attestation summary mapping checks to SSDF v1.2 practices.

**UEF Evidence Targets:**

- `release-evidence.json`
- `sbom.json`
- `provenance.json`
- `attestation-summary.json`

**Governed Exceptions:** Any service missing SSDF v1.2 mapping is recorded with a closure date and remediation owner.

---

## 2) OpenSSF OSPS Baseline — Three-Level Upstream Security Bar

**Present State:** **Intentionally constrained** pending OSPS posture mapping; treated as a **Governed Exception** until dependency metadata is enriched.

**Required Actions (Policy + Evidence + CI):**

- **Policy:** Require critical OSS dependencies to target OSPS **Level 2+** or record explicit risk acceptance in governance records.
- **Evidence Schema:** Extend dependency inventory with `osps_level`, `osps_last_verified`, `osps_reference_url`.
- **CI/CD Gates:**
  - Scheduled supply-chain job fails if critical dependencies fall below minimum OSPS level.
  - Drift detection job validates MFA/branch protection and security contact requirements for Summit repo.

**UEF Evidence Targets:**

- `dependency-inventory.json`
- `osps-check-report.json`
- `repo-drift-report.json`

**Governed Exceptions:** OSS packages below OSPS L2 require a signed risk acceptance and remediation plan.

---

## 3) SLSA v1.1 — Provenance Expectations for CI/CD

**Present State:** **Intentionally constrained** pending SLSA v1.1 alignment audit; treated as a **Governed Exception** until provenance verification is enforced.

**Required Actions (Policy + Evidence + CI):**

- **Policy:** Require SLSA L2-equivalent provenance for all production artifacts; define SLSA L3 target for high-sensitivity services with a fixed time-box.
- **Evidence Schema:** Standardize on in-toto/SLSA `provenance.json` with builder ID, buildType, invocation, materials, and subject digests. Track `slsa_level_claimed` and `slsa_level_verified` in governance graph.
- **CI/CD Gates:**
  - OIDC-based short-lived credentials; record runner image and workflow digest in provenance.
  - Fail release if provenance signing or upload fails.
  - Scheduled verification workflow re-checks signatures and logs results.

**UEF Evidence Targets:**

- `provenance.json`
- `provenance-verification.json`
- `release-record.json`

**Governed Exceptions:** Any build lacking signed provenance is blocked from production release.

---

## 4) ISO/IEC 27001:2022 — DevSecOps-Centric Control Mapping

**Present State:** **Intentionally constrained** pending ISO 27001:2022 control mapping refresh; treated as a **Governed Exception** until audit-view exports are live.

**Required Actions (Policy + Evidence + CI):**

- **Policy:** Update ISO control mapping to reference CI/CD workflow controls (SAST, dependency scanning, IaC scanning, policy-as-code).
- **Evidence Schema:** Tag pipeline checks with `iso_control_ids` and `nist_ssdf_ids`; add an audit-view export that aggregates evidence by control and timeframe.
- **CI/CD Gates:**
  - Required checks: SAST, dependency scan, IaC scan on all PRs to `main`.
  - Policy-as-code job blocks non-compliant configs at deploy.
  - Control drift workflow validates repo settings, IAM roles, and pipeline definitions.

**UEF Evidence Targets:**

- `audit-view.json`
- `policy-decision.json`
- `control-drift-report.json`

**Governed Exceptions:** Control mappings missing pipeline evidence are escalated and blocked from release.

---

## 5) NIST Supply-Chain DevSecOps Guidance — CI/CD Audits as First-Class Controls

**Present State:** **Intentionally constrained** pending CI/CD audit standard adoption; treated as a **Governed Exception** until audit records are produced quarterly.

**Required Actions (Policy + Evidence + CI):**

- **Policy:** Define CI/CD audit standard with quarterly reviews of workflows, credentials, and logs; enforce isolated CI environments and short-lived credentials.
- **Evidence Schema:** Add `cicd_audit` record type with scope, findings, controls affected, and remediation status.
- **CI/CD Gates:**
  - Scheduled pipeline auditor scans workflows for unpinned actions, hard-coded secrets, and broad permissions.
  - Required security jobs presence check for SBOM/SAST/DAST/dependency/provenance.
  - Real-time alerts on permission escalations or skipped checks; log responses as audit evidence.

**UEF Evidence Targets:**

- `cicd-audit.json`
- `pipeline-auditor.json`
- `alert-response-log.json`

**Governed Exceptions:** Any audit finding without remediation timeline is a release blocker.

---

## MAESTRO Security Alignment

**MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security

**Threats Considered:**

- Supply-chain tampering between source and artifact
- CI/CD credential abuse and permission escalation
- Drift in repo or pipeline protection controls
- Evidence gaps leading to audit failure
- Prompt/tool misuse in automated release paths

**Mitigations:**

- Signed provenance and immutable evidence bundles
- OIDC short-lived credentials with least privilege
- Drift detection and scheduled pipeline audits
- Policy-as-code enforcement with blocking gates
- Evidence-first exports aligned to SSDF/ISO control IDs

---

## Forward-Leaning Enhancement

**Action:** Establish a **Continuous Evidence Graph** that auto-ingests SBOMs, provenance, policy decisions, and audit logs into a single queryable evidence lake with deterministic hashes per release. This enables instant, multi-framework attestations and reduces audit response time to minutes.

**Closure Directive:** This register is definitive and enforceable. All missing evidence is a governed exception with a closure date and owner.
