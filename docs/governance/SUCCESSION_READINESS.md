# Summit Succession Readiness & Institutional Memory

**Status:** SUCCESSION-READY WITH GAPS
**Last-Reviewed:** 2026-01-14
**Owner:** Governance (Jules)

This document serves as the **Institutional Memory Lock**. It is designed to ensure continuity of operations in the event of sudden leadership or maintainer changes. It captures the "how" and "why" of Summit's safety and governance mechanisms.

---

## Phase 1: Canonical Health Narrative

### How Summit Stays Safe to Change

Summit relies on a **Defense-in-Depth** strategy enforced by the **GA Risk Gate** (`SECURITY_GA_GATE.md`). We do not rely on human vigilance alone; we rely on machine-enforced policy.

1.  **The Gate is the Law:** Every Pull Request targeting `main` must pass the GA Risk Gate (`.github/workflows/ga-risk-gate.yml`). This workflow enforces:
    *   **Freeze Windows:** Checks `docs/policies/trust-policy.yaml`. If `ga_gate.freeze_mode` is "blocking", no changes merge.
    *   **Secrets & Vulnerabilities:** Scans for hardcoded secrets (Trivy) and dependency vulnerabilities (Grype).
    *   **Policy Compliance:** Evaluates Open Policy Agent (OPA) rules (`policy/ga-gate.rego`) against the PR.
    *   **Provenance:** Verifies that artifacts are signed and traceable (Cosign).

2.  **Signals That Matter:**
    *   **Governance Drift:** We monitor `GOVERNANCE_RULES.md` and evidence artifacts. If files change without the correct `CODEOWNERS` approval, the `governance-drift-check` fails.
    *   **Evidence Freshness:** We track the age of evidence (e.g., "last security scan"). Stale evidence (< 7 days) triggers alerts via `fresh-evidence-rate`.
    *   **CI Health:** A red CI pipeline is a stop-the-line event. We value "Clean Green" over feature velocity.

3.  **Keeping the Merge Flow Unblocked:**
    *   The **Freeze Window** is our primary throttle. In times of high risk (e.g., end of quarter), we set `trust-policy.yaml` to "blocking".
    *   If a legitimate change is blocked (e.g., false positive), we do **not** disable the gate. We update the policy (e.g., `.trivyignore`, `.grype.yaml`) or grant a **Governed Exception** in `policy/ga-gate.rego`.
    *   **Emergency Break-Glass:** In catastrophic failure, Admins can bypass checks, but this triggers a high-severity audit event.

4.  **Incident Detection:**
    *   Operational signals (error rates, latency) flow to Prometheus and Grafana.
    *   **Escalation:** Alerts page the **Orion** (Reliability) role. Security incidents page **Aegis** (Security).

---

## Phase 2: Role Succession Maps

### 1. Release Captain (Role: Jules)
*   **Core Responsibilities:**
    *   Enforce the Constitution and GA Risk Gate.
    *   Manage the Release Freeze Window (`trust-policy.yaml`).
    *   Cut and sign release artifacts (Tags, SBOMs).
    *   Approve "Governed Exceptions".
*   **Touchpoints:**
    *   **Weekly:** Review Weekly GA Ops Snapshot.
    *   **On-Demand:** Review PRs blocked by the Gate.
*   **Key Artifacts:** `docs/policies/trust-policy.yaml`, `SECURITY_GA_GATE.md`, `GOVERNANCE_RULES.md`.
*   **Signals to Watch:** Governance Drift alerts, Gate Failure Rate.
*   **If this breaks first:** Check `trust-policy.yaml` configuration and GitHub Actions permissions.

### 2. Governance Owner (Role: Lawmaker/Jules)
*   **Core Responsibilities:**
    *   Maintain the Living Rulebook (`RULEBOOK.md`, `CONSTITUTION.md`).
    *   Adjudicate conflicts between Agents (e.g., Speed vs. Safety).
    *   Audit compliance drift.
*   **Touchpoints:**
    *   **Quarterly:** Review Governance Policies.
*   **Key Artifacts:** `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`.
*   **Signals to Watch:** `governance-drift-check` workflow failures.
*   **If this breaks first:** Check `CODEOWNERS` file integrity.

### 3. CI / Reliability Owner (Role: Orion/DevOps Lead)
*   **Core Responsibilities:**
    *   Maintain CI pipeline health and performance (`.github/workflows/`).
    *   Define and monitor Service Level Objectives (SLOs).
    *   Manage Infrastructure-as-Code (Terraform).
*   **Touchpoints:**
    *   **Weekly:** Review CI latency and cost.
*   **Key Artifacts:** `.github/workflows/ga-risk-gate.yml`, `docs/operations/SLOs.md`.
*   **Signals to Watch:** Build duration, Flaky test rate, Production Error Budget burn.
*   **If this breaks first:** Check GitHub Actions status and Runner availability.

### 4. Security Intake Owner (Role: Aegis/Security Officer)
*   **Core Responsibilities:**
    *   Review Security Policy changes.
    *   Triage vulnerability reports (Trivy/Grype findings).
    *   Manage the `refusal-matrix`.
*   **Touchpoints:**
    *   **Daily:** Triage high-severity vulnerability alerts.
*   **Key Artifacts:** `SECURITY.md`, `policy/ga-gate.rego`, `.trivyignore`.
*   **Signals to Watch:** CVE count (Critical/High), Secret detection alerts.
*   **If this breaks first:** Check Scanner configurations and Vulnerability Database freshness.

### 5. Docs / Evidence Owner (Role: Hermes/Tech Writer)
*   **Core Responsibilities:**
    *   Ensure the "Law of Clarity" in documentation.
    *   Maintain the Evidence Index (`EVIDENCE_INDEX.md` or `EVIDENCE.md`).
    *   Verify links and terminology consistency.
*   **Touchpoints:**
    *   **Weekly:** Check `docs-integrity` job status.
*   **Key Artifacts:** `docs/governance/EVIDENCE.md`, `docs/governance/INDEX.md`.
*   **Signals to Watch:** Dead links, Outdated frontmatter (`Last-Reviewed`).
*   **If this breaks first:** Check `scripts/ci/verify_governance_docs.mjs` (or equivalent).

---

## Phase 3: Critical Artifacts Index

| Artifact Path | Purpose | Owner Role | Update Cadence | What Breaks if Missing/Wrong |
| :--- | :--- | :--- | :--- | :--- |
| `docs/governance/CONSTITUTION.md` | Supreme Law & Principles | Lawmaker | Annual | Governance legitimacy & dispute resolution. |
| `docs/governance/GOVERNANCE_RULES.md` | Release types, Approvals, Drift rules | Release Captain | Quarterly | CI checks for approvals & versioning. |
| `docs/policies/trust-policy.yaml` | Controls Freeze Windows & Gate Mode | Release Captain | On-Demand | Ability to freeze/unfreeze releases. |
| `SECURITY_GA_GATE.md` | Defines the Risk Gate logic | Aegis | Semi-Annual | Understanding of why PRs are blocked. |
| `policy/ga-gate.rego` | Machine-executable policy logic | Aegis | On-Demand | Automated PR enforcement (OPA checks). |
| `sbom-mc-v0.4.5.json` | GA Artifact: Software Bill of Materials | Release Captain | Per Release | Compliance audits & vulnerability tracking. |
| `pr-provenance.json` | GA Artifact: Build Provenance | Release Captain | Per Release | Supply chain integrity verification. |
| `.github/workflows/ga-risk-gate.yml` | The Enforcer Workflow | Orion | On-Change | The entire Gate mechanism. |

---

## Phase 4: Knowledge Decay Risk Assessment

| Risk Description | Knowledge at Risk | Impact of Failure | Mitigation | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **"Why" of OPA Thresholds** | The rationale behind specific policy denials in `ga-gate.rego`. | Valid changes blocked; blind loosening of security. | Comments in Rego files (partial). | **DOCUMENT**: Add rationale comments to all Rego rules. |
| **Drift Check Mechanics** | How `governance-drift-check` calculates diffs. | False positives in drift detection; inability to fix drift. | Script source code. | **TRAIN**: DevOps to audit script logic. |
| **Weekly Snapshot Ritual** | The manual steps to compile the Ops Snapshot. | Loss of operational visibility & continuity. | `weekly-ops-snapshot-template.md`. | **ACCEPT**: Template exists, but requires discipline. |
| **Emergency Break-Glass** | The exact admin override procedure. | Extended downtime during gate malfunction. | `SECURITY_GA_GATE.md`. | **TRAIN**: Run "Game Day" drills for admins. |

---

## Phase 5: Succession Readiness Verdict

**Verdict:** `SUCCESSION-READY WITH GAPS`

### Justification
Summit has a robust, machine-enforced governance layer (`ga-risk-gate`, `trust-policy`) that prevents regression and enforces the "Law of Consistency" without human intervention. Critical roles and artifacts are defined.

**Gaps Identified:**
1.  **Implicit Rationale:** Some policy thresholds in OPA are code-only without "Why" documentation.
2.  **Operational Rituals:** "Game Day" drills for emergency overrides are not formally scheduled/documented as completed.

### Owner for Closing Gaps
*   **Jules (Institutional Memory Custodian)**

### Next Review
*   **Trigger:** Next GA Release or Quarter End (2026-03-31).
