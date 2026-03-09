# Regulatory CI/Automation Proposal

## 1. AI Risk Classification Gate
*   **Purpose:** Enforce EU AI Act "High-Risk" obligations by blocking undocumented changes to risk-critical components.
*   **Trigger:** Pull Request modifying paths: `server/src/narrative-engine/`, `server/src/decision-engine/`.
*   **Input:** PR File Changes + `docs/governance/risk_registry.yaml` (proposed).
*   **Check Logic:**
    *   IF `risk_critical_path` is modified AND NO `RISK_ASSESSMENT` update in PR:
    *   THEN `Fail`.
*   **Output:** `compliance/risk-gate-report.json`.
*   **Failure Criteria:** Modification of high-risk logic without accompanying risk assessment update.

## 2. FedRAMP Evidence Freshness & Format Gate
*   **Purpose:** Ensure all compliance evidence is generated in OSCAL-ready JSON and is recent (supporting "Continuous Monitoring").
*   **Trigger:** Release Branch Merge / Nightly.
*   **Input:** `artifacts/evidence/` directory.
*   **Check Logic:**
    *   For each required artifact in `CONTROL_EVIDENCE_INDEX.md`:
        *   Check file existence.
        *   Check timestamp < 24 hours.
        *   Check JSON schema validation (OSCAL stub).
*   **Output:** `compliance/evidence-freshness-report.json`.
*   **Failure Criteria:** Any missing artifact or artifact older than 24h.

## 3. Cross-Border Data Flow Monitor
*   **Purpose:** Prevent accidental data residency violations (GDPR/Schrems II) via configuration drift.
*   **Trigger:** Pull Request.
*   **Input:** Terraform plans, `litellm` config, `config/regions.yaml`.
*   **Check Logic:**
    *   Scan for new region identifiers (e.g., `us-east-1`, `eu-west-1`).
    *   Compare against `allowed_regions_list`.
    *   If new region is "Non-Adequate" (e.g., US for EU data) AND `TIA_EXEMPTION` is missing:
    *   THEN `Fail`.
*   **Output:** `compliance/residency-check.log`.
*   **Failure Criteria:** Introduction of a data processing region without a corresponding Transfer Impact Assessment (TIA) marker.

## 4. CUI Crypto-Validation Check
*   **Purpose:** Verify FIPS 140-3 compliance for defense builds.
*   **Trigger:** Container Build.
*   **Input:** Container image.
*   **Check Logic:**
    *   Run `openssl fipsinstall -verify` (or equivalent) inside the container.
    *   Grep for "FIPS mode enabled".
*   **Failure Criteria:** FIPS module verification failure.
