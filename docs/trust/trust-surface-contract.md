# Trust Surface Contract

**Status:** Draft
**Version:** 1.0
**Owner:** Trust Engineering

## Overview

This contract defines the externally consumable trust signals exposed by the Summit platform. These signals are intended to allow external parties (customers, auditors, partners) to independently verify the trustworthiness of the platform without requiring direct operational access.

## Guarantees

1.  **Read-Only:** All exposed artifacts are strictly read-only and static.
2.  **Sanitized:** No PII, secrets, or internal network details are included in the trust snapshot.
3.  **Evidence-Backed:** Every signal is derived from a verifiable cryptographic proof or a signed CI artifact.
4.  **Immutable:** Once published, a trust snapshot for a specific version/commit is immutable.

## Signal Specifications

### 1. Build Health & Determinism

- **Metric:** CI Pass Rate
  - **Definition:** Percentage of CI pipeline runs that succeed on the `main` branch over a rolling 30-day window.
  - **Source:** GitHub Actions workflow history.
  - **Guarantee:** > 95% pass rate for stable releases.
- **Metric:** Reproducible Build Status
  - **Definition:** Boolean indicating if the build artifacts can be independently reproduced from the source code.
  - **Source:** SLSA provenance attestations.

### 2. Policy Compliance

- **Metric:** Policy Compliance Rate
  - **Definition:** Percentage of OPA policy checks passed during the build and deploy process.
  - **Source:** OPA decision logs (sanitized).
  - **Guarantee:** 100% for all production deployments.
- **Metric:** Known Vulnerabilities (CVEs)
  - **Definition:** Count of critical/high severity vulnerabilities in the deployed artifacts.
  - **Source:** Trivy/Grype scan reports.
  - **Guarantee:** 0 Critical/High CVEs in production artifacts (with < 24h remediation SLA).

### 3. Evidence Completeness

- **Metric:** Evidence Coverage
  - **Definition:** Percentage of compliance controls (e.g., SOC2, GDPR) that have automated evidence collection enabled and functioning.
  - **Source:** Compliance ledger.
  - **Guarantee:** 100% coverage for "Critical" controls.

### 4. Operational Readiness

- **Metric:** Incident Frequency
  - **Definition:** Count of Sev1/Sev2 incidents in the last 90 days (sanitized).
  - **Source:** Incident management system (e.g., PagerDuty/Incident.io) - exported summary.
- **Metric:** MTTR (Mean Time To Recovery)
  - **Definition:** Average time to resolve Sev1/Sev2 incidents.
  - **Guarantee:** < 4 hours for Sev1.

## Artifact Format

The trust signals are aggregated into a JSON artifact: `trust-snapshot.json`.
The schema for this artifact is defined in `trust/trust-snapshot.schema.json`.

## Emission Frequency

- **Per Release:** A full trust snapshot is generated and signed for every major and minor release.
- **Daily:** A rolling snapshot of the `main` branch is generated daily at 00:00 UTC.

## Verification

To verify the trust snapshot:

1.  Download the `trust-snapshot.json` and its signature `trust-snapshot.json.sig`.
2.  Verify the signature using the Summit public release key.
3.  Validate the JSON against the schema.
